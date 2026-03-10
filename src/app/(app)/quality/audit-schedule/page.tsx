
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

const getStatusBadgeClass = (status: AuditScheduleStatus): string => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-transparent dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-transparent dark:bg-blue-900/30 dark:text-blue-400';
      case 'Pending':
        return 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-transparent dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-muted text-muted-foreground border-transparent opacity-40';
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
           <div className={cn('w-2 h-2 rounded-full mr-2', status === 'Completed' ? 'bg-green-500' : status === 'Scheduled' ? 'bg-blue-500' : status === 'Pending' ? 'bg-yellow-500' : 'bg-gray-300')}></div>
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
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10 shrink-0">
                        <Settings2 className="h-3 w-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(true)} className="w-full justify-start text-xs">
                        <Pencil className="mr-2 h-3 w-3" /> Edit Name
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)} className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 text-xs">
                        <Trash2 className="mr-2 h-3 w-3" /> Delete Area
                    </Button>
                </PopoverContent>
            </Popover>
            
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Audit Area</DialogTitle>
                        <DialogDescription>Rename the audit area.</DialogDescription>
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
                            This will permanently delete the "{area}" audit area.
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
  
  const { data: schedule, isLoading } = useCollection<AuditScheduleItem>(scheduleQuery);

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

  const extraLanes = ['', ''];

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
        <div className="flex justify-between items-center px-1 shrink-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Annual Audit Schedule</h1>
                <p className="text-xs text-muted-foreground">
                    Planning and tracking oversight activities for {currentYear}.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setIsAddAreaOpen(true)}>
                    <PlusCircle className="mr-2 h-3 w-3" />
                    Add Area
                </Button>
            </div>
        </div>

        <Card className="flex-1 min-h-0 overflow-hidden flex flex-col shadow-none border">
            <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="w-full h-full overflow-auto bg-card custom-scrollbar">
                    <div className="flex min-w-full w-fit h-full relative">
                        
                        {/* Sticky Month Column */}
                        <div className="w-20 flex-shrink-0 border-r sticky left-0 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.05)] bg-swimlane-header grid grid-rows-[40px_repeat(12,1fr)]">
                            <div className="bg-swimlane-header border-b border-white/10 flex items-center justify-center font-bold text-xs text-white uppercase tracking-wider h-10">
                                MONTH
                            </div>
                            {MONTHS.map((month, idx) => {
                                const isCurrentMonth = idx === currentMonthIdx;
                                return (
                                    <div 
                                        key={month} 
                                        className={cn(
                                            "flex flex-col items-center justify-center border-b text-[10px] font-mono font-bold uppercase tracking-wider",
                                            isCurrentMonth ? "bg-[#fefce8] text-[#854d0e]" : "text-white/80"
                                        )}
                                    >
                                        <span>{month}</span>
                                        {isCurrentMonth && (
                                            <Badge variant="outline" className="mt-0.5 text-[7px] py-0 border-[#854d0e] text-[#854d0e] font-bold h-2.5">
                                                ACT
                                            </Badge>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex flex-1 relative h-full">
                            {auditAreas.map((area) => (
                                <div key={area} className="flex-1 min-w-[160px] border-r relative flex flex-col h-full grid grid-rows-[40px_repeat(12,1fr)]">
                                    <div className="sticky top-0 z-30 bg-swimlane-header text-white border-b border-white/10 flex items-center justify-between gap-1 px-3 text-center shrink-0 h-10">
                                        <span className="text-[9px] font-bold uppercase tracking-wider truncate">{area}</span>
                                        <AreaActions area={area} onEdit={handleEditArea} onDelete={handleDeleteArea} />
                                    </div>
                                    {MONTHS.map((month, idx) => {
                                        const status = getScheduleItem(area, month);
                                        const popoverId = `${area}-${month}`;
                                        const isCurrentMonth = idx === currentMonthIdx;

                                        return (
                                            <div 
                                                key={month} 
                                                className={cn(
                                                    "border-b relative flex items-center justify-center p-1 group transition-colors",
                                                    isCurrentMonth ? "bg-[#fefce8]/20" : "hover:bg-muted/10"
                                                )}
                                            >
                                                <Popover 
                                                    open={openPopoverId === popoverId} 
                                                    onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? popoverId : null)}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <div className="w-full h-full cursor-pointer flex items-center justify-center">
                                                            <Badge
                                                                className={cn(
                                                                    "py-0.5 px-1 w-full justify-center text-[7px] uppercase font-bold shadow-sm transition-transform group-hover:scale-[1.02] border leading-tight h-6 text-center",
                                                                    getStatusBadgeClass(status)
                                                                )}
                                                            >
                                                                {status === 'Not Scheduled' ? '' : status}
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

                            {extraLanes.map((_, laneIdx) => (
                                <div key={`extra-${laneIdx}`} className="flex-1 min-w-[160px] border-r bg-muted/5 opacity-50 h-full grid grid-rows-[40px_repeat(12,1fr)]">
                                    <div className="sticky top-0 z-30 bg-swimlane-header border-b border-white/10 h-10" />
                                    {MONTHS.map((month) => (
                                        <div key={month} className="border-b" />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Dialog open={isAddAreaOpen} onOpenChange={setIsAddAreaOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Audit Area</DialogTitle>
                    <DialogDescription>Create a new oversight lane in the annual schedule.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="new-area-name">Area Name</Label>
                    <Input id="new-area-name" placeholder="e.g., Maintenance" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} />
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
