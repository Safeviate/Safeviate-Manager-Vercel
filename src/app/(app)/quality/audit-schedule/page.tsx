'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  CalendarDays,
  Check,
  X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePermissions } from '@/hooks/use-permissions';
import type { AuditScheduleItem, AuditScheduleStatus } from '@/types/quality';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';

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

type ScheduleActionResult = {
  pending?: boolean;
  areas?: string[];
  items?: AuditScheduleItem[];
  archivedAreas?: string[];
  archivedItems?: AuditScheduleItem[];
  revision?: number;
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
  month: string;
  year: number;
  initialStatus: AuditScheduleStatus;
  initialDate?: string;
  onSave: (status: AuditScheduleStatus, plannedDate?: string) => void;
}

function StatusSelector({ month, year, initialStatus, initialDate, onSave }: StatusSelectorProps) {
  const monthIndex = MONTHS.indexOf(month) + 1;
  const monthPrefix = `${year}-${String(monthIndex).padStart(2, '0')}`;
  const [status, setStatus] = useState<AuditScheduleStatus>(initialStatus);
  const [plannedDate, setPlannedDate] = useState(initialDate || `${monthPrefix}-01`);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const plannedDateLabel = plannedDate
    ? new Date(`${plannedDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Select planned date';

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') input.showPicker();
    else input.click();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="border-b pb-3">
        <p className="text-sm font-semibold text-foreground">Schedule {month} {year}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Set the planned date and current status.</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Status</Label>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((candidate) => (
            <Button
              key={candidate}
              type="button"
              variant={status === candidate ? 'default' : 'outline'}
              size="sm"
              className="h-9 justify-start whitespace-nowrap text-xs"
              onClick={() => setStatus(candidate)}
            >
              <div className={cn('mr-1.5 h-2 w-2 rounded-full', candidate === 'Completed' ? 'bg-green-500' : candidate === 'Scheduled' ? 'bg-blue-500' : candidate === 'Pending' ? 'bg-yellow-500' : 'bg-gray-300')} />
              {candidate}
            </Button>
          ))}
        </div>
      </div>
      {status !== 'Not Scheduled' ? <div>
        <Input
          ref={dateInputRef}
          id={`planned-date-${month}`}
          type="date"
          min={`${monthPrefix}-01`}
          max={`${monthPrefix}-${new Date(year, monthIndex, 0).getDate()}`}
          value={plannedDate}
          onChange={(event) => setPlannedDate(event.target.value)}
          className="sr-only"
        />
        <Button type="button" variant="outline" className="h-10 w-full justify-center text-sm font-medium" onClick={openDatePicker}>
          {plannedDateLabel}
        </Button>
      </div> : null}
      <Button type="button" size="sm" className="w-full" onClick={() => onSave(status, status === 'Not Scheduled' ? undefined : plannedDate)} disabled={status !== 'Not Scheduled' && !plannedDate}>
        Save schedule
      </Button>
    </div>
  );
}

interface AreaActionsProps {
    area: string;
    entityLabel: 'Audit' | 'Checklist';
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (oldName: string, newName: string, reason: string) => void;
    onArchive: (areaName: string, reason: string) => void;
}

function AreaActions({ area, entityLabel, canEdit, canDelete, onEdit, onArchive }: AreaActionsProps) {
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
                        <DialogTitle>Edit {entityLabel} Area</DialogTitle>
                        <DialogDescription>Rename the {entityLabel.toLowerCase()} area.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="area-name">Area Name</Label>
                        <Input id="area-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                        <Label className="mt-3 block" htmlFor="area-rename-reason">Reason for change</Label>
                        <Input id="area-rename-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={`Why is this ${entityLabel.toLowerCase()} area being renamed?`} />
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
                        <DialogTitle>Archive {entityLabel.toLowerCase()} area?</DialogTitle>
                        <DialogDescription>
                            This moves "{area}" and its schedule entries to Archived. They can be restored later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                      <Label htmlFor="area-archive-reason">Reason for archive</Label>
                      <Input id="area-archive-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={`Why is this ${entityLabel.toLowerCase()} area being archived?`} />
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
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const canCreateAuditSchedule = hasPermission('quality-audit-schedule-create');
  const canEditAuditSchedule = hasPermission('quality-audit-schedule-edit');
  const canDeleteAuditSchedule = hasPermission('quality-audit-schedule-archive') || hasPermission('quality-audit-schedule-delete');
  const canApproveAuditSchedule = hasPermission('quality-audit-schedule-approve');
  const canViewChecklists = hasPermission('quality-checklists-view');
  const canCreateChecklistSchedule = hasPermission('quality-checklists-create');
  const canEditChecklistSchedule = hasPermission('quality-checklists-edit');
  const canDeleteChecklistSchedule = hasPermission('quality-checklists-archive') || hasPermission('quality-checklists-delete');

  const [auditAreas, setAuditAreas] = useState<string[]>(INITIAL_AUDIT_AREAS);
  const [schedule, setSchedule] = useState<AuditScheduleItem[]>([]);
  const [archivedAreas, setArchivedAreas] = useState<string[]>([]);
  const [archivedSchedule, setArchivedSchedule] = useState<AuditScheduleItem[]>([]);
  const [revision, setRevision] = useState(1);
  const [pendingChanges, setPendingChanges] = useState<ScheduleChangeRequest[]>([]);
  const [checklistAreas, setChecklistAreas] = useState<string[]>([]);
  const [checklistSchedule, setChecklistSchedule] = useState<AuditScheduleItem[]>([]);
  const [archivedChecklistAreas, setArchivedChecklistAreas] = useState<string[]>([]);
  const [archivedChecklistSchedule, setArchivedChecklistSchedule] = useState<AuditScheduleItem[]>([]);
  const [checklistRevision, setChecklistRevision] = useState(1);
  const [taskAreas, setTaskAreas] = useState<string[]>([]);
  const [taskSchedule, setTaskSchedule] = useState<AuditScheduleItem[]>([]);
  const [archivedTaskAreas, setArchivedTaskAreas] = useState<string[]>([]);
  const [archivedTaskSchedule, setArchivedTaskSchedule] = useState<AuditScheduleItem[]>([]);
  const [taskRevision, setTaskRevision] = useState(1);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [isChangesOpen, setIsChangesOpen] = useState(false);
  const [isOccurrencesOpen, setIsOccurrencesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [activeScheduleTab, setActiveScheduleTab] = useState<'audits' | 'checklists' | 'tasks'>('audits');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [response, checklistScheduleResponse, taskScheduleResponse] = await Promise.all([
          fetch('/api/audit-schedule', { cache: 'no-store' }),
          canViewChecklists ? fetch('/api/audit-schedule?scope=checklists', { cache: 'no-store' }) : Promise.resolve(null),
          fetch('/api/audit-schedule?scope=tasks', { cache: 'no-store' }),
        ]);
        const [payload, checklistSchedulePayload, taskSchedulePayload] = await Promise.all([
          response.json().catch(() => null),
          checklistScheduleResponse?.json().catch(() => null),
          taskScheduleResponse.json().catch(() => null),
        ]);
        if (!response.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to load the audit schedule.');
        }
        setLoadError(null);
        if (Array.isArray(payload.areas)) setAuditAreas(payload.areas);
        if (Array.isArray(payload.items)) setSchedule((payload.items as AuditScheduleItem[]).filter(i => i.year === currentYear));
        if (Array.isArray(payload.archivedAreas)) setArchivedAreas(payload.archivedAreas);
        if (Array.isArray(payload.archivedItems)) setArchivedSchedule(payload.archivedItems as AuditScheduleItem[]);
        if (Number.isSafeInteger(payload.revision) && payload.revision > 0) setRevision(payload.revision);
        if (Array.isArray(payload.pendingChanges)) setPendingChanges(payload.pendingChanges as ScheduleChangeRequest[]);
        if (checklistScheduleResponse && !checklistScheduleResponse.ok) {
          throw new Error(typeof checklistSchedulePayload?.error === 'string' ? checklistSchedulePayload.error : 'Unable to load the checklist schedule.');
        }
        if (Array.isArray(checklistSchedulePayload?.areas)) setChecklistAreas(checklistSchedulePayload.areas);
        if (Array.isArray(checklistSchedulePayload?.items)) setChecklistSchedule((checklistSchedulePayload.items as AuditScheduleItem[]).filter((item) => item.year === currentYear));
        if (Array.isArray(checklistSchedulePayload?.archivedAreas)) setArchivedChecklistAreas(checklistSchedulePayload.archivedAreas);
        if (Array.isArray(checklistSchedulePayload?.archivedItems)) setArchivedChecklistSchedule(checklistSchedulePayload.archivedItems as AuditScheduleItem[]);
        if (Number.isSafeInteger(checklistSchedulePayload?.revision) && checklistSchedulePayload.revision > 0) setChecklistRevision(checklistSchedulePayload.revision);
        if (!taskScheduleResponse.ok) {
          throw new Error(typeof taskSchedulePayload?.error === 'string' ? taskSchedulePayload.error : 'Unable to load the task schedule.');
        }
        if (Array.isArray(taskSchedulePayload?.areas)) setTaskAreas(taskSchedulePayload.areas);
        if (Array.isArray(taskSchedulePayload?.items)) setTaskSchedule((taskSchedulePayload.items as AuditScheduleItem[]).filter((item) => item.year === currentYear));
        if (Array.isArray(taskSchedulePayload?.archivedAreas)) setArchivedTaskAreas(taskSchedulePayload.archivedAreas);
        if (Array.isArray(taskSchedulePayload?.archivedItems)) setArchivedTaskSchedule(taskSchedulePayload.archivedItems as AuditScheduleItem[]);
        if (Number.isSafeInteger(taskSchedulePayload?.revision) && taskSchedulePayload.revision > 0) setTaskRevision(taskSchedulePayload.revision);
    } catch (e) {
        console.error("Failed to load audit schedule", e);
        setLoadError(e instanceof Error ? e.message : 'Unable to load the audit schedule.');
    } finally {
        setIsLoading(false);
    }
  }, [canViewChecklists, currentYear]);

  useEffect(() => {
    void loadData();
    window.addEventListener('safeviate-audit-schedule-updated', loadData);
    return () => window.removeEventListener('safeviate-audit-schedule-updated', loadData);
  }, [loadData]);

  if (!isAccessLoading && !isAllowed) {
    return <TenantLayoutDisabledState />;
  }

  const isChecklistSchedule = activeScheduleTab === 'checklists';
  const isTaskSchedule = activeScheduleTab === 'tasks';
  const activeAreas = isChecklistSchedule ? checklistAreas : isTaskSchedule ? taskAreas : auditAreas;
  const activeItems = isChecklistSchedule ? checklistSchedule : isTaskSchedule ? taskSchedule : schedule;
  const activeArchivedAreas = isChecklistSchedule ? archivedChecklistAreas : isTaskSchedule ? archivedTaskAreas : archivedAreas;
  const activeArchivedItems = isChecklistSchedule ? archivedChecklistSchedule : isTaskSchedule ? archivedTaskSchedule : archivedSchedule;
  const activeRevision = isChecklistSchedule ? checklistRevision : isTaskSchedule ? taskRevision : revision;
  const scheduleLabel = isChecklistSchedule ? 'checklist' : isTaskSchedule ? 'task' : 'audit';
  const scheduleLabelTitle = isChecklistSchedule ? 'Checklist' : isTaskSchedule ? 'Task' : 'Audit';
  const canCreateSchedule = isChecklistSchedule ? canCreateChecklistSchedule : canCreateAuditSchedule;
  const canEditSchedule = isChecklistSchedule ? canEditChecklistSchedule : canEditAuditSchedule;
  const canArchiveSchedule = isChecklistSchedule ? canDeleteChecklistSchedule : canDeleteAuditSchedule;

  const applyScheduleResult = (result: ScheduleActionResult) => {
    if (!Array.isArray(result.areas)) return;
    if (isChecklistSchedule) {
      setChecklistAreas(result.areas);
      setChecklistSchedule(Array.isArray(result.items) ? result.items.filter((item) => item.year === currentYear) : []);
      setArchivedChecklistAreas(Array.isArray(result.archivedAreas) ? result.archivedAreas : []);
      setArchivedChecklistSchedule(Array.isArray(result.archivedItems) ? result.archivedItems : []);
      if (Number.isSafeInteger(result.revision) && result.revision > 0) setChecklistRevision(result.revision);
      return;
    }
    if (isTaskSchedule) {
      setTaskAreas(result.areas);
      setTaskSchedule(Array.isArray(result.items) ? result.items.filter((item) => item.year === currentYear) : []);
      setArchivedTaskAreas(Array.isArray(result.archivedAreas) ? result.archivedAreas : []);
      setArchivedTaskSchedule(Array.isArray(result.archivedItems) ? result.archivedItems : []);
      if (Number.isSafeInteger(result.revision) && result.revision > 0) setTaskRevision(result.revision);
      return;
    }
    setAuditAreas(result.areas);
    setSchedule(Array.isArray(result.items) ? result.items.filter((item) => item.year === currentYear) : []);
    setArchivedAreas(Array.isArray(result.archivedAreas) ? result.archivedAreas : []);
    setArchivedSchedule(Array.isArray(result.archivedItems) ? result.archivedItems : []);
    if (Number.isSafeInteger(result.revision) && result.revision > 0) setRevision(result.revision);
  };

  const runScheduleAction = async (action: string, payload: Record<string, unknown>) => {
    const response = await fetch('/api/audit-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, revision: activeRevision, scope: activeScheduleTab, ...payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409) await loadData();
      throw new Error(typeof result.error === 'string' ? result.error : 'Unable to update the audit schedule.');
    }
    const scheduleResult = result as ScheduleActionResult;
    if (!scheduleResult.pending) applyScheduleResult(scheduleResult);
    return scheduleResult;
  };

  const handleStatusChange = async (area: string, month: string, status: AuditScheduleStatus, plannedDate?: string) => {
    if (!canEditSchedule && !canCreateSchedule) return;
    setOpenPopoverId(null);
    try {
        const result = await runScheduleAction('set-status', { area, month, year: currentYear, status, plannedDate });
      if (result.pending) window.alert('Your schedule change has been submitted for approval.');
    } catch (e) {
        console.error("Failed to update status", e);
        window.alert(e instanceof Error ? e.message : `Unable to update the ${scheduleLabel} schedule.`);
    }
  };

  const handleAddArea = async () => {
    if (!canCreateSchedule) return;
    const trimmed = newAreaName.trim();
    if (trimmed && !activeAreas.includes(trimmed)) {
        try {
          const result = await runScheduleAction('add-area', { area: trimmed });
          if (result.pending) window.alert(`Your ${scheduleLabel} area request has been submitted for approval.`);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : `Unable to add the ${scheduleLabel} area.`);
          return;
        }
    }
    setNewAreaName('');
    setIsAddAreaOpen(false);
  }

  const handleEditArea = async (oldName: string, newName: string, reason: string) => {
    if (!canEditSchedule) return;
    try {
        const result = await runScheduleAction('rename-area', { area: oldName, newArea: newName, reason });
        if (result.pending) window.alert('Your rename request has been submitted for approval.');
    } catch (e) {
        console.error("Failed to rename area items", e);
        window.alert(e instanceof Error ? e.message : `Unable to rename the ${scheduleLabel} area.`);
    }
  }

  const handleDeleteArea = async (areaToDelete: string, reason: string) => {
    if (!canArchiveSchedule) return;
    try {
        const result = await runScheduleAction('archive-area', { area: areaToDelete, reason });
        if (result.pending) window.alert('Your archive request has been submitted for approval.');
    } catch (e) {
        console.error("Failed to archive area items", e);
        window.alert(e instanceof Error ? e.message : `Unable to archive the ${scheduleLabel} area.`);
    }
  }

  const handleRestoreArea = async (areaToRestore: string) => {
    if (!canArchiveSchedule) return;
    const reason = window.prompt(`Why is "${areaToRestore}" being restored?`);
    if (!reason?.trim()) return;
    try {
      const result = await runScheduleAction('restore-area', { area: areaToRestore, reason: reason.trim() });
      if (result.pending) window.alert('Your restore request has been submitted for approval.');
    } catch (error) {
      console.error(`Failed to restore ${scheduleLabel} area`, error);
      window.alert(error instanceof Error ? error.message : `Unable to restore the ${scheduleLabel} area.`);
    }
  };

  const handleChangeDecision = async (requestId: string, decision: 'approve-change' | 'reject-change') => {
    const reason = decision === 'reject-change'
      ? window.prompt('Reason for rejecting this schedule change?')
      : window.prompt('Approval note (optional):') || '';
    const decisionReason = reason?.trim() || '';
    if (decision === 'reject-change' && !decisionReason) return;
    try {
      const result = await runScheduleAction(decision, { requestId, reason: decisionReason });
      if (!result.pending) setPendingChanges((changes) => changes.filter((change) => change.id !== requestId));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to process the change request.');
    }
  };

  const getScheduleItem = (area: string, month: string): AuditScheduleStatus => {
    const found = activeItems.find(item => item.area === area && item.month === month);
    return found ? found.status : 'Not Scheduled';
  };

  const getScheduleDate = (area: string, month: string) => activeItems.find((item) => item.area === area && item.month === month)?.plannedDate;

  const scheduleOccurrences = [...activeItems].sort((left, right) => {
    const monthDifference = MONTHS.indexOf(left.month) - MONTHS.indexOf(right.month);
    return monthDifference || left.area.localeCompare(right.area);
  });

  const scheduleTabs = [
    { value: 'audits', label: 'Audits', icon: ClipboardCheck },
    ...(canViewChecklists ? [{ value: 'checklists', label: 'Checklists', icon: CalendarDays }] : []),
    { value: 'tasks', label: 'Tasks', icon: Check },
  ];
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
                title="Quality Schedule"
                actions={(
                    <div className="flex items-center gap-2">
                      {!isChecklistSchedule && canApproveAuditSchedule ? <Button variant="outline" size="sm" onClick={() => setIsChangesOpen(true)} className={HEADER_COMPACT_CONTROL_CLASS}>
                        <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Changes ({pendingChanges.length})
                      </Button> : null}
                      {canArchiveSchedule ? <Button variant="outline" size="sm" onClick={() => setIsArchivedOpen(true)} className={HEADER_COMPACT_CONTROL_CLASS}>
                        <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Archived ({activeArchivedAreas.length})
                      </Button> : null}
                      <Button variant="outline" size="sm" onClick={() => setIsOccurrencesOpen(true)} className={HEADER_COMPACT_CONTROL_CLASS}>
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Entries ({scheduleOccurrences.length})
                      </Button>
                      {canCreateSchedule ? <Button
                          variant={isMobile ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => setIsAddAreaOpen(true)}
                          className={isMobile ? HEADER_MOBILE_ACTION_BUTTON_CLASS : HEADER_ACTION_BUTTON_CLASS}
                      >
                          <span className="flex items-center gap-2">
                              <PlusCircle className="h-4 w-4" />
                              Add {scheduleLabelTitle} Area
                          </span>
                          {isMobile ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                      </Button> : null}
                    </div>
                )}
            />
            <ResponsiveTabRow
              value={activeScheduleTab}
              onValueChange={(value) => setActiveScheduleTab(value as 'audits' | 'checklists' | 'tasks')}
              options={scheduleTabs}
              placeholder="Select schedule view"
              className="border-b bg-muted/5 px-3 py-2 shrink-0"
              flatTabs
            />
            <div className="flex shrink-0 items-center gap-2 border-b bg-muted/5 px-4 py-2 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="h-5 border-blue-200 bg-blue-50 px-2 text-[10px] font-semibold text-blue-700">{scheduleLabelTitle}</Badge>
              <span>{isTaskSchedule ? 'Standalone work item — no checklist required.' : isChecklistSchedule ? 'Repeatable steps completed as a checklist.' : 'Formal review with findings and sign-off.'}</span>
            </div>
            {loadError ? <div className="mx-4 mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{loadError}</div> : null}
            <Dialog open={isArchivedOpen} onOpenChange={setIsArchivedOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archived {scheduleLabelTitle} Schedule Areas</DialogTitle>
                  <DialogDescription>Restored areas return with their archived schedule entries.</DialogDescription>
                </DialogHeader>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {activeArchivedAreas.length ? activeArchivedAreas.map((area) => (
                    <div key={area} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{area}</p>
                        <p className="text-xs text-muted-foreground">{activeArchivedItems.filter((item) => item.area === area).length} archived schedule entries</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleRestoreArea(area)}>
                        <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Restore
                      </Button>
                    </div>
                  )) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No archived {scheduleLabel} schedule areas.</p>}
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
            <Dialog open={isOccurrencesOpen} onOpenChange={setIsOccurrencesOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{scheduleLabelTitle} programme entries</DialogTitle>
                  <DialogDescription>All active {scheduleLabel} programme entries for this tenant and calendar year.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                  {scheduleOccurrences.length ? scheduleOccurrences.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-card-border/60 bg-card px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.area}</p>
                        <p className="text-xs text-muted-foreground">{item.plannedDate ? new Date(`${item.plannedDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : `${item.month} ${item.year}`}</p>
                      </div>
                      <Badge className={cn('shrink-0 border text-xs', getStatusBadgeClass(item.status))}>{item.status}</Badge>
                    </div>
                  )) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No {scheduleLabel} schedule entries for {currentYear}.</p>}
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
                            {activeAreas.map((area) => (
                                <div key={area} className={cn("relative grid h-fit min-w-[160px] flex-1 self-start border-r content-start", scheduleRowHeights)}>
                                    <div className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between gap-2 border-b border-white/10 bg-swimlane-header px-3 py-2 text-white">
                                        <span className="min-w-0 flex-1 whitespace-normal break-words text-left text-[9px] font-bold uppercase leading-tight tracking-wider">
                                            {area}
                                        </span>
                                        <AreaActions
                                          area={area}
                                          entityLabel={scheduleLabelTitle}
                                          canEdit={canEditSchedule}
                                          canDelete={canArchiveSchedule}
                                          onEdit={handleEditArea}
                                          onArchive={handleDeleteArea}
                                        />
                                    </div>
                                    {MONTHS.map((month, idx) => {
                                        const status = getScheduleItem(area, month);
                                        const plannedDate = getScheduleDate(area, month);
                                        const occurrenceCount = activeItems.filter((item) => item.area === area && item.month === month).length;
                                        const hasExistingItem = activeItems.some((item) => item.area === area && item.month === month);
                                        const canUpdateCell = canEditSchedule || (canCreateSchedule && !hasExistingItem);
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
                                                              {status === 'Not Scheduled' ? '' : `${plannedDate ? `${new Date(`${plannedDate}T00:00:00`).getDate()} · ` : ''}${status}${occurrenceCount > 1 ? ` (${occurrenceCount})` : ''}`}
                                                              </Badge>
                                                          </button>
                                                      </PopoverTrigger>
                                                      <PopoverContent className="w-80 p-0" align="center" sideOffset={8}>
                                                          <StatusSelector
                                                              month={month}
                                                              year={currentYear}
                                                              initialStatus={status === 'Not Scheduled' ? 'Scheduled' : status}
                                                              initialDate={plannedDate}
                                                              onSave={(newStatus, newPlannedDate) => handleStatusChange(area, month, newStatus, newPlannedDate)}
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
                                                    {status === 'Not Scheduled' ? '' : `${plannedDate ? `${new Date(`${plannedDate}T00:00:00`).getDate()} · ` : ''}${status}${occurrenceCount > 1 ? ` (${occurrenceCount})` : ''}`}
                                                  </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
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
                    <DialogTitle>Add New {scheduleLabelTitle} Area</DialogTitle>
                    <DialogDescription>Create a new {scheduleLabel} lane in the annual schedule.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="new-area-name">Area Name</Label>
                    <Input id="new-area-name" placeholder={isChecklistSchedule ? 'e.g., Apron readiness' : isTaskSchedule ? 'e.g., Review fire extinguisher records' : 'e.g., Maintenance'} value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAddArea} disabled={!newAreaName.trim()}>Add {scheduleLabelTitle} Area</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
