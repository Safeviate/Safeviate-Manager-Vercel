'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Settings2,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
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

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_HEIGHT_PX = 100;
const LANE_MIN_WIDTH = 200;

const getStatusBadgeClass = (status: AuditScheduleStatus): string => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'Scheduled':
        return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'Pending':
        return 'bg-yellow-500 text-black hover:bg-yellow-600';
      default:
        return 'bg-muted text-muted-foreground border-transparent';
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
          className="justify-start h-9"
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
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 shrink-0">
                        <Settings2 className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(true)} className="w-full justify-start">
                        <Pencil className="mr-2 h-4 w-4" /> Edit Name
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)} className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Area
                    </Button>
                </PopoverContent>
            </Popover>
            
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
                        <Button onClick={handleSave}>Save Changes</Button>
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
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
  const currentMonthIdx = new Date().getMonth();

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

  const handleStatusChange = (area: string, month: string, status: AuditScheduleStatus) => {
    if (!firestore) return;
    setOpenPopoverId(null);
    const itemsCollection = collection(firestore, `tenants/${tenantId}/audit-schedule-items`);
    const existingItem = schedule?.find(item => item.area === area && item.month === month);

    if (existingItem) {
      const itemRef = doc(itemsCollection, existingItem.id);
      updateDocumentNonBlocking(itemRef, { status });
    } else {
      addDocumentNonBlocking(itemsCollection, {
        area,
        month,
        year: currentYear,
        status,
      });
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

  const getScheduleItem = (area: string, month: string): AuditScheduleStatus => {
    const found = schedule?.find(item => item.area === area && item.month === month);
    return found ? found.status : 'Not Scheduled';
  };

  const extraLanes = ['', '', ''];

  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-48" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[600px] w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading schedule: {error.message}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Annual Audit Schedule</h1>
                <p className="text-muted-foreground">
                    Planning and tracking oversight activities for the {currentYear} calendar year.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={() => setIsAddAreaOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Audit Area
                </Button>
            </div>
        </div>

        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="w-full overflow-x-auto bg-card">
                    <div className="flex flex-col min-w-full w-fit">
                        {/* Swimlane Headers */}
                        <div className="sticky top-0 z-30 flex bg-primary text-primary-foreground border-b w-full">
                            <div className="w-24 bg-primary border-r border-primary-foreground/20 flex-shrink-0 sticky left-0 z-40 flex items-center justify-center font-bold text-xs">
                                MONTH
                            </div>
                            
                            <div className="flex flex-1">
                                {auditAreas.map((area) => (
                                    <div key={area} className="flex-1 p-3 font-semibold text-center border-r border-primary-foreground/20 min-w-[200px] flex items-center justify-between gap-2 px-4 bg-primary">
                                        <span className="truncate text-xs uppercase tracking-wide">{area}</span>
                                        <AreaActions area={area} onEdit={handleEditArea} onDelete={handleDeleteArea} />
                                    </div>
                                ))}
                                {extraLanes.map((_, index) => (
                                    <div key={`extra-${index}`} className="flex-1 p-3 min-w-[200px] border-r border-primary-foreground/20 bg-primary opacity-50" />
                                ))}
                            </div>
                        </div>

                        {/* Swimlane Grid Body */}
                        <div className="flex w-full relative">
                            {/* Vertical Month Sidebar */}
                            <div className="w-24 flex-shrink-0 bg-muted/50 border-r sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                {MONTHS.map((month, idx) => (
                                    <div 
                                        key={month} 
                                        className={cn(
                                            "flex flex-col items-center justify-center border-b text-xs font-bold uppercase tracking-wider bg-muted/30",
                                            idx === currentMonthIdx && "bg-primary/10 text-primary"
                                        )}
                                        style={{ height: `${MONTH_HEIGHT_PX}px` }}
                                    >
                                        <span>{month}</span>
                                        {idx === currentMonthIdx && <Badge variant="outline" className="mt-1 text-[9px] py-0 border-primary text-primary">Current</Badge>}
                                    </div>
                                ))}
                            </div>

                            {/* Audit Area Lanes */}
                            <div className="flex flex-1">
                                {auditAreas.map((area) => (
                                    <div key={area} className="flex-1 min-w-[200px] border-r relative flex flex-col">
                                        {MONTHS.map((month, idx) => {
                                            const status = getScheduleItem(area, month);
                                            const popoverId = `${area}-${month}`;
                                            const isCurrentMonth = idx === currentMonthIdx;

                                            return (
                                                <div 
                                                    key={month} 
                                                    className={cn(
                                                        "border-b relative flex items-center justify-center p-2 group transition-colors",
                                                        isCurrentMonth ? "bg-primary/5" : "hover:bg-muted/10"
                                                    )}
                                                    style={{ height: `${MONTH_HEIGHT_PX}px` }}
                                                >
                                                    <Popover 
                                                        open={openPopoverId === popoverId} 
                                                        onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? popoverId : null)}
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <div className="w-full h-full cursor-pointer flex items-center justify-center">
                                                                <Badge
                                                                    className={cn(
                                                                        "py-2 px-4 w-full justify-center text-[10px] uppercase font-bold shadow-sm transition-transform group-hover:scale-[1.02] border",
                                                                        getStatusBadgeClass(status)
                                                                    )}
                                                                >
                                                                    {status}
                                                                </Badge>
                                                            </div>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-48 p-0" align="center">
                                                            <StatusSelector
                                                                onSelect={(newStatus) => handleStatusChange(area, month, newStatus)}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* Extra Lanes for UI Consistency */}
                                {extraLanes.map((_, laneIdx) => (
                                    <div key={`extra-lane-${laneIdx}`} className="flex-1 min-w-[200px] border-r bg-muted/5 opacity-50">
                                        {MONTHS.map((month) => (
                                            <div 
                                                key={month} 
                                                className="border-b"
                                                style={{ height: `${MONTH_HEIGHT_PX}px` }}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Add Area Dialog */}
        <Dialog open={isAddAreaOpen} onOpenChange={setIsAddAreaOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Audit Area</DialogTitle>
                    <DialogDescription>Create a new oversight lane in the annual schedule.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="new-area-name">Area Name</Label>
                    <Input id="new-area-name" placeholder="e.g., Quality Management" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAddArea} disabled={!newAreaName.trim()}>Add Area</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
