'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { OrganizationTabsRow } from '@/components/responsive-tab-row';
import { ViewActionButton } from '@/components/record-action-buttons';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { ChevronDown } from 'lucide-react';
import { getPersonnelDisplayName } from '@/lib/personnel-label';
import { DocumentUploader } from '@/components/document-uploader';
import { PlusCircle, Trash2, CalendarIcon, ChevronRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

import type { ManagementOfChange } from '@/types/moc';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit, QualityFinding, ExternalOrganization, CorrectiveActionPlanEvidence, CorrectiveActionPlanResponse } from '@/types/quality';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { CorrectiveAction } from '@/types/safety-report';

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};

type UnifiedTask = {
  id: string;
  description: string;
  sourceType: 'MOC' | 'Audit' | 'Gap Analysis' | 'Safety Report';
  sourceIdentifier: string;
  link: string;
  assigneeId: string;
  assigneeName?: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Closed' | 'Cancelled';
  organizationId?: string | null;
};

type AuditCapEntry = {
  cap: CorrectiveActionPlan;
  audit: QualityAudit;
  observation: string;
  findingLevel: string;
};

const formatCapDueDate = (value?: string) => {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
};

const toNoonUtcIso = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString();

const parseCapObservation = (finding?: QualityFinding) =>
  finding?.comment?.trim()
  || finding?.gapDescription?.trim()
  || finding?.actionPlan?.trim()
  || finding?.currentState?.trim()
  || finding?.desiredState?.trim()
  || 'No observation recorded.';

const parseCapFindingLevel = (finding?: QualityFinding) => finding?.level?.trim() || 'Unclassified';

const getCapOwnerLabel = (personnel: Personnel[], cap: CorrectiveActionPlan) =>
  getPersonnelDisplayName(personnel, cap.responsiblePersonId || '') || 'Unassigned';

const getOpenCapActionAssignees = (personnel: Personnel[], cap: CorrectiveActionPlan) => {
  const openActions = (cap.actions || []).filter((action) => action.status !== 'Closed' && action.status !== 'Cancelled');
  const names = [...new Set(
    openActions
      .map((action) => getPersonnelDisplayName(personnel, action.responsiblePersonId || '') || 'Unassigned')
      .filter(Boolean)
  )];

  return {
    openActions,
    names,
    summary: names.length === 0 ? 'No action assignees' : names.join(', '),
  };
};

interface AuditCapBoardCardProps {
  cap: CorrectiveActionPlan;
  audit: QualityAudit;
  observation: string;
  findingLevel: string;
  personnel: Personnel[];
  currentUserId?: string;
  currentUserName?: string;
  rolePermissions?: string[];
}

function AuditCapBoardCard({ cap, audit, observation, findingLevel, personnel, currentUserId, currentUserName, rolePermissions = [] }: AuditCapBoardCardProps) {
  const { toast } = useToast();
  const correctiveActionRef = useRef<HTMLTextAreaElement | null>(null);
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState(cap.rootCauseAnalysis || '');
  const [responsiblePersonId, setResponsiblePersonId] = useState(cap.responsiblePersonId || '');
  const [dueDate, setDueDate] = useState(formatCapDueDate(cap.dueDate || audit.auditDate));
  const [actions, setActions] = useState<CorrectiveAction[]>(cap.actions || []);
  const [responses, setResponses] = useState<CorrectiveActionPlanResponse[]>(cap.responses || []);
  const [responseDraft, setResponseDraft] = useState('');
  const [draftEvidence, setDraftEvidence] = useState<CorrectiveActionPlanEvidence[]>([]);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingResponseMeta, setEditingResponseMeta] = useState<Pick<CorrectiveActionPlanResponse, 'createdAt' | 'createdById' | 'createdByName'> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const hasQualityManagementPermission =
    rolePermissions.includes('*')
    || rolePermissions.includes('admin-view')
    || rolePermissions.includes('quality-caps-manage');
  const canManageCapResponses = Boolean(
    currentUserId
    && (
      currentUserId === responsiblePersonId
      || actions.some((action) => action.responsiblePersonId === currentUserId)
      || hasQualityManagementPermission
    )
  );

  useEffect(() => {
    setRootCauseAnalysis(cap.rootCauseAnalysis || '');
    setResponsiblePersonId(cap.responsiblePersonId || '');
    setDueDate(formatCapDueDate(cap.dueDate || audit.auditDate));
    setActions(cap.actions || []);
    setResponses(cap.responses || []);
    setResponseDraft('');
    setDraftEvidence([]);
    setEditingResponseId(null);
    setEditingResponseMeta(null);
  }, [audit.auditDate, cap.actions, cap.dueDate, cap.id, cap.responsiblePersonId, cap.responses, cap.rootCauseAnalysis]);

  useEffect(() => {
    const textarea = correctiveActionRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 44)}px`;
  }, [rootCauseAnalysis]);

  const saveCap = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/corrective-action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cap: {
            ...cap,
            rootCauseAnalysis,
            responsiblePersonId,
            dueDate: dueDate ? toNoonUtcIso(parseLocalDate(dueDate)) : '',
            actions,
            responses,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to save corrective action plan.');
      }
      window.dispatchEvent(new Event('safeviate-quality-updated'));
      toast({
        title: 'Corrective Action Plan Saved',
        description: 'The CAP has been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save CAP.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addResponse = () => {
    if (!canManageCapResponses) {
      toast({
        variant: 'destructive',
        title: 'Not Allowed',
        description: 'Only the assigned CAP owner or a user with quality management permissions can add responses.',
      });
      return;
    }

    const message = responseDraft.trim();
    if (!message && draftEvidence.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Response Entered',
        description: 'Add a response note or attach evidence before adding a CAP reply.',
      });
      return;
    }

    const nextResponse: CorrectiveActionPlanResponse = {
      id: editingResponseId || crypto.randomUUID(),
      message,
      createdAt: editingResponseMeta?.createdAt || new Date().toISOString(),
      createdById: editingResponseMeta?.createdById || currentUserId,
      createdByName: editingResponseMeta?.createdByName || currentUserName || 'Unknown user',
      evidence: draftEvidence,
    };

    setResponses((current) => [nextResponse, ...current]);
    setResponseDraft('');
    setDraftEvidence([]);
    setEditingResponseId(null);
    setEditingResponseMeta(null);
  };

  const beginEditResponse = (response: CorrectiveActionPlanResponse) => {
    setEditingResponseId(response.id);
    setEditingResponseMeta({
      createdAt: response.createdAt,
      createdById: response.createdById,
      createdByName: response.createdByName,
    });
    setResponseDraft(response.message || '');
    setDraftEvidence(response.evidence || []);
    setResponses((current) => current.filter((item) => item.id !== response.id));
  };

  const removeResponse = (responseId: string) => {
    setResponses((current) => current.filter((item) => item.id !== responseId));
  };

  const addCapAction = () => {
    setActions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: '',
        responsiblePersonId: '',
        deadline: dueDate ? toNoonUtcIso(parseLocalDate(dueDate)) : new Date().toISOString(),
        status: 'Open',
      },
    ]);
  };

  const updateCapAction = <K extends keyof CorrectiveAction>(actionId: string, field: K, value: CorrectiveAction[K]) => {
    setActions((current) => current.map((action) => (
      action.id === actionId ? { ...action, [field]: value } : action
    )));
  };

  const removeCapAction = (actionId: string) => {
    setActions((current) => current.filter((action) => action.id !== actionId));
  };

  return (
    <div className="rounded-lg border border-card-border bg-muted/10 p-3 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm" className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.08em]">
            <Link href={`/quality/audits/${audit.id}`}>Audit #{audit.auditNumber}</Link>
          </Button>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Observation</p>
            <p className="text-sm font-medium text-foreground">{observation}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <Badge variant="outline" className="h-[22px] rounded-lg border-card-border bg-background px-2 text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
            {cap.status}
          </Badge>
          <div className="flex h-[22px] items-center justify-between gap-3 rounded-lg border border-card-border bg-white px-2 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Finding Level</p>
            <p className="text-[10px] font-semibold leading-none text-foreground">{findingLevel}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Corrective Action</p>
          <Textarea
            ref={correctiveActionRef}
            value={rootCauseAnalysis}
            onChange={(event) => setRootCauseAnalysis(event.target.value)}
            rows={1}
            placeholder="Describe the corrective action..."
            className="min-h-11 resize-none overflow-hidden bg-background"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Responsible Person</p>
          <Select value={responsiblePersonId || ''} onValueChange={(value) => setResponsiblePersonId(value === '__unassigned__' ? '' : value)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Assign a responsible person..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {personnel.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.firstName} {person.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Due Date</p>
          <Popover open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-background text-left font-normal"
              >
                <span>{dueDate ? format(parseLocalDate(dueDate), 'dd MMM yy') : 'Pick a date'}</span>
                <CalendarIcon className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CustomCalendar
                selectedDate={dueDate ? parseLocalDate(dueDate) : undefined}
                onDateSelect={(date) => {
                  setDueDate(format(date, 'yyyy-MM-dd'));
                  setIsDueDateOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-card-border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Responsibility Entries</p>
            <p className="mt-1 text-xs text-muted-foreground">Split one CAP into multiple corrective action responsibilities when several people need to own different actions.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addCapAction} className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.08em]">
            <PlusCircle className="mr-1 h-3 w-3" />
            Add Responsibility
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          {actions.length > 0 ? (
            actions.map((action, index) => (
              <div key={action.id} className="rounded-lg border border-card-border bg-muted/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Entry {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10"
                    onClick={() => removeCapAction(action.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Action</p>
                    <Input
                      value={action.description}
                      onChange={(event) => updateCapAction(action.id, 'description', event.target.value)}
                      placeholder="Describe this responsibility entry..."
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Assignee</p>
                    <Select value={action.responsiblePersonId || '__unassigned__'} onValueChange={(value) => updateCapAction(action.id, 'responsiblePersonId', value === '__unassigned__' ? '' : value)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__">Unassigned</SelectItem>
                        {personnel.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.firstName} {person.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                    <Select value={action.status} onValueChange={(value) => updateCapAction(action.id, 'status', value as CorrectiveAction['status'])}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Open', 'In Progress', 'Closed', 'Cancelled'].map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Deadline</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between bg-background text-left font-normal lg:min-w-[150px]"
                        >
                          <span>{action.deadline ? format(parseLocalDate(formatCapDueDate(action.deadline)), 'dd MMM yy') : 'Pick a date'}</span>
                          <CalendarIcon className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CustomCalendar
                          selectedDate={action.deadline ? parseLocalDate(formatCapDueDate(action.deadline)) : undefined}
                          onDateSelect={(date) => updateCapAction(action.id, 'deadline', toNoonUtcIso(date))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-card-border bg-muted/5 px-3 py-6 text-center text-sm text-muted-foreground">
              No responsibility entries added yet.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={saveCap} disabled={isSaving}>
          Save CAP
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-card-border bg-background p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Assignee Response</p>
            <p className="mt-1 text-xs text-muted-foreground">Assignees can log an update and attach evidence before saving the CAP.</p>
          </div>
          <DocumentUploader
            defaultFileName={`cap-evidence-${audit.auditNumber}`}
            trigger={(open) => (
              <Button type="button" variant="outline" size="sm" onClick={() => open()} disabled={!canManageCapResponses} className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.08em]">
                <PlusCircle className="mr-1 h-3 w-3" />
                Add Evidence
              </Button>
            )}
            onDocumentUploaded={async (document) => {
              setDraftEvidence((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  name: document.name,
                  url: document.url,
                  uploadDate: document.uploadDate,
                },
              ]);
            }}
          />
        </div>

        <div className="mt-3 space-y-3">
          <Textarea
            value={responseDraft}
            onChange={(event) => setResponseDraft(event.target.value)}
            placeholder="Add a response update for this corrective action plan..."
                    className="min-h-11 bg-background"
            disabled={!canManageCapResponses}
          />

          {!canManageCapResponses ? (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
              Only the assigned CAP owner or a user with quality management permissions can post responses and upload evidence.
            </div>
          ) : null}

          {draftEvidence.length > 0 ? (
            <div className="space-y-2">
              {draftEvidence.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2">
                  <div className="min-w-0">
                    <a href={document.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-foreground underline decoration-slate-300 underline-offset-4">
                      {document.name}
                    </a>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Uploaded {format(new Date(document.uploadDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10"
                    onClick={() => setDraftEvidence((current) => current.filter((item) => item.id !== document.id))}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              {editingResponseId ? (
                <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingResponseId(null);
                        setEditingResponseMeta(null);
                        setResponseDraft('');
                        setDraftEvidence([]);
                      }}
                >
                  Cancel Edit
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={addResponse} disabled={!canManageCapResponses}>
                {editingResponseId ? 'Update Response' : 'Add Response'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Response History</p>
          <Badge variant="outline" className="h-[22px] rounded-lg border-card-border bg-background px-2 text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
            {responses.length} updates
          </Badge>
        </div>
        {responses.length > 0 ? (
          responses.map((response) => (
            <div key={response.id} className="rounded-lg border border-card-border bg-background px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{response.createdByName || 'Unknown user'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    {format(new Date(response.createdAt), 'dd MMM yyyy HH:mm')}
                  </p>
                  {canManageCapResponses ? (
                    <>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase" onClick={() => beginEditResponse(response)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10" onClick={() => removeResponse(response.id)}>
                        Remove
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{response.message || 'Evidence uploaded without a written response.'}</p>
              {response.evidence && response.evidence.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {response.evidence.map((document) => (
                    <a
                      key={document.id}
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-md border bg-muted/10 px-3 py-2 text-sm font-semibold text-foreground underline decoration-slate-300 underline-offset-4"
                    >
                      {document.name}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
            No CAP responses have been added yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskTrackerPage() {
  const { tenantId, userProfile, rolePermissions } = useUserProfile();
  const { toast } = useToast();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-tasks-view' });
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/quality/task-tracker' });
  const isMobile = useIsMobile();
  const [activeOrgTab, setActiveOrgTab] = useState('internal');
  const [capFocusFilter, setCapFocusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Closed' | 'Overdue' | 'Due Soon' | 'Unassigned'>('All');
  const [capSortBy, setCapSortBy] = useState<'Due Date' | 'Owner'>('Due Date');
  const [isCapBoardCollapsed, setIsCapBoardCollapsed] = useState(false);

  const [mocs, setMocs] = useState<ManagementOfChange[]>([]);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]);
  const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
  const [audits, setAudits] = useState<QualityAudit[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isCurrentTenantRecord = (record: { tenantId?: string | null } | null | undefined) => record?.tenantId === tenantId;
  const canDeleteCaps =
    rolePermissions.includes('*')
    || rolePermissions.includes('admin-view')
    || rolePermissions.includes('quality-caps-manage');

  const loadData = useCallback(() => {
    setIsLoading(true);
    void (async () => {
      try {
        const [summaryRes, orgsRes] = await Promise.all([
          fetch('/api/dashboard-summary', { cache: 'no-store' }),
          fetch('/api/external-organizations', { cache: 'no-store' }),
        ]);
        const summary = await summaryRes.json().catch(() => ({}));
        const orgsPayload = await orgsRes.json().catch(() => ({}));

        setMocs(Array.isArray(summary.mocs) ? summary.mocs.filter(isCurrentTenantRecord) : []);
        setSafetyReports(Array.isArray(summary.reports) ? summary.reports.filter(isCurrentTenantRecord) : []);
        setCaps(Array.isArray(summary.caps) ? summary.caps.filter(isCurrentTenantRecord) : []);
        setAudits(Array.isArray(summary.audits) ? summary.audits.filter(isCurrentTenantRecord) : []);
        setPersonnel(Array.isArray(summary.personnel) ? summary.personnel : []);
        setOrganizations(Array.isArray(orgsPayload.organizations) ? orgsPayload.organizations : []);
      } catch (e) {
        console.error('Failed to load task data', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    loadData();
    const events = [
      'safeviate-moc-updated',
      'safeviate-safety-reports-updated',
      'safeviate-quality-updated',
      'safeviate-personnel-updated',
      'safeviate-external-organizations-updated',
    ];
    events.forEach((event) => window.addEventListener(event, loadData));
    return () => events.forEach((event) => window.removeEventListener(event, loadData));
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = tenantId ? `safeviate-task-tracker-cap-board-collapsed:${tenantId}` : 'safeviate-task-tracker-cap-board-collapsed';
    const savedState = window.localStorage.getItem(storageKey);
    if (savedState === null) return;
    setIsCapBoardCollapsed(savedState === 'true');
  }, [tenantId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = tenantId ? `safeviate-task-tracker-cap-board-collapsed:${tenantId}` : 'safeviate-task-tracker-cap-board-collapsed';
    window.localStorage.setItem(storageKey, String(isCapBoardCollapsed));
  }, [isCapBoardCollapsed, tenantId]);

  const allTasks = useMemo((): UnifiedTask[] => {
    if (isLoading || !personnel) return [];

    const personnelMap = new Map(personnel.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
    const tasks: UnifiedTask[] = [];

    (mocs || []).filter(isCurrentTenantRecord).forEach((moc) => {
      moc.phases?.forEach((phase) => {
        phase.steps?.forEach((step) => {
          step.hazards?.forEach((hazard) => {
            hazard.risks?.forEach((risk) => {
              risk.mitigations?.forEach((mitigation) => {
                if (mitigation.status !== 'Closed' && mitigation.status !== 'Cancelled') {
                  tasks.push({
                    id: mitigation.id,
                    description: mitigation.description,
                    sourceType: 'MOC',
                    sourceIdentifier: moc.mocNumber,
                    link: `/safety/management-of-change/${moc.id}`,
                    assigneeId: mitigation.responsiblePersonId,
                    assigneeName: personnelMap.get(mitigation.responsiblePersonId) || 'Unassigned',
                    dueDate: mitigation.completionDate,
                    status: mitigation.status,
                    organizationId: moc.organizationId,
                  });
                }
              });
            });
          });
        });
      });
    });

    (safetyReports || []).filter(isCurrentTenantRecord).forEach((report) => {
      (report.investigationTasks || []).forEach((task) => {
        if (task.status !== 'Completed') {
          tasks.push({
            id: task.id,
            description: task.description,
            sourceType: 'Safety Report',
            sourceIdentifier: report.reportNumber,
            link: `/safety/safety-reports/${report.id}`,
            assigneeId: task.assigneeId,
            assigneeName: personnelMap.get(task.assigneeId) || 'Unassigned',
            dueDate: task.dueDate,
            status: task.status,
            organizationId: report.organizationId,
          });
        }
      });
    });

    (audits || []).filter(isCurrentTenantRecord).forEach((audit) => {
      if ((audit as { analysisType?: string } | undefined)?.analysisType !== 'gap-analysis') return;

      (audit.findings || []).forEach((finding) => {
        if (finding.gapStatus !== 'Open gap' && finding.gapStatus !== 'Partial coverage') return;

        const assigneeId = finding.ownerId?.trim() || audit.auditorId;
        const dueDate = finding.targetDate?.trim() || audit.auditDate;

        tasks.push({
          id: `${audit.id}:${finding.checklistItemId}`,
          description:
            finding.actionPlan?.trim()
            || finding.gapDescription?.trim()
            || finding.currentState?.trim()
            || finding.desiredState?.trim()
            || finding.checklistItemId,
          sourceType: 'Gap Analysis',
          sourceIdentifier: audit.auditNumber || 'Unknown Gap Analysis',
          link: `/quality/gap-analyses/${audit.id}`,
          assigneeId,
          assigneeName: personnelMap.get(assigneeId) || 'Unassigned',
          dueDate,
          status: finding.gapStatus === 'Partial coverage' ? 'In Progress' : 'Open',
          organizationId: audit.organizationId,
        });
      });
    });

    return tasks.sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());
  }, [mocs, safetyReports, caps, audits, personnel, isLoading]);

  const auditsMap = useMemo(() => new Map((audits || []).map((audit) => [audit.id, audit])), [audits]);
  const auditCapEntries = useMemo<AuditCapEntry[]>(() => {
    if (isLoading) return [];
    return (caps || [])
      .filter(isCurrentTenantRecord)
      .map((cap) => {
        const audit = auditsMap.get(cap.auditId);
        if (!audit || (audit as { analysisType?: string } | undefined)?.analysisType === 'gap-analysis') return null;
        const finding = audit.findings?.find((item) => item.checklistItemId === cap.findingId);
        return {
          cap,
          audit,
          observation: parseCapObservation(finding),
          findingLevel: parseCapFindingLevel(finding),
        };
      })
      .filter((entry): entry is AuditCapEntry => Boolean(entry));
  }, [auditsMap, caps, isLoading]);

  const auditCapSnapshot = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(now.getDate() + 7);

    const overdue = auditCapEntries.filter((entry) => {
      const due = parseLocalDate(formatCapDueDate(entry.cap.dueDate || entry.audit.auditDate));
      return due.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()
        && entry.cap.status !== 'Closed'
        && entry.cap.status !== 'Cancelled';
    }).length;
    const dueSoon = auditCapEntries.filter((entry) => {
      const due = parseLocalDate(formatCapDueDate(entry.cap.dueDate || entry.audit.auditDate));
      return due.getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()
        && due.getTime() <= weekAhead.getTime()
        && entry.cap.status !== 'Closed'
        && entry.cap.status !== 'Cancelled';
    }).length;
    const open = auditCapEntries.filter((entry) => entry.cap.status !== 'Closed' && entry.cap.status !== 'Cancelled').length;

    return { overdue, dueSoon, open };
  }, [auditCapEntries]);
  const auditCapWindow = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime();
  }, []);

  if (!isAccessLoading && !isAllowed) {
    return <TenantLayoutDisabledState />;
  }

  const getStatusBadgeVariant = (status: UnifiedTask['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Completed':
      case 'Closed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getSourceBadgeClassName = (sourceType: UnifiedTask['sourceType']) => {
    switch (sourceType) {
      case 'Gap Analysis':
        return 'border-primary/30 bg-primary/10 text-primary';
      case 'Audit':
        return 'border-slate-300 bg-slate-50 text-slate-700';
      case 'Safety Report':
        return 'border-amber-300 bg-amber-50 text-amber-700';
      case 'MOC':
      default:
        return 'border-input bg-background text-foreground';
    }
  };

  const renderTasksTable = (tasks: UnifiedTask[]) => (
    <ResponsiveCardGrid
      items={tasks}
      isLoading={false}
      className="p-4"
      gridClassName="sm:grid-cols-2 xl:grid-cols-3"
      renderItem={(task) => (
          <Card
            key={task.id}
            className={cn(
              "overflow-hidden border shadow-none transition-shadow hover:shadow-sm",
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">{task.description}</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {task.sourceType} - {task.sourceIdentifier}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant="outline" className={cn('text-[9px] font-black uppercase py-0.5 px-3', getSourceBadgeClassName(task.sourceType))}>
                  {task.sourceType}
                </Badge>
              <Badge variant={getStatusBadgeVariant(task.status)} className="text-[10px] font-black uppercase py-0.5 px-3">
                {task.status}
              </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Assignee</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{task.assigneeName}</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Do by</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{format(parseLocalDate(task.dueDate), 'dd MMM yy')}</p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <ViewActionButton href={task.link} />
            </div>
          </CardContent>
        </Card>
      )}
      emptyState={(
        <div className="h-24 text-center flex items-center justify-center text-muted-foreground text-[10px] uppercase font-black tracking-widest bg-muted/5">
          No outstanding tasks for this organization.
        </div>
      )}
    />
  );

  const renderCapBoard = (entries: AuditCapEntry[]) => {
    if (entries.length === 0) return null;

    const dueSoonWindow = new Date();
    dueSoonWindow.setDate(dueSoonWindow.getDate() + 7);
    const filteredCapEntries = entries.filter((entry) => {
      if (capFocusFilter === 'All') return true;
      if (capFocusFilter === 'Open') return entry.cap.status === 'Open';
      if (capFocusFilter === 'In Progress') return entry.cap.status === 'In Progress';
      if (capFocusFilter === 'Closed') return entry.cap.status === 'Closed' || entry.cap.status === 'Cancelled';
      const due = parseLocalDate(formatCapDueDate(entry.cap.dueDate || entry.audit.auditDate)).getTime();
      if (capFocusFilter === 'Overdue') {
        return due < auditCapWindow && entry.cap.status !== 'Closed' && entry.cap.status !== 'Cancelled';
      }
      if (capFocusFilter === 'Due Soon') {
        return due >= auditCapWindow && due <= dueSoonWindow.getTime() && entry.cap.status !== 'Closed' && entry.cap.status !== 'Cancelled';
      }
      if (capFocusFilter === 'Unassigned') {
        return !entry.cap.responsiblePersonId?.trim();
      }
      return true;
    });

    const sortEntries = (entriesToSort: AuditCapEntry[]) => [...entriesToSort].sort((a, b) => {
      const aOwner = getPersonnelDisplayName(personnel, a.cap.responsiblePersonId || '');
      const bOwner = getPersonnelDisplayName(personnel, b.cap.responsiblePersonId || '');
      const aDue = parseLocalDate(formatCapDueDate(a.cap.dueDate || a.audit.auditDate)).getTime();
      const bDue = parseLocalDate(formatCapDueDate(b.cap.dueDate || b.audit.auditDate)).getTime();
      if (capSortBy === 'Owner') {
        return aOwner.localeCompare(bOwner) || aDue - bDue;
      }
      return aDue - bDue || aOwner.localeCompare(bOwner);
    });

    const groupedEntries = sortEntries(filteredCapEntries).reduce<Record<string, AuditCapEntry[]>>((acc, entry) => {
      const key = entry.audit.id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});

    return (
      <div className="space-y-4 p-4">
        <div className="rounded-lg border border-card-border bg-background/70 overflow-hidden">
          <div className="sticky top-0 z-10 border-b border-card-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Audit Corrective Actions</p>
                <p className="text-sm font-medium text-muted-foreground">Track CAP ownership and movement through the corrective action lifecycle.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCapBoardCollapsed((value) => !value)}
                  className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.08em]"
                >
                  {isCapBoardCollapsed ? 'Expand Board' : 'Collapse Board'}
                </Button>
                <div className="flex items-center gap-2 rounded-lg border border-card-border bg-muted/20 p-1">
                  {(['Due Date', 'Owner'] as const).map((sortMode) => (
                    <Button
                      key={sortMode}
                      type="button"
                      variant={capSortBy === sortMode ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCapSortBy(sortMode)}
                      className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.08em]"
                    >
                      {sortMode}
                    </Button>
                  ))}
                </div>
                {(['All', 'Open', 'In Progress', 'Closed', 'Overdue', 'Due Soon', 'Unassigned'] as const).map((filter) => (
                  <Button
                    key={filter}
                    type="button"
                    variant={capFocusFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCapFocusFilter(filter)}
                    className="h-7 px-3 text-[10px] font-black uppercase tracking-[0.08em]"
                  >
                    {filter}
                  </Button>
                ))}
                <Badge variant="outline" className="h-6 border-amber-300 bg-amber-50 px-2 text-[10px] font-black uppercase tracking-[0.08em] text-amber-700">
                  {filteredCapEntries.length} Tasks
                </Badge>
              </div>
            </div>
          </div>
          <div className="p-4">
            {!isCapBoardCollapsed ? (
              Object.keys(groupedEntries).length > 0 ? (
                <Accordion type="multiple" defaultValue={Object.keys(groupedEntries)} className="space-y-3">
                  {Object.entries(groupedEntries).map(([auditId, groupEntries]) => {
                    const audit = groupEntries[0].audit;
                    const openCount = groupEntries.filter((entry) => entry.cap.status !== 'Closed' && entry.cap.status !== 'Cancelled').length;
                    return (
                      <AccordionItem key={auditId} value={auditId} className="overflow-hidden rounded-lg border border-card-border bg-background">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex w-full items-center justify-between gap-3 text-left">
                            <div className="min-w-0">
                              <p className="text-sm font-black uppercase tracking-tight">Audit #{audit.auditNumber}</p>
                              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {groupEntries.length} task{groupEntries.length === 1 ? '' : 's'} · {openCount} open
                              </p>
                            </div>
                            <div className="flex items-center gap-2 pr-2">
                              <Badge variant="outline" className="h-6 border-card-border bg-background px-2 text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
                                {audit.status}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="border-t bg-muted/10 px-3 py-3">
                          <div className="space-y-2">
                            {groupEntries.map((entry) => {
                              const capDueDate = formatCapDueDate(entry.cap.dueDate || entry.audit.auditDate);
                              const dueDateValue = parseLocalDate(capDueDate).getTime();
                              const isOverdue = dueDateValue < auditCapWindow && entry.cap.status !== 'Closed' && entry.cap.status !== 'Cancelled';
                              const capOwnerLabel = getCapOwnerLabel(personnel, entry.cap);
                              const { openActions, names: actionAssignees, summary: actionAssigneeSummary } = getOpenCapActionAssignees(personnel, entry.cap);
                              const nearestActionDueDate = [...openActions]
                                .sort((left, right) => parseLocalDate(formatCapDueDate(left.deadline)).getTime() - parseLocalDate(formatCapDueDate(right.deadline)).getTime())[0]?.deadline;
                              const dueLabel = nearestActionDueDate
                                ? format(parseLocalDate(formatCapDueDate(nearestActionDueDate)), 'dd MMM yy')
                                : format(parseLocalDate(capDueDate), 'dd MMM yy');

                              return (
                                <div key={entry.cap.id} className="overflow-hidden rounded-lg border border-card-border bg-background">
                                  <div className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
                                    <div className="flex min-w-0 items-start gap-3">
                                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                      <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Badge variant="outline" className="h-6 border-card-border bg-background px-2 text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
                                            {entry.cap.status}
                                          </Badge>
                                          <Badge variant="outline" className="h-6 border-card-border bg-background px-2 text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
                                            {entry.findingLevel}
                                          </Badge>
                                          {isOverdue ? (
                                            <Badge variant="destructive" className="h-6 px-2 text-[10px] font-black uppercase tracking-[0.08em]">
                                              Overdue
                                            </Badge>
                                          ) : null}
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Observation</p>
                                          <p className="text-sm font-medium text-foreground">{entry.observation}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="grid shrink-0 gap-2 text-right sm:grid-cols-3 sm:text-left">
                                      <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">CAP Owner</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">{capOwnerLabel}</p>
                                      </div>
                                      <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Action Assignees</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">{actionAssigneeSummary}</p>
                                        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                          {openActions.length} open action{openActions.length === 1 ? '' : 's'}{actionAssignees.length > 0 ? ` · ${actionAssignees.length} assignee${actionAssignees.length === 1 ? '' : 's'}` : ''}
                                        </p>
                                      </div>
                                      <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Next Due</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">{dueLabel}</p>
                                      </div>
                                      <div className="sm:col-span-3 sm:flex sm:justify-end sm:gap-2">
                                        {canDeleteCaps ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={async () => {
                                              if (!window.confirm('Delete this corrective action plan? This cannot be undone.')) return;
                                              try {
                                                const response = await fetch(`/api/corrective-action-plans?id=${encodeURIComponent(entry.cap.id)}`, { method: 'DELETE' });
                                                if (!response.ok) {
                                                  const payload = await response.json().catch(() => null);
                                                  throw new Error(payload?.error || 'Failed to delete corrective action plan.');
                                                }
                                                window.dispatchEvent(new Event('safeviate-quality-updated'));
                                                toast({
                                                  title: 'Corrective Action Deleted',
                                                  description: 'The corrective action plan was removed.',
                                                });
                                              } catch (error) {
                                                toast({
                                                  variant: 'destructive',
                                                  title: 'Delete Failed',
                                                  description: error instanceof Error ? error.message : 'Failed to delete corrective action plan.',
                                                });
                                              }
                                            }}
                                          >
                                            Delete
                                          </Button>
                                        ) : null}
                                        <Button asChild variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase">
                                          <Link href={`/quality/task-tracker/${entry.cap.id}`}>Open Task</Link>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <div className="rounded-lg border border-dashed border-card-border bg-muted/5 px-3 py-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  No items
                </div>
              )
            ) : (
              <div className="rounded-lg border border-dashed border-card-border bg-muted/5 px-3 py-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Board collapsed
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOrgCard = (orgId: string | 'internal') => {
    const filteredTasks = allTasks.filter((task) => (orgId === 'internal' ? !task.organizationId : task.organizationId === orgId));
    const filteredAuditCaps = auditCapEntries.filter((entry) => (orgId === 'internal' ? !entry.audit.organizationId : entry.audit.organizationId === orgId));
    const remainingTasks = filteredTasks;
    const headerBandBorderStyle = { borderBottomColor: 'hsl(var(--card-border))' };

    return (
      <Card className="min-h-[400px] flex h-full flex-1 flex-col overflow-hidden shadow-none border">
        {shouldShowOrganizationTabs && (
          <div className="w-full border-b border-border px-4 py-3" style={headerBandBorderStyle}>
            <OrganizationTabsRow
              organizations={organizations || []}
              activeTab={activeOrgTab}
              onTabChange={setActiveOrgTab}
              className="border-0 bg-transparent px-0 py-0 shrink-0"
            />
          </div>
        )}
        <CardContent className="flex-1 min-h-0 p-0 bg-muted/5 overflow-hidden">
          <div className={cn('flex h-full min-h-0 flex-col overflow-y-auto', isMobile ? 'touch-pan-y' : '')}>
            {filteredAuditCaps.length > 0 ? renderCapBoard(filteredAuditCaps) : null}
            {remainingTasks.length > 0 ? (
              <div className="space-y-4 p-4">
                <div className="rounded-lg border border-card-border bg-background/70 overflow-hidden">
                  <div className="border-b border-card-border bg-muted/20 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Other Tasks</p>
                        <p className="text-sm font-medium text-muted-foreground">Supporting work that sits alongside the audit corrective actions.</p>
                      </div>
                      <Badge variant="outline" className="h-6 border-slate-300 bg-slate-50 px-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-700">
                        {remainingTasks.length} Tasks
                      </Badge>
                    </div>
                  </div>
                  {renderTasksTable(remainingTasks)}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto w-full space-y-6 px-1 pt-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const showTabs = shouldShowOrganizationTabs;

  return (
    <div className={cn(
      'max-w-[1100px] mx-auto w-full flex flex-col gap-6 px-1 pt-4 pb-6 min-h-0',
      isMobile ? 'min-h-0 overflow-y-auto' : 'h-full overflow-hidden'
    )}>
      <Card className="border shadow-none overflow-hidden">
        <CardHeader className="border-b bg-muted/20 px-4 py-3">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Corrective Action Snapshot</p>
            <p className="text-sm font-medium text-muted-foreground">A project-style view of audit CAP ownership and deadlines.</p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 py-4 sm:grid-cols-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Open CAPs</p>
            <p className="mt-1 text-2xl font-black text-amber-950">{auditCapSnapshot.open}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Due Soon</p>
            <p className="mt-1 text-2xl font-black text-amber-950">{auditCapSnapshot.dueSoon}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-700">Overdue</p>
            <p className="mt-1 text-2xl font-black text-red-950">{auditCapSnapshot.overdue}</p>
          </div>
        </CardContent>
      </Card>
      {!showTabs ? (
        renderOrgCard(scopedOrganizationId)
      ) : (
        <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className={cn('w-full flex-1 min-h-0 flex flex-col', isMobile ? 'overflow-visible' : 'overflow-hidden')}>
          <div className={cn('flex-1 min-h-0', isMobile ? 'overflow-visible' : 'overflow-hidden')}>
            <TabsContent value="internal" className={cn('m-0 h-full flex min-h-0 flex-col p-0', isMobile ? 'min-h-0' : 'min-h-0')}>
              {renderOrgCard('internal')}
            </TabsContent>

            {(organizations || []).map((org) => (
              <TabsContent key={org.id} value={org.id} className={cn('m-0 h-full flex min-h-0 flex-col p-0', isMobile ? 'min-h-0' : 'min-h-0')}>
                {renderOrgCard(org.id)}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}
    </div>
  );
}
