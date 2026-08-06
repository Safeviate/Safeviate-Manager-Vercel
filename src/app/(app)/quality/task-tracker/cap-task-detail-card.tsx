'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Pencil, Save, Trash2 } from 'lucide-react';
import { CardControlHeader, HEADER_ACTION_BUTTON_CLASS, HEADER_COMPACT_CONTROL_CLASS } from '@/components/page-header';
import type { Personnel } from '@/app/(app)/users/personnel/page';
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

const hasSavedPrimaryCorrectiveAction = (cap: CorrectiveActionPlan) =>
  Boolean(cap.rootCauseAnalysis?.trim());

const getDefaultResponsiblePersonId = (cap: CorrectiveActionPlan, audit: QualityAudit) =>
  cap.responsiblePersonId?.trim() || audit.auditeeId?.trim() || '';

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
  findingLevel: string;
  personnel: Personnel[];
  currentUserId?: string;
  currentUserName?: string;
  rolePermissions?: string[];
  hideLeadSummary?: boolean;
  onDeleteCap?: (() => void) | null;
  onSaved?: ((cap: CorrectiveActionPlan) => void) | null;
  canDeleteCap?: boolean;
  isDeletingCap?: boolean;
}

export interface CapTaskDetailCardHandle {
  save: () => Promise<CorrectiveActionPlan | null>;
}

export const CapTaskDetailCard = forwardRef<CapTaskDetailCardHandle, CapTaskDetailCardProps>(function CapTaskDetailCard(
  { cap, audit, findingLevel, personnel, currentUserId, currentUserName, rolePermissions = [], hideLeadSummary = false, onDeleteCap = null, onSaved = null, canDeleteCap = false, isDeletingCap = false }: CapTaskDetailCardProps,
  ref,
) {
  const { toast } = useToast();
  const correctiveActionRef = useRef<HTMLTextAreaElement | null>(null);
  const responseRef = useRef<HTMLTextAreaElement | null>(null);
  const hasSavedPrimaryAction = hasSavedPrimaryCorrectiveAction(cap);
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState(hasSavedPrimaryAction ? (cap.rootCauseAnalysis || '') : '');
  const [responsiblePersonId, setResponsiblePersonId] = useState(getDefaultResponsiblePersonId(cap, audit));
  const [dueDate, setDueDate] = useState(hasSavedPrimaryAction ? formatCapDueDate(cap.dueDate || audit.auditDate) : '');
  const [responses, setResponses] = useState<CorrectiveActionPlanResponse[]>(cap.responses || []);
  const [responseDraft, setResponseDraft] = useState('');
  const [draftEvidence, setDraftEvidence] = useState<CorrectiveActionPlanEvidence[]>([]);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingResponseMeta, setEditingResponseMeta] = useState<Pick<CorrectiveActionPlanResponse, 'createdAt' | 'createdById' | 'createdByName'> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const hasQualityManagementPermission =
    rolePermissions.includes('*')
    || rolePermissions.includes('admin-view')
    || rolePermissions.includes('quality-caps-manage');
  const canManageCapResponses = Boolean(
    currentUserId
    && (
      currentUserId === responsiblePersonId
      || hasQualityManagementPermission
    )
  );
  const hasUnsavedDescription = rootCauseAnalysis.trim() !== (cap.rootCauseAnalysis?.trim() || '');
  useEffect(() => {
    const shouldShowPrimaryAssignment = hasSavedPrimaryCorrectiveAction(cap);
    setRootCauseAnalysis(shouldShowPrimaryAssignment ? (cap.rootCauseAnalysis || '') : '');
    setResponsiblePersonId(getDefaultResponsiblePersonId(cap, audit));
    setDueDate(shouldShowPrimaryAssignment ? formatCapDueDate(cap.dueDate || audit.auditDate) : '');
    setResponses(cap.responses || []);
    setResponseDraft('');
    setDraftEvidence([]);
    setEditingResponseId(null);
    setEditingResponseMeta(null);
  }, [audit.auditDate, cap.dueDate, cap.id, cap.responsiblePersonId, cap.responses, cap.rootCauseAnalysis]);

  useEffect(() => {
    const textarea = correctiveActionRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 44)}px`;
  }, [rootCauseAnalysis]);

  useEffect(() => {
    const textarea = responseRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 44)}px`;
  }, [responseDraft, isResponseOpen]);

  const saveCap = async (responsesOverride?: CorrectiveActionPlanResponse[]) => {
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
            actions: [],
            responses: responsesOverride || responses,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to save corrective action plan.');
      }
      const payload = await response.json().catch(() => null);
      const savedCap = payload?.cap as CorrectiveActionPlan | undefined;
      window.dispatchEvent(new Event('safeviate-quality-updated'));
      toast({
        title: 'Corrective Action Saved',
        description: 'The corrective action has been updated.',
      });
      if (savedCap) {
        onSaved?.(savedCap);
      }
      return savedCap || null;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save corrective action.',
      });
      return null;
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
        description: 'Only the assigned CAP owner or a user with quality management permissions can add responses.',
      });
      return null;
    }

    const message = responseDraft.trim();
    if (!message && draftEvidence.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Response Entered',
        description: 'Add a response note or attach evidence before adding a CAP reply.',
      });
      return null;
    }

    const nextResponse: CorrectiveActionPlanResponse = {
      id: editingResponseId || crypto.randomUUID(),
      message,
      createdAt: editingResponseMeta?.createdAt || new Date().toISOString(),
      createdById: editingResponseMeta?.createdById || currentUserId,
      createdByName: editingResponseMeta?.createdByName || currentUserName || 'Unknown user',
      evidence: draftEvidence,
    };

    const nextResponses = [nextResponse, ...responses.filter((item) => item.id !== nextResponse.id)];
    setResponses(nextResponses);
    setResponseDraft('');
    setDraftEvidence([]);
    setEditingResponseId(null);
    setEditingResponseMeta(null);
    return nextResponses;
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
  };

  const removeResponse = (responseId: string) => {
    const nextResponses = responses.filter((item) => item.id !== responseId);
    setResponses(nextResponses);
    return nextResponses;
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-card-border bg-background shadow-none">
        {!hideLeadSummary ? (
          <CardControlHeader
            className="flex w-full shrink-0 flex-col bg-[hsl(var(--card-header-band-background))]"
            isMobile={false}
            context={(
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Corrective Action</p>
                <p className="text-[11px] font-medium leading-3.5 text-muted-foreground">Manage this corrective action, its assignee feedback, and supporting evidence.</p>
              </div>
            )}
            actions={(
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {canDeleteCap && onDeleteCap ? (
                  <Button type="button" variant="outline" className={HEADER_COMPACT_CONTROL_CLASS} onClick={onDeleteCap} disabled={isDeletingCap}>
                    {isDeletingCap ? 'Deleting...' : 'Delete CAP'}
                  </Button>
                ) : null}
                <Button type="button" variant="default" className={HEADER_ACTION_BUTTON_CLASS} onClick={() => void saveCap()} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save CAP'}
                </Button>
              </div>
            )}
            navigation={(
              <div className="flex min-h-10 flex-wrap items-center justify-start gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="h-7 rounded-md border-card-border bg-background px-2.5 text-[9px] font-black uppercase tracking-[0.08em] text-foreground">
                    {cap.status}
                  </Badge>
                  <div className="flex h-7 items-center gap-1.5 rounded-md border border-card-border bg-background px-2.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.08em] text-muted-foreground">Assigned To</span>
                    <Select value={responsiblePersonId || ''} onValueChange={(value) => setResponsiblePersonId(value === '__unassigned__' ? '' : value)}>
                      <SelectTrigger className="h-6 w-[190px] min-w-[190px] border-0 bg-transparent px-1 py-0 text-[10px] font-semibold shadow-none ring-0 focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="Unassigned" />
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
                  <div className="flex h-7 items-center gap-1.5 rounded-md border border-card-border bg-background px-2.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.08em] text-muted-foreground">Due</span>
                    <Popover open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" className="h-6 min-w-[115px] justify-between px-1 py-0 text-[10px] font-semibold shadow-none hover:bg-transparent hover:text-foreground">
                          <span>{dueDate ? format(parseLocalDate(dueDate), 'dd MMM yy') : 'Pick a date'}</span>
                          <CalendarIcon className="h-3.5 w-3.5 opacity-50" />
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
                  {hasUnsavedDescription ? <span className="px-1 text-[9px] font-black uppercase tracking-[0.08em] text-amber-700">Unsaved changes</span> : null}
                  <Button type="button" variant="outline" className={HEADER_COMPACT_CONTROL_CLASS} onClick={() => void saveCap()} disabled={isSaving || !rootCauseAnalysis.trim() || !hasUnsavedDescription}>
                    <Save className="h-3.5 w-3.5" />
                    Save Description
                  </Button>
                  <Button type="button" variant="outline" className={HEADER_COMPACT_CONTROL_CLASS} onClick={() => setIsResponseOpen((current) => !current)} disabled={!canManageCapResponses}>
                      Add Response
                  </Button>
                </div>
              </div>
            )}
          />
        ) : null}

        <div className={hideLeadSummary ? "grid gap-3 p-3" : "grid gap-3 p-3"}>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Corrective Action Description</p>
            <Textarea
              ref={correctiveActionRef}
              value={rootCauseAnalysis}
              onChange={(event) => setRootCauseAnalysis(event.target.value)}
              rows={1}
              placeholder="Describe the corrective action assigned to this finding..."
              className="min-h-11 resize-none overflow-hidden bg-background"
            />
          </div>
        </div>

        {isResponseOpen ? (
          <div className="mx-3 mb-3 rounded-md border border-card-border bg-muted/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Corrective Action Response</p>
                <p className="text-[11px] leading-4 text-muted-foreground">Add a progress note or implementation update for this corrective action.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setIsResponseOpen(false); setResponseDraft(''); setEditingResponseId(null); setEditingResponseMeta(null); setDraftEvidence([]); }}>
                Cancel
              </Button>
            </div>
            <Textarea
              ref={responseRef}
              rows={1}
              value={responseDraft}
              onChange={(event) => setResponseDraft(event.target.value)}
              placeholder="Enter a response..."
              className="mt-3 min-h-11 resize-none overflow-hidden bg-background"
              disabled={!canManageCapResponses}
              autoFocus
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant="default"
                disabled={!canManageCapResponses || !responseDraft.trim()}
                onClick={async () => {
                  const nextResponses = addResponse();
                  if (nextResponses) {
                    const savedCap = await saveCap(nextResponses);
                    if (savedCap) setIsResponseOpen(false);
                  }
                }}
              >
                Add Response
              </Button>
            </div>
          </div>
        ) : null}

        {responses.length > 0 ? (
          <div className="mx-3 mb-3 space-y-2">
            {responses.map((response, index) => (
              <div key={response.id} className="rounded-md border border-card-border bg-background px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Corrective Action Response {responses.length - index}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {response.createdByName || 'Unknown user'} · {format(new Date(response.createdAt), 'dd MMM yyyy HH:mm')}
                    </p>
                    {canManageCapResponses ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => { beginEditResponse(response); setIsResponseOpen(true); }}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            const previousResponses = responses;
                            const nextResponses = removeResponse(response.id);
                            const savedCap = await saveCap(nextResponses);
                            if (!savedCap) setResponses(previousResponses);
                          }}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{response.message || 'Evidence uploaded without a written response.'}</p>
              </div>
            ))}
          </div>
        ) : null}

      </div>
    </div>
  );
});
