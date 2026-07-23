'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteActionButton } from '@/components/record-action-buttons';
import { useToast } from '@/hooks/use-toast';
import type {
  CorrectiveAction,
  CorrectiveActionStatus,
  ReportHazard,
  RiskAssessment,
  SafetyReport,
} from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { CalendarIcon, CheckCircle2, MailWarning, PlusCircle, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CARD_COMPACT_HEADER_BAND_CLASS, HEADER_ACTION_BUTTON_CLASS } from '@/components/page-header';

const mitigationReviewSchema = z.object({
  hazardId: z.string(),
  riskId: z.string(),
  mitigationId: z.string(),
  mitigationDescription: z.string().default(''),
  responsiblePersonId: z.string().optional(),
  completionDate: z.date().nullable().optional(),
  status: z.enum(['Open', 'In Progress', 'Closed', 'Cancelled']),
  residualLikelihood: z.number().min(1).max(5),
  residualSeverity: z.number().min(1).max(5),
});

const reviewSchema = z.object({
  mitigationReviews: z.array(mitigationReviewSchema),
  riskAcceptance: z.object({
    decision: z.enum(['Acceptable', 'Tolerable With Controls', 'Unacceptable']).optional(),
    rationale: z.string().default(''),
  }).optional(),
  independentActions: z.array(z.object({
    id: z.string(),
    source: z.enum(['Investigation Finding', 'Root Cause', 'Human Factors', 'Immediate Containment', 'Other']),
    description: z.string().min(1, 'Describe the corrective action.'),
    responsiblePersonId: z.string().optional(),
    deadline: z.date().nullable().optional(),
    status: z.enum(['Open', 'In Progress', 'Closed', 'Cancelled']),
  })),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

type FlattenedMitigation = {
  hazardId: string;
  hazardDescription: string;
  riskId: string;
  riskDescription: string;
  riskAssessment: RiskAssessment;
  mitigationId: string;
  mitigationDescription: string;
  mitigationResidualRiskAssessment: RiskAssessment;
  reviewAction?: CorrectiveAction;
  isRiskFallback?: boolean;
  isDraft?: boolean;
};

const independentActionSources = ['Investigation Finding', 'Root Cause', 'Human Factors', 'Immediate Containment', 'Other'] as const;

const isIndependentAction = (action: CorrectiveAction, mitigationIds: Set<string>) =>
  !mitigationIds.has(action.id) && Boolean(action.source && !['Risk Mitigation', 'Risk Control'].includes(action.source));

const parseLocalDate = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return new Date(year, month - 1, day, 12);
};

const toNoonUtcIso = (date?: Date | null) =>
  date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString() : null;

const isOverdueAction = (action: CorrectiveAction) =>
  !['Closed', 'Cancelled'].includes(action.status)
  && Boolean(action.deadline)
  && !Number.isNaN(new Date(action.deadline).getTime())
  && new Date(action.deadline).getTime() < Date.now();

const getRiskScoreColor = (
  likelihood: number,
  severity: number,
  colors?: Record<string, string>,
): { backgroundColor: string; color: string } => {
  const severityToLetter: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
  const configuredColor = colors?.[`${likelihood}${severityToLetter[severity] || 'E'}`];
  const score = likelihood * severity;
  const backgroundColor = configuredColor || (score > 9 ? '#ef4444' : score > 4 ? '#f59e0b' : '#10b981');
  const hex = backgroundColor.replace('#', '');
  const red = parseInt(hex.substring(0, 2), 16);
  const green = parseInt(hex.substring(2, 4), 16);
  const blue = parseInt(hex.substring(4, 6), 16);
  const yiq = ((red * 299) + (green * 587) + (blue * 114)) / 1000;

  return {
    backgroundColor,
    color: yiq >= 128 ? '#000000' : '#ffffff',
  };
};

const normalizeRiskAssessment = (assessment?: Partial<RiskAssessment> | null): RiskAssessment => {
  const likelihood = Number(assessment?.likelihood) || 1;
  const severity = Number(assessment?.severity) || 1;
  const riskScore = likelihood * severity;
  const riskLevel = riskScore <= 4 ? 'Low' : riskScore <= 9 ? 'Medium' : riskScore <= 16 ? 'High' : 'Critical';

  return { likelihood, severity, riskScore, riskLevel };
};

const likelihoodLabels: Record<number, string> = {
  5: 'Frequent',
  4: 'Occasional',
  3: 'Remote',
  2: 'Improbable',
  1: 'Ext. Improbable',
};

const severityLabels: Record<number, { letter: string; name: string }> = {
  5: { letter: 'A', name: 'Catastrophic' },
  4: { letter: 'B', name: 'Hazardous' },
  3: { letter: 'C', name: 'Major' },
  2: { letter: 'D', name: 'Minor' },
  1: { letter: 'E', name: 'Negligible' },
};

const flattenMitigations = (hazards: ReportHazard[] = [], correctiveActions: CorrectiveAction[] = []): FlattenedMitigation[] =>
  hazards.flatMap((hazard) =>
    (hazard.risks || []).flatMap<FlattenedMitigation>((risk) => {
      const mitigations = risk.mitigations || [];
      if (mitigations.length > 0) {
        return mitigations.map((mitigation) => ({
          hazardId: hazard.id,
          hazardDescription: hazard.description,
          riskId: risk.id,
          riskDescription: risk.description,
          riskAssessment: normalizeRiskAssessment(risk.riskAssessment),
          mitigationId: mitigation.id,
          mitigationDescription: mitigation.description,
          mitigationResidualRiskAssessment: normalizeRiskAssessment(mitigation.residualRiskAssessment),
          reviewAction: correctiveActions.find((action) => action.id === mitigation.id),
          isRiskFallback: false,
        }));
      }

      const reviewAction = correctiveActions.find(
        (action) => action.hazardId === hazard.id && action.riskId === risk.id,
      );
      const fallbackResidual = normalizeRiskAssessment(risk.riskAssessment);

      return [{
        hazardId: hazard.id,
        hazardDescription: hazard.description,
        riskId: risk.id,
        riskDescription: risk.description,
        riskAssessment: normalizeRiskAssessment(risk.riskAssessment),
        mitigationId: reviewAction?.id || risk.id,
        mitigationDescription: reviewAction?.description || '',
        mitigationResidualRiskAssessment: fallbackResidual,
        reviewAction,
        isRiskFallback: true,
      }];
    })
  );

interface CorrectiveActionsFormProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
  riskMatrixColors?: Record<string, string>;
  isStacked?: boolean;
  onReportSaved?: (report: SafetyReport) => void;
}

export function CorrectiveActionsForm({
  report,
  tenantId,
  personnel,
  riskMatrixColors,
  isStacked = false,
  onReportSaved,
}: CorrectiveActionsFormProps) {
  const { toast } = useToast();
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const [escalatingActionId, setEscalatingActionId] = useState<string | null>(null);
  const mitigationItems = useMemo(
    () => flattenMitigations(report.initialHazards || [], report.correctiveActions || []),
    [report.initialHazards, report.correctiveActions]
  );
  const independentActions = useMemo(() => {
    const mitigationIds = new Set(mitigationItems.map((item) => item.mitigationId));
    return (report.correctiveActions || []).filter((action) => isIndependentAction(action, mitigationIds));
  }, [mitigationItems, report.correctiveActions]);
  const overdueActions = useMemo(
    () => (report.correctiveActions || []).filter(isOverdueAction),
    [report.correctiveActions],
  );

  const escalateOverdueAction = async (actionId: string) => {
    if (escalatingActionId) return;
    setEscalatingActionId(actionId);
    try {
      const response = await fetch(`/api/safety-reports/${report.id}/actions/${actionId}/escalate`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to send the overdue action escalation.');
      if (payload?.report) onReportSaved?.(payload.report as SafetyReport);
      toast({ title: 'Escalation sent', description: 'The assigned action owner has been emailed and the escalation was recorded in the report diary.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Escalation not sent', description: error instanceof Error ? error.message : 'Unable to send the overdue action escalation.' });
    } finally {
      setEscalatingActionId(null);
    }
  };

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      mitigationReviews: mitigationItems.map((item) => ({
        hazardId: item.hazardId,
        riskId: item.riskId,
        mitigationId: item.mitigationId,
        mitigationDescription: item.mitigationDescription,
        responsiblePersonId: item.reviewAction?.responsiblePersonId || '',
        completionDate: parseLocalDate(item.reviewAction?.deadline),
        status: item.reviewAction?.status || 'Open',
        residualLikelihood: item.mitigationResidualRiskAssessment.likelihood,
        residualSeverity: item.mitigationResidualRiskAssessment.severity,
      })),
      riskAcceptance: {
        decision: report.riskAcceptance?.decision,
        rationale: report.riskAcceptance?.rationale || '',
      },
      independentActions: independentActions.map((action) => ({
        id: action.id,
        source: (action.source && independentActionSources.includes(action.source as typeof independentActionSources[number])
          ? action.source
          : 'Investigation Finding') as typeof independentActionSources[number],
        description: action.description,
        responsiblePersonId: action.responsiblePersonId || '',
        deadline: parseLocalDate(action.deadline),
        status: action.status,
      })),
    },
  });

  useEffect(() => {
    form.reset({
      mitigationReviews: mitigationItems.map((item) => ({
        hazardId: item.hazardId,
        riskId: item.riskId,
        mitigationId: item.mitigationId,
        mitigationDescription: item.mitigationDescription,
        responsiblePersonId: item.reviewAction?.responsiblePersonId || '',
        completionDate: parseLocalDate(item.reviewAction?.deadline),
        status: item.reviewAction?.status || 'Open',
        residualLikelihood: item.mitigationResidualRiskAssessment.likelihood,
        residualSeverity: item.mitigationResidualRiskAssessment.severity,
      })),
      riskAcceptance: {
        decision: report.riskAcceptance?.decision,
        rationale: report.riskAcceptance?.rationale || '',
      },
      independentActions: independentActions.map((action) => ({
        id: action.id,
        source: (action.source && independentActionSources.includes(action.source as typeof independentActionSources[number])
          ? action.source
          : 'Investigation Finding') as typeof independentActionSources[number],
        description: action.description,
        responsiblePersonId: action.responsiblePersonId || '',
        deadline: parseLocalDate(action.deadline),
        status: action.status,
      })),
    });
  }, [form, independentActions, mitigationItems]);

  const { fields: mitigationReviewFields, append: appendMitigationReview, remove: removeMitigationReview } = useFieldArray({
    control: form.control,
    name: 'mitigationReviews',
  });
  const { fields: independentActionFields, append: appendIndependentAction, remove: removeIndependentAction } = useFieldArray({
    control: form.control,
    name: 'independentActions',
  });

  const reviewItems = useMemo(() => {
    const existingItems = new Map<string, FlattenedMitigation>(
      mitigationItems.map((item) => [`${item.hazardId}:${item.riskId}:${item.mitigationId}`, item]),
    );

    return mitigationReviewFields.map((review) => {
      const key = `${review.hazardId}:${review.riskId}:${review.mitigationId}`;
      const existingItem = existingItems.get(key);
      if (existingItem) return existingItem;

      const hazard = (report.initialHazards || []).find((candidate) => candidate.id === review.hazardId);
      const risk = hazard?.risks?.find((candidate) => candidate.id === review.riskId);
      const initialRisk = normalizeRiskAssessment(risk?.riskAssessment);

      return {
        hazardId: review.hazardId,
        hazardDescription: hazard?.description || 'Hazard',
        riskId: review.riskId,
        riskDescription: risk?.description || 'Risk',
        riskAssessment: initialRisk,
        mitigationId: review.mitigationId,
        mitigationDescription: review.mitigationDescription,
        mitigationResidualRiskAssessment: normalizeRiskAssessment({
          likelihood: review.residualLikelihood,
          severity: review.residualSeverity,
        }),
        isDraft: true,
      } satisfies FlattenedMitigation;
    });
  }, [mitigationItems, mitigationReviewFields, report.initialHazards]);

  const addCorrectiveAction = (hazardId: string, riskId: string) => {
    const risk = (report.initialHazards || [])
      .find((hazard) => hazard.id === hazardId)
      ?.risks?.find((candidate) => candidate.id === riskId);
    if (!risk) return;

    const initialRisk = normalizeRiskAssessment(risk.riskAssessment);
    appendMitigationReview({
      hazardId,
      riskId,
      mitigationId: uuidv4(),
      mitigationDescription: '',
      responsiblePersonId: '',
      completionDate: null,
      status: 'Open',
      residualLikelihood: initialRisk.likelihood,
      residualSeverity: initialRisk.severity,
    });
  };

  const onSubmit = async (values: ReviewFormValues) => {
    const reviewMap = new Map(
      values.mitigationReviews.map((review) => [`${review.hazardId}:${review.riskId}:${review.mitigationId}`, review] as const)
    );

    const nextHazards = (report.initialHazards || []).map((hazard) => ({
      ...hazard,
      risks: (hazard.risks || []).map((risk) => ({
        ...risk,
        mitigations: (risk.mitigations || []).map((mitigation) => {
          const review = reviewMap.get(`${hazard.id}:${risk.id}:${mitigation.id}`);
          if (!review) return mitigation;
          const residualRiskAssessment = normalizeRiskAssessment({
            ...mitigation.residualRiskAssessment,
            likelihood: review.residualLikelihood,
            severity: review.residualSeverity,
          });
          return {
            ...mitigation,
            description: review.mitigationDescription.trim(),
            residualRiskAssessment,
            responsiblePersonId: review.responsiblePersonId || undefined,
            completionDate: toNoonUtcIso(review.completionDate),
            status: review.status as CorrectiveActionStatus,
          };
        }),
      })),
    }));

    const nextHazardsWithFallbackDescriptions = nextHazards.map((hazard) => ({
      ...hazard,
      risks: (hazard.risks || []).map((risk) => {
        const reviewsForRisk = values.mitigationReviews.filter(
          (review) => review.hazardId === hazard.id && review.riskId === risk.id,
        );
        const existingMitigationIds = new Set((risk.mitigations || []).map((mitigation) => mitigation.id));
        const newMitigations = reviewsForRisk
          .filter((review) => !existingMitigationIds.has(review.mitigationId))
          .map((review) => ({
            id: review.mitigationId,
            description: review.mitigationDescription.trim(),
            residualRiskAssessment: normalizeRiskAssessment({
              likelihood: review.residualLikelihood,
              severity: review.residualSeverity,
            }),
          }));
        if (newMitigations.length === 0) return risk;
        return {
          ...risk,
          mitigations: [...(risk.mitigations || []), ...newMitigations],
        };
      }),
    }));

    const nextReport: SafetyReport = {
      ...report,
      initialHazards: nextHazardsWithFallbackDescriptions,
      riskAcceptance: values.riskAcceptance?.decision
        ? {
          ...report.riskAcceptance,
          decision: values.riskAcceptance.decision,
          rationale: values.riskAcceptance.rationale.trim(),
        }
        : null,
      correctiveActions: [
        ...values.mitigationReviews.map((review) => {
        const residual = normalizeRiskAssessment({
          likelihood: review.residualLikelihood,
          severity: review.residualSeverity,
        });
        return {
          id: review.mitigationId,
          description: review.mitigationDescription.trim(),
          responsiblePersonId: review.responsiblePersonId || '',
          hazardId: review.hazardId,
          riskId: review.riskId,
          riskAssessmentView: 'Residual',
          residualLikelihood: residual?.likelihood ?? null,
          residualSeverity: residual?.severity ?? null,
          residualRiskScore: residual?.riskScore ?? null,
          residualRiskLevel: residual?.riskLevel ?? null,
          deadline: toNoonUtcIso(review.completionDate) || new Date().toISOString(),
          status: review.status as CorrectiveActionStatus,
        } satisfies CorrectiveAction;
        }),
        ...values.independentActions.map((action) => ({
          id: action.id,
          description: action.description.trim(),
          responsiblePersonId: action.responsiblePersonId || '',
          source: action.source,
          deadline: toNoonUtcIso(action.deadline) || new Date().toISOString(),
          status: action.status as CorrectiveActionStatus,
        } satisfies CorrectiveAction)),
      ],
    };

    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: nextReport }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save corrective actions review.');
      }

      const payload = await response.json().catch(() => null);
      if (payload?.report) {
        onReportSaved?.(payload.report as SafetyReport);
      }

      toast({ title: 'Corrective Actions Review Saved' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save corrective actions review.',
      });
    }
  };

  const deleteCorrectiveAction = async (item: FlattenedMitigation) => {
    if (deletingActionId) return;

    setDeletingActionId(item.mitigationId);

    const nextReport: SafetyReport = {
      ...report,
      initialHazards: (report.initialHazards || []).map((hazard) => ({
        ...hazard,
        risks: (hazard.risks || []).map((risk) => ({
          ...risk,
          mitigations: (risk.mitigations || []).filter((mitigation) => mitigation.id !== item.mitigationId),
        })),
      })),
      correctiveActions: (report.correctiveActions || []).filter((action) => action.id !== item.mitigationId),
    };

    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: nextReport }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to delete corrective action.');
      }

      const payload = await response.json().catch(() => null);
      if (payload?.report) {
        onReportSaved?.(payload.report as SafetyReport);
      }

      toast({ title: 'Corrective action deleted' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete corrective action.',
      });
    } finally {
      setDeletingActionId(null);
    }
  };

  const removeCorrectiveAction = (item: FlattenedMitigation, index: number) => {
    if (item.isDraft) {
      removeMitigationReview(index);
      return;
    }
    void deleteCorrectiveAction(item);
  };

  return (
    <div className={cn('flex flex-col h-full', !isStacked && 'overflow-hidden')}>
      <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
        <h3 className="shrink-0 text-sm font-black uppercase tracking-tight">Corrective Actions</h3>
        <p className="truncate text-[10px] font-medium text-muted-foreground">
          After investigation, define controls, assess residual risk, and record the tolerability decision.
        </p>
        </div>
      </div>
      <div className={cn('flex-1 p-0 overflow-hidden flex flex-col', isStacked && 'overflow-visible h-auto')}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
            {isStacked ? (
              <div className="p-6 space-y-4">
                <OverdueActionEscalations actions={overdueActions} personnel={personnel} escalatingActionId={escalatingActionId} onEscalate={escalateOverdueAction} />
                <ReviewFields
                  items={reviewItems}
                  form={form}
                  personnel={personnel}
                  riskMatrixColors={riskMatrixColors}
                  onAddAction={addCorrectiveAction}
                  onDeleteAction={removeCorrectiveAction}
                />
                <TolerabilityDecisionFields form={form} />
                <IndependentActionFields
                  fields={independentActionFields}
                  form={form}
                  personnel={personnel}
                  onAdd={() => appendIndependentAction({ id: uuidv4(), source: 'Investigation Finding', description: '', responsiblePersonId: '', deadline: null, status: 'Open' })}
                  onRemove={removeIndependentAction}
                />
              </div>
            ) : (
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  <OverdueActionEscalations actions={overdueActions} personnel={personnel} escalatingActionId={escalatingActionId} onEscalate={escalateOverdueAction} />
                  <ReviewFields
                    items={reviewItems}
                    form={form}
                    personnel={personnel}
                    riskMatrixColors={riskMatrixColors}
                    onAddAction={addCorrectiveAction}
                    onDeleteAction={removeCorrectiveAction}
                  />
                  <TolerabilityDecisionFields form={form} />
                  <IndependentActionFields
                    fields={independentActionFields}
                    form={form}
                    personnel={personnel}
                    onAdd={() => appendIndependentAction({ id: uuidv4(), source: 'Investigation Finding', description: '', responsiblePersonId: '', deadline: null, status: 'Open' })}
                    onRemove={removeIndependentAction}
                  />
                </div>
              </ScrollArea>
            )}
            {!isStacked && (
              <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
                <Button type="submit" className={HEADER_ACTION_BUTTON_CLASS}>
                  <Save className="mr-2 h-4 w-4" /> Save Corrective Actions Review
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}

function OverdueActionEscalations({
  actions,
  personnel,
  escalatingActionId,
  onEscalate,
}: {
  actions: CorrectiveAction[];
  personnel: Personnel[];
  escalatingActionId: string | null;
  onEscalate: (actionId: string) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-tight">Overdue corrective actions</p>
          <p className="mt-1 text-xs">Send an escalation reminder to the assigned owner. Each action can be escalated once every 24 hours and every send is recorded in the report diary.</p>
          <div className="mt-3 space-y-2">
            {actions.map((action) => {
              const owner = personnel.find((person) => person.id === action.responsiblePersonId);
              const lastEscalation = action.lastEscalatedAt ? new Date(action.lastEscalatedAt) : null;
              const onCooldown = Boolean(lastEscalation && Date.now() - lastEscalation.getTime() < 24 * 60 * 60 * 1000);
              return (
                <div key={action.id} className="flex flex-col gap-2 rounded-md border border-amber-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{action.description || 'Untitled corrective action'}</p>
                    <p className="mt-0.5 text-xs text-amber-900">Due {format(new Date(action.deadline), 'dd MMM yyyy')} - {owner ? `${owner.firstName} ${owner.lastName}` : 'No assigned owner'}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={!action.responsiblePersonId || onCooldown || escalatingActionId === action.id} onClick={() => onEscalate(action.id)}>
                    <MailWarning className="mr-2 h-3.5 w-3.5" />
                    {escalatingActionId === action.id ? 'Sending...' : onCooldown ? 'Sent recently' : 'Escalate'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function IndependentActionFields({
  fields,
  form,
  personnel,
  onAdd,
  onRemove,
}: {
  fields: Array<{ id: string }>;
  form: ReturnType<typeof useForm<ReviewFormValues>>;
  personnel: Personnel[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-card-border bg-card">
      <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
        <div>
          <h4 className="text-xs font-black uppercase tracking-tight">Investigation and Preventive Actions</h4>
          <p className="mt-1 text-[10px] text-muted-foreground">Add actions from findings, root causes, containment, or improvement opportunities. These remain independent of risk mitigations.</p>
        </div>
        <Button type="button" size="sm" className={HEADER_ACTION_BUTTON_CLASS} onClick={onAdd}>
          <PlusCircle className="mr-2 h-3.5 w-3.5" /> Add action
        </Button>
      </div>
      <div className="space-y-4 p-4">
        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">No investigation-created actions recorded. Use this when a finding or root cause requires action beyond a listed risk mitigation.</p>
        ) : fields.map((field, index) => (
          <div key={field.id} className="rounded-md border border-input p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Independent action {index + 1}</p>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(index)} aria-label={`Remove independent action ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <FormField control={form.control} name={`independentActions.${index}.source`} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{independentActionSources.map((source) => <SelectItem key={source} value={source} className="text-xs">{source}</SelectItem>)}</SelectContent></Select>
                </FormItem>
              )} />
              <FormField control={form.control} name={`independentActions.${index}.responsiblePersonId`} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assignee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Assign to..." /></SelectTrigger></FormControl><SelectContent>{personnel.map((person) => <SelectItem key={person.id} value={person.id} className="text-xs">{person.firstName} {person.lastName}</SelectItem>)}</SelectContent></Select>
                </FormItem>
              )} />
              <FormField control={form.control} name={`independentActions.${index}.deadline`} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deadline</FormLabel>
                  <FormControl><Input className="mt-1 h-9 text-xs" type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={(event) => field.onChange(parseLocalDate(event.target.value))} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name={`independentActions.${index}.status`} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Open', 'In Progress', 'Closed', 'Cancelled'].map((status) => <SelectItem key={status} value={status} className="text-xs">{status}</SelectItem>)}</SelectContent></Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name={`independentActions.${index}.description`} render={({ field }) => (
              <FormItem className="mt-3"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</FormLabel>
                <FormControl><textarea {...field} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Describe the action and the intended safety outcome." /></FormControl>
              </FormItem>
            )} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewFields({
  items,
  form,
  personnel,
  riskMatrixColors,
  onAddAction,
  onDeleteAction,
}: {
  items: FlattenedMitigation[];
  form: ReturnType<typeof useForm<ReviewFormValues>>;
  personnel: Personnel[];
  riskMatrixColors?: Record<string, string>;
  onAddAction: (hazardId: string, riskId: string) => void;
  onDeleteAction: (item: FlattenedMitigation, index: number) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
        <CheckCircle2 className="h-12 w-12 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest">No risks available for corrective actions.</p>
        <p className="text-xs font-medium">Record a hazard and initial risk in Step 2 first.</p>
      </div>
    );
  }

  return (
    <>
      {items.map((item, index) => (
        <div key={item.mitigationId} className="overflow-hidden rounded-lg border border-card-border bg-card shadow-none">
          <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Corrective Action {index + 1}
                </p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-black uppercase tracking-wide"
                  onClick={() => onAddAction(item.hazardId, item.riskId)}
                >
                  <PlusCircle className="mr-1 h-3 w-3" /> Add another
                </Button>
                <DeleteActionButton
                  title="Delete corrective action?"
                  description="This will remove the corrective action and its linked mitigation from this safety report. This cannot be undone."
                  srLabel={`Delete corrective action ${index + 1}`}
                  onDelete={() => onDeleteAction(item, index)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard label="Hazard" value={item.hazardDescription} />
              <InfoCard label="Risk" value={item.riskDescription} />
            </div>

            <FormField
              control={form.control}
              name={`mitigationReviews.${index}.mitigationDescription`}
              render={({ field }) => (
            <FormItem className="rounded-lg border border-input bg-background px-3 py-3">
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Mitigation / Control
                  </FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={1}
                      placeholder="Describe the mitigation or control..."
                      ref={(element) => {
                        field.ref(element);
                        if (element) {
                          element.style.height = 'auto';
                          element.style.height = `${element.scrollHeight}px`;
                        }
                      }}
                      onChange={(event) => {
                        field.onChange(event);
                        event.currentTarget.style.height = 'auto';
                        event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                      }}
                      className="mt-2 min-h-10 w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm font-medium leading-5 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
              <RiskSummaryCard title="Initial Risk" assessment={item.riskAssessment} riskMatrixColors={riskMatrixColors} />
              <div className="hidden lg:flex items-center justify-center px-1">
                <Badge variant="outline" className="text-[9px] font-black uppercase">
                  Reduced To
                </Badge>
              </div>
              <RiskSummaryCard
                title="Residual Risk"
                assessment={item.mitigationResidualRiskAssessment}
                riskMatrixColors={riskMatrixColors}
                form={form}
                index={index}
                editable
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FormField
              control={form.control}
              name={`mitigationReviews.${index}.responsiblePersonId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger className="h-9 border-slate-200 bg-white text-xs font-bold">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personnel.map((person) => (
                        <SelectItem key={person.id} value={person.id} className="text-xs">
                          {person.firstName} {person.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`mitigationReviews.${index}.completionDate`}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Deadline</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'h-9 pl-3 text-left font-bold bg-white text-xs border-slate-200',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'dd MMM yyyy') : <span>Select date</span>}
                          <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CustomCalendar selectedDate={field.value ?? undefined} onDateSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`mitigationReviews.${index}.status`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 border-slate-200 bg-white text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['Open', 'In Progress', 'Closed', 'Cancelled'].map((status) => (
                        <SelectItem key={status} value={status} className="text-xs">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function TolerabilityDecisionFields({ form }: { form: ReturnType<typeof useForm<ReviewFormValues>> }) {
  return (
    <section className="overflow-hidden rounded-lg border border-card-border bg-card">
      <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
        <div>
          <h4 className="text-xs font-black uppercase tracking-tight">Risk Tolerability Decision</h4>
          <p className="mt-1 text-[10px] text-muted-foreground">After investigation and defined controls, record whether the residual risk is acceptable, tolerable with controls, or requires further action.</p>
        </div>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <FormField
          control={form.control}
          name="riskAcceptance.decision"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Decision</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger className="mt-2 h-10"><SelectValue placeholder="Select a decision" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Acceptable">Acceptable</SelectItem>
                  <SelectItem value="Tolerable With Controls">Tolerable with controls</SelectItem>
                  <SelectItem value="Unacceptable">Unacceptable - further controls required</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="riskAcceptance.rationale"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Decision rationale</FormLabel>
              <FormControl>
                <textarea {...field} rows={3} placeholder="Explain the residual-risk decision, required controls, and any operating limits." className="mt-2 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-input bg-background px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value || '-'}</p>
    </div>
  );
}

function RiskSummaryCard({
  title,
  assessment,
  riskMatrixColors,
  form,
  index,
  editable = false,
}: {
  title: string;
  assessment: RiskAssessment;
  riskMatrixColors?: Record<string, string>;
  form?: ReturnType<typeof useForm<ReviewFormValues>>;
  index?: number;
  editable?: boolean;
}) {
  const reviews = useWatch({ name: 'mitigationReviews' }) as ReviewFormValues['mitigationReviews'] | undefined;
  const selectedReview = editable && index !== undefined ? reviews?.[index] : undefined;
  const currentAssessment = normalizeRiskAssessment(editable ? {
    likelihood: selectedReview?.residualLikelihood ?? assessment.likelihood,
    severity: selectedReview?.residualSeverity ?? assessment.severity,
  } : assessment);
  const riskColor = getRiskScoreColor(currentAssessment.likelihood, currentAssessment.severity, riskMatrixColors);
  const severity = severityLabels[currentAssessment.severity] || severityLabels[1];
  const riskIndicator = `${currentAssessment.likelihood}${severity.letter} - ${currentAssessment.riskLevel}`;
  const fieldPrefix = index === undefined ? '' : `mitigationReviews.${index}`;

  return (
    <div className="rounded-md border border-input bg-muted/20 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      </div>
      <div className="mt-3 grid min-w-0 items-end gap-3 md:grid-cols-3">
        <div className="min-w-0">
          <p className="min-h-4 text-[10px] font-black uppercase leading-4 tracking-widest text-muted-foreground">Likelihood</p>
          {editable && form && index !== undefined ? (
            <FormField
              control={form.control}
              name={`${fieldPrefix}.residualLikelihood` as `mitigationReviews.${number}.residualLikelihood`}
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-0">
                  <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger className="h-9 w-full min-w-0 border-input bg-background text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <SelectItem key={value} value={String(value)} className="text-xs">
                          {value} - {likelihoodLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          ) : (
            <div className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-xs font-bold">
              {currentAssessment.likelihood} - {likelihoodLabels[currentAssessment.likelihood]}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="min-h-4 text-[10px] font-black uppercase leading-4 tracking-widest text-muted-foreground">Severity</p>
          {editable && form && index !== undefined ? (
            <FormField
              control={form.control}
              name={`${fieldPrefix}.residualSeverity` as `mitigationReviews.${number}.residualSeverity`}
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-0">
                  <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger className="h-9 w-full min-w-0 border-input bg-background text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((value) => (
                        <SelectItem key={value} value={String(value)} className="text-xs">
                          {severityLabels[value].letter} - {severityLabels[value].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          ) : (
            <div className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-xs font-bold">
              {severity.letter} - {severity.name}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="min-h-4 text-[10px] font-black uppercase leading-4 tracking-widest text-muted-foreground">Risk Indicator</p>
          <div className="flex h-9 min-w-0 w-full items-center whitespace-nowrap rounded-md border border-input px-3 text-xs font-black" style={riskColor}>
            {riskIndicator}
          </div>
        </div>
      </div>
    </div>
  );
}
