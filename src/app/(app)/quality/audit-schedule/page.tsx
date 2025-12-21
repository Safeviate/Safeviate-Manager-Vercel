
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AuditScheduleItem, AuditScheduleStatus } from '@/types/quality';

const INITIAL_AUDIT_AREAS = [
  'Personnel & Training',
  'Flight Operations',
  'Ground Operations',
  'Maintenance',
  'Cabin Safety',
  'Facilities & Equipment',
  'Emergency Response',
  'Security',
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
type Quarter = typeof QUARTERS[number];

const STATUSES: AuditScheduleStatus[] = [
  'Scheduled',
  'Completed',
  'Pending',
  'Not Scheduled',
];

const getStatusBadgeVariant = (
  status: AuditScheduleStatus
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'Completed':
      return 'default'; // Green in default theme
    case 'Scheduled':
      return 'secondary';
    case 'Pending':
      return 'destructive'; // Using destructive for yellow/warning
    default:
      return 'outline';
  }
};

const getStatusBadgeClass = (status: AuditScheduleStatus): string => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500 text-white';
      case 'Scheduled':
        return 'bg-blue-500 text-white';
      case 'Pending':
        return 'bg-yellow-500 text-black';
      default:
        return '';
    }
}

interface StatusSelectorProps {
  onSelect: (status: AuditScheduleStatus) => void;
}

function StatusSelector({ onSelect }: StatusSelectorProps) {
  return (
    <div className="flex flex-col gap-1 p-1">
      {STATUSES.map((status) => (
        <Button
          key={status}
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => onSelect(status)}
        >
           <div className={cn('w-2 h-2 rounded-full mr-2', getStatusBadgeClass(status))}></div>
          {status}
        </Button>
      ))}
    </div>
  );
}

interface AreaActionsProps {
    area: string;
    onEdit: (oldName: string, newName: string) => void;
    onDelete: (areaName: string) => void;
}

function AreaActions({ area, onEdit, onDelete }: AreaActionsProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [newName, setNewName] = useState(area);

    useEffect(() => {
        if (isEditOpen) {
            setNewName(area);
        }
    }, [isEditOpen, area]);

    const handleSave = () => {
        if (newName.trim() && newName.trim() !== area) {
            onEdit(area, newName.trim());
        }
        setIsEditOpen(false);
    }
    
    return (
        <>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDelete(area)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Audit Area</DialogTitle>
                        <DialogDescription>Rename the audit area. This will update all related schedule items.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="area-name">Area Name</Label>
                        <Input id="area-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function AuditSchedulePage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const currentYear = new Date().getFullYear();

  const [auditAreas, setAuditAreas] = useState<string[]>(INITIAL_AUDIT_AREAS);
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);


  const scheduleQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, `tenants/${tenantId}/audit-schedule-items`), where('year', '==', currentYear))
        : null,
    [firestore, tenantId, currentYear]
  );
  
  const { data: schedule, isLoading, error } = useCollection<AuditScheduleItem>(scheduleQuery);

  const handleStatusChange = (area: string, quarter: Quarter, status: AuditScheduleStatus) => {
    if (!firestore) return;
    setOpenPopoverId(null);
    const itemsCollection = collection(firestore, `tenants/${tenantId}/audit-schedule-items`);
    const existingItem = schedule?.find(item => item.area === area && item.quarter === quarter);

    const newItemData = {
        area,
        quarter,
        year: currentYear,
        status,
    };
    if (existingItem) {
      const itemRef = doc(itemsCollection, existingItem.id);
      updateDocumentNonBlocking(itemRef, { status });
    } else {
      addDocumentNonBlocking(itemsCollection, newItemData);
    }
  };

  const handleAddArea = () => {
    if (newAreaName.trim() && !auditAreas.includes(newAreaName.trim())) {
        setAuditAreas(prev => [...prev, newAreaName.trim()]);
    }
    setNewAreaName('');
    setIsAddAreaOpen(false);
  }

  const handleEditArea = async (oldName: string, newName: string) => {
    setAuditAreas(prev => prev.map(area => area === oldName ? newName : area));
    
    if (!firestore || !schedule) return;
    const itemsToUpdate = schedule.filter(item => item.area === oldName);
    if (itemsToUpdate.length === 0) return;

    const batch = writeBatch(firestore);
    itemsToUpdate.forEach(item => {
        const itemRef = doc(firestore, `tenants/${tenantId}/audit-schedule-items`, item.id);
        batch.update(itemRef, { area: newName });
    });
    await batch.commit();
  }

  const handleDeleteArea = async (areaToDelete: string) => {
    setAuditAreas(prev => prev.filter(area => area !== areaToDelete));

    if (!firestore || !schedule) return;
    const itemsToDelete = schedule.filter(item => item.area === areaToDelete);
    if (itemsToDelete.length === 0) return;

    const batch = writeBatch(firestore);
    itemsToDelete.forEach(item => {
        const itemRef = doc(firestore, `tenants/${tenantId}/audit-schedule-items`, item.id);
        batch.delete(itemRef);
    });
    await batch.commit();
  }


  const getScheduleItem = (area: string, quarter: Quarter): AuditScheduleItem => {
    const found = schedule?.find(item => item.area === area && item.quarter === quarter);
    if (found) return found;
    return { 
        id: `${area}-${quarter}`, 
        area, 
        quarter, 
        year: currentYear, 
        status: 'Not Scheduled' 
    };
  };

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-64 w-full" />
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading schedule: {error.message}</p>;
  }


  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Annual Audit Schedule - {currentYear}</CardTitle>
        <CardDescription>
          Status of internal and external audits for the year. Click a cell to
          update its status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Audit Area</TableHead>
              {QUARTERS.map((q) => (
                <TableHead key={q} className="text-center">{q}</TableHead>
              ))}
               <TableHead className="text-right w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditAreas.map((area) => (
              <TableRow key={area}>
                <TableCell className="font-medium">{area}</TableCell>
                {QUARTERS.map((quarter) => {
                  const item = getScheduleItem(area, quarter);
                  const popoverId = `${area}-${quarter}`;
                  return (
                    <TableCell key={quarter} className="text-center">
                      <Popover open={openPopoverId === popoverId} onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? popoverId : null)}>
                        <PopoverTrigger asChild>
                          <Badge
                            variant={getStatusBadgeVariant(item.status)}
                            className={cn("cursor-pointer", getStatusBadgeClass(item.status))}
                          >
                            {item.status}
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0">
                          <StatusSelector
                            onSelect={(status) =>
                              handleStatusChange(area, quarter, status)
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  );
                })}
                <TableCell className='text-right'>
                    <AreaActions area={area} onEdit={handleEditArea} onDelete={handleDeleteArea} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex justify-start">
            <Button variant="outline" onClick={() => setIsAddAreaOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Area
            </Button>
        </div>
      </CardContent>
    </Card>

    <Dialog open={isAddAreaOpen} onOpenChange={setIsAddAreaOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Audit Area</DialogTitle>
                <DialogDescription>Enter the name for the new audit area row.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="new-area-name">Area Name</Label>
                <Input id="new-area-name" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleAddArea}>Add</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
