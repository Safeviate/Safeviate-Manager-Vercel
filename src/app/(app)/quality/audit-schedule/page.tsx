
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

const STATUSES: AuditScheduleStatus[] = [
  'Scheduled',
  'Completed',
  'Pending',
  'Not Scheduled',
];

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
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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

    const handleDeleteConfirm = () => {
        onDelete(area);
        setIsDeleteOpen(false);
    }
    
    return (
        <>
            <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsEditOpen(true)} className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsDeleteOpen(true)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                </Button>
            </div>
            
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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

             <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the &quot;{area}&quot; audit area and all its scheduled items.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function AuditSchedulePage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const currentYear = new Date().getFullYear();

  const [quarters, setQuarters] = useState(['Q1', 'Q2', 'Q3', 'Q4']);
  const [months, setMonths] = useState([
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]);
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

  const handleQuarterChange = (index: number, value: string) => {
    const newQuarters = [...quarters];
    newQuarters[index] = value;
    setQuarters(newQuarters);
  };

  const handleMonthChange = (index: number, value: string) => {
    const newMonths = [...months];
    newMonths[index] = value;
    setMonths(newMonths);
  };

  const handleStatusChange = (area: string, month: string, status: AuditScheduleStatus) => {
    if (!firestore) return;
    setOpenPopoverId(null);
    const itemsCollection = collection(firestore, `tenants/${tenantId}/audit-schedule-items`);
    const existingItem = schedule?.find(item => item.area === area && item.month === month);

    const newItemData = {
        area,
        month,
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


  const getScheduleItem = (area: string, month: string): AuditScheduleItem => {
    const found = schedule?.find(item => item.area === area && item.month === month);
    if (found) return found;
    return { 
        id: `${area}-${month}`, 
        area, 
        month, 
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
              <TableHead rowSpan={2} className="w-[250px] align-middle sticky left-0 bg-card z-10">Audit Area</TableHead>
              {quarters.map((q, index) => (
                <TableHead key={index} colSpan={3} className="text-center p-1 border-l">
                    <Input
                        value={q}
                        onChange={(e) => handleQuarterChange(index, e.target.value)}
                        className="text-center font-semibold bg-transparent border-none"
                    />
                </TableHead>
              ))}
              <TableHead rowSpan={2} className="text-right w-[50px] align-middle sticky right-0 bg-card z-10"></TableHead>
            </TableRow>
            <TableRow>
              {months.map((m, index) => (
                  <TableHead key={index} className="text-center p-1 border-l">
                      <Input
                          value={m}
                          onChange={(e) => handleMonthChange(index, e.target.value)}
                          className="text-center font-semibold bg-transparent border-none w-20"
                      />
                  </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditAreas.map((area) => (
              <TableRow key={area}>
                <TableCell className="font-medium sticky left-0 bg-card z-10">{area}</TableCell>
                {months.map((month, index) => {
                  const item = getScheduleItem(area, month);
                  const popoverId = `${area}-${month}`;
                  return (
                    <TableCell key={`${area}-${month}-${index}`} className="text-center border-l">
                      <Popover open={openPopoverId === popoverId} onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? popoverId : null)}>
                        <PopoverTrigger asChild>
                          <Badge
                            className={cn("cursor-pointer", getStatusBadgeClass(item.status))}
                          >
                            {item.status}
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0">
                          <StatusSelector
                            onSelect={(status) =>
                              handleStatusChange(area, month, status)
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  );
                })}
                <TableCell className='text-right sticky right-0 bg-card z-10'>
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

    