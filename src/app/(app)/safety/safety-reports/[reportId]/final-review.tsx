'use client';

import { useForm, useFieldArray, useFormContext, Controller, FormProvider } from 'react-hook-form';
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { Signature, Save, ShieldCheck, Trash2, SearchCheck, AlertTriangle, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { dispatchSafeviateEvent, SAFEVIATE_SAFETY_REPORTS_UPDATED } from '@/lib/client-events';
import { SignaturePad } from '@/components/ui/signature-pad';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { ControlEffectivenessStatus, ReportHazard, ReportRisk, ReportStatus, SafetyMonitoringPlan } from '@/types/safety-report';
import { CARD_COMPACT_HEADER_BAND_CLASS, HEADER_ACTION_BUTTON_CLASS } from '@/components/page-header';

// --- Helper Functions ---
const getRiskLevel = (score: number): 'Low' | 'Medium' | 'High' | 'Critical' => {
    if (score <= 4) return 'Low';
    if (score <= 9) return 'Medium';
    if (score <= 16) return 'High';
    return 'Critical';
}

const getRiskScoreColor = (
    likelihood: number,
    severity: number,
    colors?: Record<string, string>
  ): { backgroundColor: string; color: string } => {
    const severityToLetter: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    const severityLetter = severityToLetter[severity] || 'E';
    const cellId = `${likelihood}${severityLetter}`;
    
    if (colors && colors[cellId]) {
        const hex = colors[cellId].replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        const textColor = (yiq >= 128) ? 'black' : 'white';
        return { backgroundColor: colors[cellId], color: textColor };
    }
    
    return { backgroundColor: '#10b981', color: 'white' };
};

type ReviewRiskEntry = {
  hazardId: string;
  hazardDescription: string;
  riskId: string;
  riskDescription: string;
  residualRiskLikelihood: number;
  residualRiskSeverity: number;
  residualRiskScore: number;
  residualRiskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
};

const deriveReviewRisks = (report: SafetyReport): ReviewRiskEntry[] => {
  const initialHazards = report.initialHazards || [];
  const mitigatedHazards = report.mitigatedHazards || [];

  return initialHazards.flatMap((hazard) => {
    const sourceRisks = hazard.risks?.length
      ? hazard.risks
      : [{
          id: `${hazard.id}-risk`,
          description: 'Residual risk after mitigation',
          riskAssessment: {
            likelihood: 1,
            severity: 1,
            riskScore: 1,
            riskLevel: 'Low' as const,
          },
        }];

    return sourceRisks.map((risk) => {
      const mitigatedHazard = mitigatedHazards.find((entry) => entry.id === hazard.id);
      const mitigatedRisk = mitigatedHazard?.risks?.find((entry) => entry.id === risk.id) || mitigatedHazard?.risks?.[0];
      const assessment = mitigatedRisk?.riskAssessment || risk.riskAssessment;

      return {
        hazardId: hazard.id,
        hazardDescription: hazard.description,
        riskId: risk.id,
        riskDescription: risk.description,
        residualRiskLikelihood: assessment?.likelihood || 1,
        residualRiskSeverity: assessment?.severity || 1,
        residualRiskScore: assessment?.riskScore || 1,
        residualRiskLevel: assessment?.riskLevel || 'Low',
      };
    });
  });
};

const buildMitigatedHazardsFromReview = (report: SafetyReport, reviewedRisks: FormValues['risks']): ReportHazard[] => {
  const grouped = new Map<string, ReportHazard>();

  for (const reviewedRisk of reviewedRisks) {
    const existing = grouped.get(reviewedRisk.hazardId);
    const risk: ReportRisk = {
      id: reviewedRisk.riskId,
      description: reviewedRisk.riskDescription,
      riskAssessment: {
        likelihood: reviewedRisk.residualRiskLikelihood,
        severity: reviewedRisk.residualRiskSeverity,
        riskScore: reviewedRisk.residualRiskScore,
        riskLevel: reviewedRisk.residualRiskLevel,
      },
    };

    if (existing) {
      existing.risks = [...(existing.risks || []), risk];
      continue;
    }

    grouped.set(reviewedRisk.hazardId, {
      id: reviewedRisk.hazardId,
      description: reviewedRisk.hazardDescription,
      risks: [risk],
    });
  }

  return Array.from(grouped.values());
};

// --- Form Schemas ---
const riskReviewSchema = z.object({
  hazardId: z.string(),
  hazardDescription: z.string(),
  riskId: z.string(),
  riskDescription: z.string(),
  residualRiskLikelihood: z.number(),
  residualRiskSeverity: z.number(),
  residualRiskScore: z.number(),
  residualRiskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
});

const signatureSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  role: z.string(),
  signatureUrl: z.string(),
  signedAt: z.string(),
});

const reportReviewSchema = z.object({
  risks: z.array(riskReviewSchema),
  signatures: z.array(signatureSchema).optional(),
});

type FormValues = z.infer<typeof reportReviewSchema>;

interface FinalReviewProps {
  report: SafetyReport;
  tenantId: string;
  personnel: Personnel[];
  riskMatrixColors?: Record<string, string>;
  isStacked?: boolean;
  onReportSaved?: (updatedReport: SafetyReport) => void;
}

export function FinalReview({ report, tenantId, personnel, riskMatrixColors, isStacked = false, onReportSaved }: FinalReviewProps) {
  const { toast } = useToast();
  const { userProfile } = useUserProfile();
  const [signatureDataUrl, setSignatureDataUrl] = React.useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(reportReviewSchema),
    defaultValues: {
      risks: deriveReviewRisks(report),
      signatures: report.signatures || [],
    },
  });

  const { fields: riskFields } = useFieldArray({
    control: form.control,
    name: "risks",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const mitigatedHazards = buildMitigatedHazardsFromReview(report, values.risks);
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: { ...report, mitigatedHazards } }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save final review.');
      }
      const payload = await response.json().catch(() => null);
      if (payload?.report) onReportSaved?.(payload.report as SafetyReport);
      toast({ title: 'Final Review Saved' });
      dispatchSafeviateEvent(SAFEVIATE_SAFETY_REPORTS_UPDATED);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save final review.',
      });
    }
  };

  const handleSignReport = async () => {
    const currentUser = userProfile && userProfile.id
      ? personnel.find((person) => person.id === userProfile.id) || userProfile
      : null;
    if (!currentUser) return;
    if (!signatureDataUrl) {
      toast({
        variant: 'destructive',
        title: 'Signature Required',
        description: 'Please provide your signature before signing the report.',
      });
      return;
    }

    const newSignature = {
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        role: currentUser.role || "Safety Manager",
        signatureUrl: signatureDataUrl,
        signedAt: new Date().toISOString(),
    };
    
    const currentSignatures = form.getValues('signatures') || [];
    form.setValue('signatures', [...currentSignatures, newSignature]);

    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: { ...report, signatures: [...currentSignatures, newSignature] } }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to sign this report right now.');
      }
      const payload = await response.json().catch(() => null);
      if (payload?.report) onReportSaved?.(payload.report as SafetyReport);
      toast({title: "Report Signed"});
      setSignatureDataUrl('');
      dispatchSafeviateEvent(SAFEVIATE_SAFETY_REPORTS_UPDATED);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sign-off failed',
        description: error instanceof Error ? error.message : 'Unable to sign this report right now.',
      });
    }
  };

  return (
    <div className={cn("flex flex-col h-full", !isStacked && "overflow-hidden")}>
      <div className={`${CARD_COMPACT_HEADER_BAND_CLASS} bg-muted/5`}>
        <div className="min-w-0">
        <h2 className="text-sm font-black uppercase tracking-tight">Closure and Monitoring</h2>
        <p className="text-[10px] text-muted-foreground">Review the evidence, record approval, and verify that controls remain effective in operation.</p>
        </div>
      </div>
      <div className={cn("flex-1 p-0 overflow-hidden flex flex-col", isStacked && "overflow-visible h-auto")}>
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              {isStacked ? (
                <div className="p-6 space-y-10">
                    <ReviewFields report={report} form={form} riskFields={riskFields} riskMatrixColors={riskMatrixColors} handleSignReport={handleSignReport} signatureDataUrl={signatureDataUrl} onSignatureChange={setSignatureDataUrl} onReportSaved={onReportSaved} />
                </div>
              ) : (
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-10">
                    <ReviewFields report={report} form={form} riskFields={riskFields} riskMatrixColors={riskMatrixColors} handleSignReport={handleSignReport} signatureDataUrl={signatureDataUrl} onSignatureChange={setSignatureDataUrl} onReportSaved={onReportSaved} />
                  </div>
                </ScrollArea>
              )}
              {!isStacked && (
                  <div className="shrink-0 flex justify-end p-4 border-t bg-muted/5 gap-2 no-print">
                      <Button type="submit" className={HEADER_ACTION_BUTTON_CLASS}>
                          <Save className="mr-2 h-4 w-4" /> Save Final Review
                      </Button>
                  </div>
              )}
            </form>
          </Form>
        </FormProvider>
      </div>
    </div>
  );
}

type ReviewFieldsProps = {
  report: SafetyReport;
  form: UseFormReturn<FormValues>;
  riskFields: FieldArrayWithId<FormValues, 'risks', 'id'>[];
  riskMatrixColors?: Record<string, string>;
  handleSignReport: () => void | Promise<void>;
  signatureDataUrl: string;
  onSignatureChange: (value: string) => void;
  onReportSaved?: (updatedReport: SafetyReport) => void;
};

function ReviewFields({ report, form, riskFields, riskMatrixColors, handleSignReport, signatureDataUrl, onSignatureChange, onReportSaved }: ReviewFieldsProps) {
  const signatures = form.watch('signatures') ?? [];

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-card-border bg-card">
        <div className="flex items-center gap-2 border-b border-card-border bg-muted/30 px-4 py-3">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Interview Review</h3>
        </div>
        <div className="space-y-4 p-4">
          {report.investigationInterviews && report.investigationInterviews.length > 0 ? (
            report.investigationInterviews.map((interview, index) => (
              <div key={interview.id} className="p-4 border rounded-xl bg-muted/5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Interview {index + 1}
                  </p>
                  <Badge variant="outline" className="h-6 px-2 text-[10px] font-black uppercase tracking-[0.14em]">
                    {interview.status}
                  </Badge>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {format(new Date(interview.interviewDate), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Interview Subject</p>
                    <p className="text-sm font-bold text-foreground">{interview.personName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Role / Involvement</p>
                    <p className="text-sm font-medium text-foreground">{interview.involvement}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Interviewer</p>
                    <p className="text-sm font-medium text-foreground">{interview.interviewerName}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Interview Notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{interview.notes}</p>
                </div>
                {interview.followUpRequired ? (
                  <div className="space-y-2 rounded-lg border bg-background px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Follow-up Required</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{interview.followUpRequired}</p>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/5 px-4 py-6 text-sm text-muted-foreground">
              No interviews have been captured for this report yet.
            </div>
          )}
        </div>
      </section>

      <Separator className="bg-slate-200/60" />

      <section className="overflow-hidden rounded-lg border border-card-border bg-card">
        <div className="flex items-center gap-2 border-b border-card-border bg-muted/30 px-4 py-3">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary"><SearchCheck className="h-4 w-4" /></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Root Cause Review</h3>
        </div>
        <div className="space-y-4 p-4">
          {report.rootCauseAnalyses && report.rootCauseAnalyses.length > 0 ? (
            report.rootCauseAnalyses.map((cause, index) => (
              <div key={cause.id} className="p-4 border rounded-xl bg-muted/5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Root Cause {index + 1}
                  </p>
                  <Badge variant="outline" className="h-6 px-2 text-[10px] font-black uppercase tracking-[0.14em]">
                    {cause.category}
                  </Badge>
                </div>
                <p className="text-sm font-bold text-foreground">{cause.title}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{cause.analysis}</p>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/5 px-4 py-6 text-sm text-muted-foreground">
              No root cause analyses have been captured for this report yet.
            </div>
          )}

          {report.investigationNotes ? (
            <div className="rounded-xl border bg-background px-4 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Investigation Conclusion</p>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{report.investigationNotes}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-card-border bg-card">
        <div className="flex items-center gap-2 border-b border-card-border bg-muted/30 px-4 py-3">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Residual Risk Review</h3>
        </div>
        <div className="space-y-4 p-4">
          {riskFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-xl bg-muted/5">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Hazard {index + 1}</p>
                  <p className="text-sm font-bold text-foreground">{field.hazardDescription}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Linked Risk</p>
                  <p className="text-sm font-semibold text-foreground">{field.riskDescription}</p>
                </div>
                <div className="flex items-center gap-3 bg-background border px-3 py-1.5 rounded-full shadow-sm">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Residual Risk:</span>
                   <span className="font-mono font-black text-xs">{(field.residualRiskLikelihood * field.residualRiskSeverity)}</span>
                </div>
              </div>
              {report?.correctiveActions?.some((action) => action.hazardId === field.hazardId && (!action.riskId || action.riskId === field.riskId)) ? (
                <div className="mt-3 rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Linked Mitigation Actions</p>
                  <div className="mt-2 space-y-2">
                    {report.correctiveActions
                      .filter((action) => action.hazardId === field.hazardId && (!action.riskId || action.riskId === field.riskId))
                      .map((action) => (
                        <div key={action.id} className="flex flex-col gap-1 rounded-md border bg-muted/10 px-3 py-2">
                          <p className="text-xs font-semibold text-foreground">{action.description}</p>
                          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            <span>Status {action.status}</span>
                            {action.riskId ? <span>Risk linked</span> : <span>Hazard-wide action</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-card-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-card-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary"><Signature className="h-4 w-4" /></div>
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Authorization & Sign-off</h3>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleSignReport} className="h-9 px-6 text-xs font-black uppercase border-slate-300 shadow-sm no-print">
              Sign Report
            </Button>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {signatures.map((sig, idx) => (
            <div key={idx} className="p-4 border rounded-xl bg-background shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-tight text-foreground">{sig.userName}</p>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{sig.role}</p>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground">{format(new Date(sig.signedAt), 'PPP')}</p>
              </div>
              <div className="bg-muted/10 rounded-lg p-4 flex items-center justify-center border-2 border-dashed h-24">
                <img src={sig.signatureUrl} alt="Signature" className="max-h-16 grayscale opacity-80" />
              </div>
            </div>
          ))}
          {signatures.length === 0 && (
              <div className="md:col-span-2 py-10 flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-40">
                  <Signature className="h-10 w-10 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Awaiting Sign-off</p>
              </div>
          )}
          </div>
          <div className="rounded-lg border border-card-border bg-muted/10 p-4 space-y-3 no-print">
          <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Your Signature</Label>
          <SignaturePad onSignatureEnd={onSignatureChange} initialDataUrl={signatureDataUrl} height={140} />
          </div>
        </div>
      </section>

      <ClosureMonitoringPanel report={report} onReportSaved={onReportSaved} />
    </>
  );
}

const monitoringStatuses: ControlEffectivenessStatus[] = ['Pending', 'Effective', 'Partially Effective', 'Ineffective'];
const closureStatuses: ReportStatus[] = ['Pending Closure Review', 'Closed - Monitoring', 'Closed - Effective', 'Reopened'];

const toDateInputValue = (value?: string | null) => value ? value.slice(0, 10) : '';

function ClosureMonitoringPanel({ report, onReportSaved }: { report: SafetyReport; onReportSaved?: (updatedReport: SafetyReport) => void }) {
  const { toast } = useToast();
  const { userProfile } = useUserProfile();
  const [isSaving, setIsSaving] = React.useState(false);
  const [nextStatus, setNextStatus] = React.useState<ReportStatus>(report.status);
  const [closureRationale, setClosureRationale] = React.useState(report.closure?.rationale || '');
  const [reopenReason, setReopenReason] = React.useState(report.closure?.reopenReason || '');
  const [plan, setPlan] = React.useState<SafetyMonitoringPlan>({
    indicatorName: report.monitoringPlan?.indicatorName || '',
    baseline: report.monitoringPlan?.baseline || '',
    target: report.monitoringPlan?.target || '',
    monitoringPeriod: report.monitoringPlan?.monitoringPeriod || '90 days',
    reviewDate: report.monitoringPlan?.reviewDate || '',
    reviewCompletedAt: report.monitoringPlan?.reviewCompletedAt || '',
    reviewResult: report.monitoringPlan?.reviewResult || 'Pending',
    reviewNotes: report.monitoringPlan?.reviewNotes || '',
  });
  const [actionNotes, setActionNotes] = React.useState<Record<string, string>>(() =>
    Object.fromEntries((report.correctiveActions || []).map((action) => [action.id, action.effectivenessEvidence || ''])),
  );

  const actorName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : 'Safety Manager';
  const openActions = (report.correctiveActions || []).filter((action) => !['Closed', 'Cancelled'].includes(action.status));
  const requiresRootCause = ['Incident', 'Serious Incident', 'Accident'].includes(report.eventClassification || '');

  const saveReport = async (nextReport: SafetyReport, successTitle: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: nextReport }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to save the closure review.');
      onReportSaved?.(payload.report as SafetyReport);
      toast({ title: successTitle });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Closure review not saved', description: error instanceof Error ? error.message : 'Unable to save the closure review.' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveLifecycle = () => {
    const approvedAt = report.closure?.approvedAt || new Date().toISOString();
    void saveReport({
      ...report,
      status: nextStatus,
      closure: {
        rationale: closureRationale,
        approvedBy: report.closure?.approvedBy || actorName,
        approvedAt,
        reopenedAt: nextStatus === 'Reopened' ? new Date().toISOString() : report.closure?.reopenedAt,
        reopenReason: reopenReason || null,
      },
      monitoringPlan: {
        ...plan,
        reviewDate: plan.reviewDate || null,
        reviewCompletedAt: plan.reviewCompletedAt || null,
      },
    }, nextStatus === 'Reopened' ? 'Report Reopened' : 'Lifecycle Review Saved');
  };

  const saveActionEffectiveness = (actionId: string, effectivenessStatus: ControlEffectivenessStatus) => {
    const updatedActions = (report.correctiveActions || []).map((action) => action.id === actionId ? {
      ...action,
      effectivenessStatus,
      effectivenessVerificationMethod: 'Post-implementation operational monitoring',
      effectivenessEvidence: actionNotes[actionId] || null,
      effectivenessReviewedAt: new Date().toISOString(),
      effectivenessReviewedBy: actorName,
    } : action);
    void saveReport({ ...report, correctiveActions: updatedActions }, 'Control effectiveness recorded');
  };

  return (
    <section className="overflow-hidden rounded-lg border border-card-border bg-card no-print">
      <div className="border-b border-card-border bg-muted/30 px-4 py-3">
        <p className="text-sm font-black uppercase tracking-tight">Closure and Effectiveness Monitoring</p>
        <p className="mt-1 text-xs text-muted-foreground">Complete the closure decision, then verify that the controls continue to work in normal operations.</p>
      </div>

      <div className="space-y-4 p-4">

      <div className="grid gap-3 md:grid-cols-3">
        <ChecklistItem label="Corrective actions" complete={openActions.length === 0} detail={openActions.length === 0 ? 'All actions are closed or cancelled.' : `${openActions.length} action${openActions.length === 1 ? '' : 's'} still open.`} />
        <ChecklistItem label="Root cause analysis" complete={!requiresRootCause || (report.rootCauseAnalyses || []).length > 0} detail={requiresRootCause ? `${report.rootCauseAnalyses?.length || 0} root cause record(s).` : 'Recommended for this report type.'} />
        <ChecklistItem label="Sign-off" complete={(report.signatures || []).length > 0} detail={`${report.signatures?.length || 0} signature(s) recorded.`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>Closure rationale</Label>
          <Textarea value={closureRationale} onChange={(event) => setClosureRationale(event.target.value)} placeholder="Summarise why the risk is acceptable for closure and what evidence supports that decision." className="min-h-24 bg-background" />
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Lifecycle status</Label>
            <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ReportStatus)} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-medium">
              {closureStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          {nextStatus === 'Reopened' ? (
            <div className="space-y-2">
              <Label>Reason for reopening</Label>
              <Textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} placeholder="Describe the failed control, new information, or changed operating condition." className="min-h-16 bg-background" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Post-closure monitoring plan</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5"><Label>Indicator</Label><Input value={plan.indicatorName} onChange={(event) => setPlan({ ...plan, indicatorName: event.target.value })} placeholder="e.g. repeat event rate" /></div>
          <div className="space-y-1.5"><Label>Baseline</Label><Input value={plan.baseline || ''} onChange={(event) => setPlan({ ...plan, baseline: event.target.value })} placeholder="Current value" /></div>
          <div className="space-y-1.5"><Label>Target</Label><Input value={plan.target || ''} onChange={(event) => setPlan({ ...plan, target: event.target.value })} placeholder="Expected result" /></div>
          <div className="space-y-1.5"><Label>Review date</Label><Input type="date" value={toDateInputValue(plan.reviewDate)} onChange={(event) => setPlan({ ...plan, reviewDate: event.target.value ? new Date(`${event.target.value}T12:00:00`).toISOString() : null })} /></div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Monitoring period</Label><Input value={plan.monitoringPeriod || ''} onChange={(event) => setPlan({ ...plan, monitoringPeriod: event.target.value })} placeholder="e.g. 90 days / 100 flights" /></div>
          <div className="space-y-1.5"><Label>Review outcome</Label><select value={plan.reviewResult || 'Pending'} onChange={(event) => setPlan({ ...plan, reviewResult: event.target.value as ControlEffectivenessStatus, reviewCompletedAt: event.target.value === 'Pending' ? null : new Date().toISOString() })} className="h-10 w-full rounded-md border bg-background px-3 text-sm font-medium">{monitoringStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
        </div>
        <div className="mt-3 space-y-1.5"><Label>Monitoring evidence and outcome</Label><Textarea value={plan.reviewNotes || ''} onChange={(event) => setPlan({ ...plan, reviewNotes: event.target.value })} placeholder="Record the operational evidence reviewed and any follow-up decision." className="min-h-20" /></div>
      </div>

      {(report.correctiveActions || []).length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Control effectiveness records</p>
          {(report.correctiveActions || []).map((action) => (
            <div key={action.id} className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
              <div className="min-w-0"><p className="text-sm font-semibold">{action.description}</p><Textarea value={actionNotes[action.id] || ''} onChange={(event) => setActionNotes({ ...actionNotes, [action.id]: event.target.value })} placeholder="Verification evidence or operational observation" className="mt-2 min-h-16 text-xs" /></div>
              <div className="space-y-1.5"><Label>Effectiveness</Label><select defaultValue={action.effectivenessStatus || 'Pending'} onChange={(event) => saveActionEffectiveness(action.id, event.target.value as ControlEffectivenessStatus)} className="h-9 w-full rounded-md border bg-background px-2 text-xs font-medium">{monitoringStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
              <Badge variant={action.effectivenessStatus === 'Effective' ? 'secondary' : 'outline'}>{action.effectivenessStatus || 'Pending'}</Badge>
            </div>
          ))}
        </div>
      ) : null}

        <div className="flex justify-end"><Button type="button" onClick={saveLifecycle} disabled={isSaving} className="h-9 px-5 text-xs font-black uppercase">{isSaving ? 'Saving...' : 'Save Lifecycle Review'}</Button></div>
      </div>
    </section>
  );
}

function ChecklistItem({ label, detail, complete }: { label: string; detail: string; complete: boolean }) {
  return <div className={`rounded-lg border px-3 py-2 ${complete ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}><p className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
