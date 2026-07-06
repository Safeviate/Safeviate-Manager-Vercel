'use client';

import Link from 'next/link';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { CorrectiveAction } from '@/types/safety-report';
import type { CorrectiveActionPlan, CorrectiveActionPlanEvidence, CorrectiveActionPlanResponse, QualityAudit, QualityFinding } from '@/types/quality';

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};

const formatCapDueDate = (value?: string) => {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
};

const toNoonUtcIso = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString();

export const parseCapObservation = (finding?: QualityFinding) =>
  finding?.comment?.trim()
  || finding?.gapDescription?.trim()
  || finding?.actionPlan?.trim()
  || finding?.currentState?.trim()
  || finding?.desiredState?.trim()
  || 'No observation recorded.';

export const parseCapFindingLevel = (finding?: QualityFinding) => finding?.level?.trim() || 'Unclassified';

interface CapTaskDetailCardProps {
  cap: CorrectiveActionPlan;
  audit: QualityAudit;
  observation: string;
  findingLevel: string;
  personnel: Personnel[];
  currentUserId?: string;
  currentUserName?: string;
  rolePermissions?: string[];
  hideInlineSave?: boolean;
  hideLeadSummary?: boolean;
}

export interface CapTaskDetailCardHandle {
  save: () => Promise<void>;
}

export const CapTaskDetailCard = forwardRef<CapTaskDetailCardHandle, CapTaskDetailCardProps>(function CapTaskDetailCard(
  { cap, audit, observation, findingLevel, personnel, currentUserId, currentUserName, rolePermissions = [], hideInlineSave = false, hideLeadSummary = false }: CapTaskDetailCardProps,
  ref,
) {
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
  const canManageCapResponses = Boolean(
    currentUserId
    && (
      currentUserId === responsiblePersonId
      || actions.some((action) => action.responsiblePersonId === currentUserId)
      || rolePermissions.includes('*')
      || rolePermissions.includes('quality')
      || rolePermissions.includes('quality-tasks-manage')
      || rolePermissions.includes('quality-caps-manage')
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

  useImperativeHandle(ref, () => ({
    save: saveCap,
  }), [saveCap]);

  const addResponse = () => {
    if (!canManageCapResponses) {
      toast({
        variant: 'destructive',
        title: 'Not Allowed',
        description: 'Only the assigned CAP owner or a quality manager can add responses.',
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
    <div className="space-y-4">
      <div className="rounded-lg border border-card-border bg-muted/10 p-3 shadow-none">
        {!hideLeadSummary ? (
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
        ) : null}

        <div className={hideLeadSummary ? "grid gap-3 lg:grid-cols-2" : "mt-4 grid gap-3 lg:grid-cols-2"}>
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
                <Button type="button" variant="outline" className="w-full justify-between bg-background text-left font-normal">
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
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10" onClick={() => removeCapAction(action.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Action</p>
                      <Input value={action.description} onChange={(event) => updateCapAction(action.id, 'description', event.target.value)} placeholder="Describe this responsibility entry..." className="bg-background" />
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
                          <Button type="button" variant="outline" className="w-full justify-between bg-background text-left font-normal lg:min-w-[150px]">
                            <span>{action.deadline ? format(parseLocalDate(formatCapDueDate(action.deadline)), 'dd MMM yy') : 'Pick a date'}</span>
                            <CalendarIcon className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CustomCalendar selectedDate={action.deadline ? parseLocalDate(formatCapDueDate(action.deadline)) : undefined} onDateSelect={(date) => updateCapAction(action.id, 'deadline', toNoonUtcIso(date))} />
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

        {!hideInlineSave ? (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={saveCap} disabled={isSaving}>
              Save CAP
            </Button>
          </div>
        ) : null}

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
                  { id: crypto.randomUUID(), name: document.name, url: document.url, uploadDate: document.uploadDate },
                ]);
              }}
            />
          </div>

          <div className="mt-3 space-y-3">
            <Textarea value={responseDraft} onChange={(event) => setResponseDraft(event.target.value)} placeholder="Add a response update for this corrective action plan..." className="min-h-11 bg-background" disabled={!canManageCapResponses} />
            {!canManageCapResponses ? <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">Only the assigned CAP owner or a quality manager can post responses and upload evidence.</div> : null}
            {draftEvidence.length > 0 ? (
              <div className="space-y-2">
                {draftEvidence.map((document) => (
                  <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2">
                    <div className="min-w-0">
                      <a href={document.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-foreground underline decoration-slate-300 underline-offset-4">{document.name}</a>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Uploaded {format(new Date(document.uploadDate), 'dd MMM yyyy')}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10" onClick={() => setDraftEvidence((current) => current.filter((item) => item.id !== document.id))}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end">
              <div className="flex items-center gap-2">
                {editingResponseId ? <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingResponseId(null); setEditingResponseMeta(null); setResponseDraft(''); setDraftEvidence([]); }}>Cancel Edit</Button> : null}
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
          {responses.length > 0 ? responses.map((response) => (
            <div key={response.id} className="rounded-lg border border-card-border bg-background px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{response.createdByName || 'Unknown user'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{format(new Date(response.createdAt), 'dd MMM yyyy HH:mm')}</p>
                  {canManageCapResponses ? (
                    <>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase" onClick={() => beginEditResponse(response)}>Edit</Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10" onClick={() => removeResponse(response.id)}>Remove</Button>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{response.message || 'Evidence uploaded without a written response.'}</p>
              {response.evidence && response.evidence.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {response.evidence.map((document) => (
                    <a key={document.id} href={document.url} target="_blank" rel="noreferrer" className="block rounded-md border bg-muted/10 px-3 py-2 text-sm font-semibold text-foreground underline decoration-slate-300 underline-offset-4">
                      {document.name}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
              No CAP responses have been added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
