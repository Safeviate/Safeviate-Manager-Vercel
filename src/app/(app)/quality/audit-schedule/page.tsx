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
  Archive,
  ChevronDown,
  ArchiveRestore,
  Menu,
  ClipboardCheck,
  Check,
  X,
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

type ScheduleChangeRequest = {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  requestedByEmail: string;
  requestedAt: string;
};

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
    onEdit: (oldName: string, newName: string, reason: string) => void;
    onArchive: (areaName: string, reason: string) => void;
}

function AreaActions({ area, canEdit, canDelete, onEdit, onArchive }: AreaActionsProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [newName, setNewName] = useState(area);
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (isEditOpen) {
            setNewName(area);
            setReason('');
        }
    }, [isEditOpen, area]);

    const handleSave = () => {
        if (newName.trim() && newName.trim() !== area) {
            onEdit(area, newName.trim(), reason.trim());
        }
        setIsEditOpen(false);
    }

    const handleArchiveConfirm = () => {
        if (!reason.trim()) return;
        onArchive(area, reason.trim());
        setIsArchiveOpen(false);
    }
    
    return (
        <>
            {canEdit || canDelete ? (
              <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 border border-white/20 bg-white/10 p-0 text-white hover:bg-white/20"
                    aria-label={`Open actions for ${area}`}
                  >
                    <Menu className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" sideOffset={6} className="z-[70] w-32 p-1">
                  {canEdit ? (
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-start text-xs" onClick={() => { setIsMenuOpen(false); setIsEditOpen(true); }}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-start text-xs text-amber-700 hover:text-amber-800" onClick={() => { setIsMenuOpen(false); setReason(''); setIsArchiveOpen(true); }}>
                      <Archive className="mr-2 h-3.5 w-3.5" /> Archive
                    </Button>
                  ) : null}
                </PopoverContent>
              </Popover>
            ) : null}
            
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Audit Area</DialogTitle>
                        <DialogDescription>Rename the audit area.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="area-name">Area Name</Label>
                        <Input id="area-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                        <Label className="mt-3 block" htmlFor="area-rename-reason">Reason for change</Label>
                        <Input id="area-rename-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this audit area being renamed?" />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSave} disabled={!reason.trim()}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Archive audit area?</DialogTitle>
                        <DialogDescription>
                            This moves "{area}" and its schedule entries to Archived. They can be restored later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                      <Label htmlFor="area-archive-reason">Reason for archive</Label>
                      <Input id="area-archive-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this area being archived?" />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleArchiveConfirm} disabled={!reason.trim()} variant="destructive">
                            Archive
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
  const canDeleteAuditSchedule = hasPermission('quality-audit-schedule-archive') || hasPermission('quality-audit-schedule-delete');
  const canApproveAuditSchedule = hasPermission('quality-audit-schedule-approve');

  const [auditAreas, setAuditAreas] = useState<string[]>(INITIAL_AUDIT_AREAS);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>([]);
  const [archivedAreas, setArchivedAreas] = useState<string[]>([]);
  const [archivedSchedule, setArchivedSchedule] = useState<AuditScheduleItem[]>([]);
  const [revision, setRevision] = useState(1);
  const [pendingChanges, setPendingChanges] = useState<ScheduleChangeRequest[]>([]);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [isChangesOpen, setIsChangesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/audit-schedule', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ areas: [], items: [], archivedAreas: [], archivedItems: [] }));
        if (Array.isArray(payload.areas)) setAuditAreas(payload.areas);
        if (Array.isArray(payload.items)) setSchedule((payload.items as AuditScheduleItem[]).filter(i => i.year === currentYear));
        if (Array.isArray(payload.archivedAreas)) setArchivedAreas(payload.archivedAreas);
        if (Array.isArray(payload.archivedItems)) setArchivedSchedule(payload.archivedItems as AuditScheduleItem[]);
        if (Number.isSafeInteger(payload.revision) && payload.revision > 0) setRevision(payload.revision);
        if (Array.isArray(payload.pendingChanges)) setPendingChanges(payload.pendingChanges as ScheduleChangeRequest[]);
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

  const runScheduleAction = async (action: string, payload: Record<string, unknown>) => {
    const response = await fetch('/api/audit-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, revision, ...payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409) await loadData();
      throw new Error(typeof result.error === 'string' ? result.error : 'Unable to update the audit schedule.');
    }
    await loadData();
    window.dispatchEvent(new Event('safeviate-audit-schedule-updated'));
    return result as { pending?: boolean };
  };

  const handleStatusChange = async (area: string, month: string, status: AuditScheduleStatus) => {
    if (!canEditAuditSchedule && !canCreateAuditSchedule) return;
    setOpenPopoverId(null);
    try {
        const result = await runScheduleAction('set-status', { area, month, year: currentYear, status });
        if (result.pending) window.alert('Your schedule change has been submitted for approval.');
    } catch (e) {
        console.error("Failed to update status", e);
        window.alert(e instanceof Error ? e.message : 'Unable to update the audit schedule.');
    }
  };

  const handleAddArea = async () => {
    if (!canCreateAuditSchedule) return;
    const trimmed = newAreaName.trim();
    if (trimmed && !auditAreas.includes(trimmed)) {
        try {
          const result = await runScheduleAction('add-area', { area: trimmed });
          if (result.pending) window.alert('Your audit area request has been submitted for approval.');
        } catch (error) {
          window.alert(error instanceof Error ? error.message : 'Unable to add the audit area.');
          return;
        }
    }
    setNewAreaName('');
    setIsAddAreaOpen(false);
  }

  const handleEditArea = async (oldName: string, newName: string, reason: string) => {
    if (!canEditAuditSchedule) return;
    try {
        const result = await runScheduleAction('rename-area', { area: oldName, newArea: newName, reason });
        if (result.pending) window.alert('Your rename request has been submitted for approval.');
    } catch (e) {
        console.error("Failed to rename area items", e);
        window.alert(e instanceof Error ? e.message : 'Unable to rename the audit area.');
    }
  }

  const handleDeleteArea = async (areaToDelete: string, reason: string) => {
    if (!canDeleteAuditSchedule) return;
    try {
        const result = await runScheduleAction('archive-area', { area: areaToDelete, reason });
        if (result.pending) window.alert('Your archive request has been submitted for approval.');
    } catch (e) {
        console.error("Failed to archive area items", e);
        window.alert(e instanceof Error ? e.message : 'Unable to archive the audit area.');
    }
  }

  const handleRestoreArea = async (areaToRestore: string) => {
    if (!canDeleteAuditSchedule) return;
    const reason = window.prompt(`Why is "${areaToRestore}" being restored?`);
    if (!reason?.trim()) return;
    try {
      const result = await runScheduleAction('restore-area', { area: areaToRestore, reason: reason.trim() });
      if (result.pending) window.alert('Your restore request has been submitted for approval.');
    } catch (error) {
      console.error('Failed to restore audit area', error);
      window.alert(error instanceof Error ? error.message : 'Unable to restore the audit area.');
    }
  };

  const handleChangeDecision = async (requestId: string, decision: 'approve-change' | 'reject-change') => {
    const reason = decision === 'reject-change'
      ? window.prompt('Reason for rejecting this schedule change?')
      : window.prompt('Approval note (optional):') || '';
    const decisionReason = reason?.trim() || '';
    if (decision === 'reject-change' && !decisionReason) return;
    try {
      await runScheduleAction(decision, { requestId, reason: decisionReason });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to process the change request.');
    }
  };

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
                    <div className="flex items-center gap-2">
                      {canApproveAuditSchedule ? <Button variant="outline" size="sm" onClick={() => setIsChangesOpen(true)} className={HEADER_COMPACT_CONTROL_CLASS}>
                        <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Changes ({pendingChanges.length})
                      </Button> : null}
                      {canDeleteAuditSchedule ? <Button variant="outline" size="sm" onClick={() => setIsArchivedOpen(true)} className={HEADER_COMPACT_CONTROL_CLASS}>
                        <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Archived ({archivedAreas.length})
                      </Button> : null}
                      {canCreateAuditSchedule ? <Button
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
                      </Button> : null}
                    </div>
                }
            />
            <Dialog open={isArchivedOpen} onOpenChange={setIsArchivedOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archived Audit Schedule Areas</DialogTitle>
                  <DialogDescription>Restored areas return with their archived schedule entries.</DialogDescription>
                </DialogHeader>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {archivedAreas.length ? archivedAreas.map((area) => (
                    <div key={area} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{area}</p>
                        <p className="text-xs text-muted-foreground">{archivedSchedule.filter((item) => item.area === area).length} archived schedule entries</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleRestoreArea(area)}>
                        <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Restore
                      </Button>
                    </div>
                  )) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No archived audit schedule areas.</p>}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isChangesOpen} onOpenChange={setIsChangesOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Pending Schedule Changes</DialogTitle>
                  <DialogDescription>Approve to apply the requested change to the current schedule, or reject it with a reason.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] space-y-3 overflow-y-auto">
                  {pendingChanges.length ? pendingChanges.map((change) => (
                    <div key={change.id} className="space-y-3 rounded-lg border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold capitalize">{change.action.replace(/-/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">Requested by {change.requestedByEmail}</p>
                        </div>
                        <Badge variant="secondary" className="capitalize">Pending</Badge>
                      </div>
                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        {Object.entries(change.payload).filter(([key, value]) => key !== 'action' && value !== undefined && value !== '').map(([key, value]) => (
                          <p key={key}><span className="font-semibold capitalize text-foreground">{key.replace(/([A-Z])/g, ' $1')}: </span>{String(value)}</p>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => void handleChangeDecision(change.id, 'reject-change')}><X className="mr-1.5 h-3.5 w-3.5" /> Reject</Button>
                        <Button size="sm" onClick={() => void handleChangeDecision(change.id, 'approve-change')}><Check className="mr-1.5 h-3.5 w-3.5" /> Approve</Button>
                      </div>
                    </div>
                  )) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No schedule changes are awaiting approval.</p>}
                </div>
              </DialogContent>
            </Dialog>
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
                                          canEdit={canEditAuditSchedule}
                                          canDelete={canDeleteAuditSchedule}
                                          onEdit={handleEditArea}
                                          onArchive={handleDeleteArea}
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
