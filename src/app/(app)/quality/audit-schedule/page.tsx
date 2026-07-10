'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { MainPageHeader, HEADER_ACTION_BUTTON_CLASS, HEADER_MOBILE_ACTION_BUTTON_CLASS, HEADER_COMPACT_CONTROL_CLASS } from "@/components/page-header";
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
  ChevronDown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import type { AuditScheduleItem, AuditScheduleStatus } from '@/types/quality';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';

const INITIAL_AUDIT_AREAS: string[] = [];

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
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (oldName: string, newName: string) => void;
    onDelete: (areaName: string) => void;
}

function AreaActions({ area, canEdit, canDelete, onEdit, onDelete }: AreaActionsProps) {
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
            <div className="flex items-center gap-1">
                {canEdit ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditOpen(true)}
                        className={cn(
                            HEADER_COMPACT_CONTROL_CLASS,
                            "h-6 border-white/20 bg-white/10 px-2 text-[8px] font-black text-white hover:bg-white/20"
                        )}
                    >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                    </Button>
                ) : null}
                {canDelete ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDeleteOpen(true)}
                        className={cn(
                            HEADER_COMPACT_CONTROL_CLASS,
                            "h-6 border-white/20 bg-transparent px-2 text-[8px] font-black text-white hover:bg-white/10"
                        )}
                    >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                    </Button>
                ) : null}
            </div>
            
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
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/quality/audit-schedule' });
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const canCreateAuditSchedule = hasPermission('quality-audit-schedule-create');
  const canEditAuditSchedule = hasPermission('quality-audit-schedule-edit');
  const canDeleteAuditSchedule = hasPermission('quality-audit-schedule-delete');

  const [auditAreas, setAuditAreas] = useState<string[]>(INITIAL_AUDIT_AREAS);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/audit-schedule', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ areas: [], items: [] }));
        if (Array.isArray(payload.areas)) setAuditAreas(payload.areas);
        if (Array.isArray(payload.items)) setSchedule((payload.items as AuditScheduleItem[]).filter(i => i.year === currentYear));
    } catch (e) {
        console.error("Failed to load audit schedule", e);
    } finally {
        setIsLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    void loadData();
    window.addEventListener('safeviate-audit-schedule-updated', loadData);
    return () => window.removeEventListener('safeviate-audit-schedule-updated', loadData);
  }, [loadData]);

  if (!isAccessLoading && !isAllowed) {
    return <TenantLayoutDisabledState />;
  }

  const handleStatusChange = async (area: string, month: string, status: AuditScheduleStatus) => {
    if (!canEditAuditSchedule && !canCreateAuditSchedule) return;
    setOpenPopoverId(null);
    try {
        const response = await fetch('/api/audit-schedule', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ items: [] }));
        const items = Array.isArray(payload.items) ? (payload.items as AuditScheduleItem[]) : [];
        const existingIdx = items.findIndex(item => item.area === area && item.month === month && item.year === currentYear);

        let nextItems: AuditScheduleItem[];
        if (existingIdx > -1) {
            nextItems = [...items];
            nextItems[existingIdx] = { ...nextItems[existingIdx], status };
        } else {
            nextItems = [...items, {
                id: crypto.randomUUID(),
                area,
                month,
                year: currentYear,
                status,
            }];
        }

        await fetch('/api/audit-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areas: auditAreas, items: nextItems }),
        });
        window.dispatchEvent(new Event('safeviate-audit-schedule-updated'));
    } catch (e) {
        console.error("Failed to update status", e);
    }
  };

  const handleAddArea = async () => {
    if (!canCreateAuditSchedule) return;
    const trimmed = newAreaName.trim();
    if (trimmed && !auditAreas.includes(trimmed)) {
        const nextAreas = [...auditAreas, trimmed];
        setAuditAreas(nextAreas);
        const response = await fetch('/api/audit-schedule', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ items: [] }));
        await fetch('/api/audit-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areas: nextAreas, items: payload.items || [] }),
        });
    }
    setNewAreaName('');
    setIsAddAreaOpen(false);
  }

  const handleEditArea = async (oldName: string, newName: string) => {
    if (!canEditAuditSchedule) return;
    const nextAreas = auditAreas.map(area => area === oldName ? newName : area);
    setAuditAreas(nextAreas);
    try {
        const response = await fetch('/api/audit-schedule', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ items: [] }));
        const items = Array.isArray(payload.items) ? (payload.items as AuditScheduleItem[]) : [];
        const nextItems = items.map(item => item.area === oldName ? { ...item, area: newName } : item);
        await fetch('/api/audit-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areas: nextAreas, items: nextItems }),
        });
        window.dispatchEvent(new Event('safeviate-audit-schedule-updated'));
    } catch (e) {
        console.error("Failed to rename area items", e);
    }
  }

  const handleDeleteArea = async (areaToDelete: string) => {
    if (!canDeleteAuditSchedule) return;
    const nextAreas = auditAreas.filter(area => area !== areaToDelete);
    setAuditAreas(nextAreas);
    try {
        const response = await fetch('/api/audit-schedule', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ items: [] }));
        const items = Array.isArray(payload.items) ? (payload.items as AuditScheduleItem[]) : [];
        const nextItems = items.filter(item => item.area !== areaToDelete);
        await fetch('/api/audit-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areas: nextAreas, items: nextItems }),
        });
        window.dispatchEvent(new Event('safeviate-audit-schedule-updated'));
    } catch (e) {
        console.error("Failed to delete area items", e);
    }
  }

  const getScheduleItem = (area: string, month: string): AuditScheduleStatus => {
    const found = schedule.find(item => item.area === area && item.month === month);
    return found ? found.status : 'Not Scheduled';
  };

  const extraLanes = ['', ''];
  const scheduleRowHeights = 'grid-rows-[56px_repeat(12,44px)]';

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden px-1">
        <Card className={cn(
            "w-full overflow-hidden border shadow-none",
            isMobile ? "flex min-h-0 flex-1 flex-col" : "flex min-h-0 flex-1 flex-col"
        )}>
            <MainPageHeader 
                title="Annual Audit Schedule"
                actions={
                    canCreateAuditSchedule ? (
                      <Button
                          variant={isMobile ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => setIsAddAreaOpen(true)}
                          className={isMobile ? HEADER_MOBILE_ACTION_BUTTON_CLASS : HEADER_ACTION_BUTTON_CLASS}
                      >
                          <span className="flex items-center gap-2">
                              <PlusCircle className="h-4 w-4" />
                              Add Area
                          </span>
                          {isMobile ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                      </Button>
                    ) : undefined
                }
            />
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className={cn(
                    "overscroll-contain bg-card custom-scrollbar",
                    isMobile
                        ? "min-h-0 flex-1 overflow-x-auto overflow-y-auto touch-pan-x touch-pan-y"
                        : "min-h-0 flex-1 overflow-x-scroll overflow-y-scroll"
                )}>
                    <div className="relative flex h-fit min-w-full w-fit items-start">
                        
                        {/* Sticky Month Column */}
                        <div className={cn("sticky left-0 z-40 grid h-fit w-20 flex-shrink-0 self-start border-r bg-swimlane-header shadow-[2px_0_5px_rgba(0,0,0,0.05)] content-start", scheduleRowHeights)}>
                            <div className="sticky top-0 left-0 z-50 flex min-h-[56px] items-center justify-center border-b border-white/10 bg-swimlane-header px-2 text-center font-bold text-[10px] text-white uppercase tracking-wider">
                                MONTH
                            </div>
                            {MONTHS.map((month, idx) => {
                                const isCurrentMonth = idx === currentMonthIdx;
                                return (
                                    <div 
                                        key={month} 
                                        className={cn(
                                            "flex h-11 flex-col items-center justify-center border-b px-1 text-[10px] font-mono font-bold uppercase tracking-wider leading-none",
                                            isCurrentMonth ? "bg-white/10 text-white" : "text-white/80"
                                        )}
                                    >
                                        <span>{month}</span>
                                        {isCurrentMonth && (
                                            <Badge variant="outline" className="mt-1 h-3 min-h-0 border-white/40 px-1 py-0 text-[7px] font-bold text-white">
                                                ACT
                                            </Badge>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="relative flex flex-1 items-start">
                            {auditAreas.map((area) => (
                                <div key={area} className={cn("relative grid h-fit min-w-[160px] flex-1 self-start border-r content-start", scheduleRowHeights)}>
                                    <div className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between gap-2 border-b border-white/10 bg-swimlane-header px-3 py-2 text-white">
                                        <span className="min-w-0 flex-1 whitespace-normal break-words text-left text-[9px] font-bold uppercase leading-tight tracking-wider">
                                            {area}
                                        </span>
                                        <AreaActions
                                          area={area}
                                          canEdit={canEditAuditSchedule && canCreateAuditSchedule && canDeleteAuditSchedule}
                                          canDelete={canDeleteAuditSchedule}
                                          onEdit={handleEditArea}
                                          onDelete={handleDeleteArea}
                                        />
                                    </div>
                                    {MONTHS.map((month, idx) => {
                                        const status = getScheduleItem(area, month);
                                        const hasExistingItem = schedule.some((item) => item.area === area && item.month === month);
                                        const canUpdateCell = canEditAuditSchedule || (canCreateAuditSchedule && !hasExistingItem);
                                        const popoverId = `${area}-${month}`;
                                        const isCurrentMonth = idx === currentMonthIdx;

                                        return (
                                            <div 
                                                key={month} 
                                                className={cn(
                                                    "relative flex h-11 items-center justify-center border-b p-1 group transition-colors",
                                                    isCurrentMonth ? "bg-muted/30" : "hover:bg-muted/10"
                                                )}
                                            >
                                                {canUpdateCell ? (
                                                  <Popover 
                                                      open={openPopoverId === popoverId} 
                                                      onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? popoverId : null)}
                                                  >
                                                      <PopoverTrigger asChild>
                                                          <button
                                                              type="button"
                                                              className="w-full h-full cursor-pointer flex items-center justify-center"
                                                              aria-label={`Set schedule status for ${area} in ${month}. Current status: ${status}.`}
                                                          >
                                                              <Badge
                                                                  className={cn(
                                                                      "py-0.5 px-1 w-full justify-center text-[7px] uppercase font-bold shadow-sm transition-transform group-hover:scale-[1.02] border leading-tight h-6 text-center",
                                                                      getStatusBadgeClass(status)
                                                                  )}
                                                              >
                                                                  {status === 'Not Scheduled' ? '' : status}
                                                              </Badge>
                                                          </button>
                                                      </PopoverTrigger>
                                                      <PopoverContent className="w-48 p-0" align="center">
                                                          <StatusSelector
                                                              onSelect={(newStatus) => handleStatusChange(area, month, newStatus)}
                                                          />
                                                      </PopoverContent>
                                                  </Popover>
                                                ) : (
                                                  <Badge
                                                    className={cn(
                                                      "py-0.5 px-1 w-full justify-center text-[7px] uppercase font-bold shadow-sm border leading-tight h-6 text-center",
                                                      getStatusBadgeClass(status)
                                                    )}
                                                  >
                                                    {status === 'Not Scheduled' ? '' : status}
                                                  </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {extraLanes.map((_, laneIdx) => (
                                <div key={`extra-${laneIdx}`} className={cn("grid h-fit min-w-[160px] flex-1 self-start border-r bg-muted/5 opacity-50 content-start", scheduleRowHeights)}>
                                    <div className="sticky top-0 z-30 min-h-[56px] border-b border-white/10 bg-swimlane-header" />
                                    {MONTHS.map((month) => (
                                        <div key={month} className="h-11 border-b" />
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
