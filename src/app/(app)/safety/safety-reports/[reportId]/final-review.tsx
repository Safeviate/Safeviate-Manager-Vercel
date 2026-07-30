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
  showReview?: boolean;
  showClosure?: boolean;
  showMonitoring?: boolean;
  onReportSaved?: (updatedReport: SafetyReport) => void;
}

export function FinalReview({ report, tenantId, personnel, riskMatrixColors, isStacked = false, showReview = true, showClosure = true, showMonitoring = true, onReportSaved }: FinalReviewProps) {
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
      <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
        <h2 className="shrink-0 text-sm font-black uppercase tracking-tight">{showReview && showClosure ? 'Final Review & Closure' : showReview ? 'Final Review' : showClosure ? 'Closure' : 'Monitoring'}</h2>
        <p className="truncate text-[10px] text-muted-foreground">{showReview && showClosure ? 'Review the monitoring evidence, complete sign-off, and record the closure decision.' : showReview ? 'Review the evidence, residual risk, and report sign-off before closure.' : showClosure ? 'Record the closure decision before monitoring begins.' : 'Schedule and record ongoing operational feedback.'}</p>
        </div>
      </div>
      <div className={cn("flex-1 p-0 overflow-hidden flex flex-col", isStacked && "overflow-visible h-auto")}>
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              {isStacked ? (
                <div className="p-6 space-y-10">
                    {showReview ? <ReviewFields report={report} form={form} riskFields={riskFields} riskMatrixColors={riskMatrixColors} /> : null}
                    {showReview && showClosure ? <MonitoringSummary report={report} /> : null}
                    {showClosure || showMonitoring ? <ClosureMonitoringPanel report={report} showClosure={showClosure} showMonitoring={showMonitoring} onReportSaved={onReportSaved} /> : null}
                    {showReview ? <SignatureSection form={form} handleSignReport={handleSignReport} signatureDataUrl={signatureDataUrl} onSignatureChange={setSignatureDataUrl} /> : null}
                </div>
              ) : (
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-10">
                    {showReview ? <ReviewFields report={report} form={form} riskFields={riskFields} riskMatrixColors={riskMatrixColors} /> : null}
                    {showReview && showClosure ? <MonitoringSummary report={report} /> : null}
                    {showClosure || showMonitoring ? <ClosureMonitoringPanel report={report} showClosure={showClosure} showMonitoring={showMonitoring} onReportSaved={onReportSaved} /> : null}
                    {showReview ? <SignatureSection form={form} handleSignReport={handleSignReport} signatureDataUrl={signatureDataUrl} onSignatureChange={setSignatureDataUrl} /> : null}
                  </div>
                </ScrollArea>
              )}
              {!isStacked && showReview && (
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
};

function ReviewFields({ report, form, riskFields, riskMatrixColors }: ReviewFieldsProps) {

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-card-border bg-card">
        <div className={`${CARD_COMPACT_HEADER_BAND_CLASS} !justify-start`}>
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

      <section className="overflow-hidden rounded-lg border border-card-border bg-card">
        <div className={`${CARD_COMPACT_HEADER_BAND_CLASS} !justify-start`}>
          <div className="p-1.5 rounded-md bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Human Factors - SHELL Review</h3>
        </div>
        <div className="space-y-3 p-4">
          {report.shellAssessments && report.shellAssessments.length > 0 ? report.shellAssessments.map((assessment) => (
            <div key={assessment.id} className="rounded-xl border bg-muted/5 p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-foreground">{assessment.interface}</p><Badge variant="outline" className="h-6 px-2 text-[10px] font-black uppercase tracking-[0.14em]">{assessment.contribution}</Badge></div>
              {assessment.finding ? <p className="text-sm text-foreground whitespace-pre-wrap">{assessment.finding}</p> : null}
              {assessment.evidence ? <p className="text-xs text-muted-foreground whitespace-pre-wrap"><span className="font-bold">Evidence:</span> {assessment.evidence}</p> : null}
              {assessment.recommendedAction ? <p className="text-xs text-muted-foreground whitespace-pre-wrap"><span className="font-bold">Recommended system action:</span> {assessment.recommendedAction}</p> : null}
            </div>
          )) : <div className="rounded-xl border border-dashed bg-muted/5 px-4 py-6 text-sm text-muted-foreground">No SHELL assessment has been captured for this report.</div>}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-card-border bg-card">
        <div className={`${CARD_COMPACT_HEADER_BAND_CLASS} !justify-start`}>
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
        <div className={`${CARD_COMPACT_HEADER_BAND_CLASS} !justify-start`}>
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

    </>
  );
}

function SignatureSection({ form, handleSignReport, signatureDataUrl, onSignatureChange }: {
  form: UseFormReturn<FormValues>;
  handleSignReport: () => void | Promise<void>;
  signatureDataUrl: string;
  onSignatureChange: (value: string) => void;
}) {
  const signatures = form.watch('signatures') ?? [];

  return (
    <section className="overflow-hidden rounded-lg border border-card-border bg-card">
      <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
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
                <div><p className="text-sm font-black uppercase tracking-tight text-foreground">{sig.userName}</p><p className="text-[10px] font-bold text-primary uppercase tracking-widest">{sig.role}</p></div>
                <p className="text-[10px] font-medium text-muted-foreground">{format(new Date(sig.signedAt), 'PPP')}</p>
              </div>
              <div className="bg-muted/10 rounded-lg p-4 flex items-center justify-center border-2 border-dashed h-24"><img src={sig.signatureUrl} alt="Signature" className="max-h-16 grayscale opacity-80" /></div>
            </div>
          ))}
          {signatures.length === 0 ? <div className="md:col-span-2 py-10 flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-40"><Signature className="h-10 w-10 mb-2" /><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Awaiting Sign-off</p></div> : null}
        </div>
        <div className="rounded-lg border border-input bg-muted/5 p-4 space-y-3 no-print">
          <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Your Signature</Label>
          <SignaturePad onSignatureEnd={onSignatureChange} initialDataUrl={signatureDataUrl} height={140} />
        </div>
      </div>
    </section>
  );
}

const monitoringStatuses: ControlEffectivenessStatus[] = ['Pending', 'Effective', 'Partially Effective', 'Ineffective'];
const closureStatuses: ReportStatus[] = ['Pending Closure Review', 'Closed - Monitoring', 'Reopened'];

const toDateInputValue = (value?: string | null) => value ? value.slice(0, 10) : '';
const toNoonIsoString = (value: string) => new Date(`${value}T12:00:00`).toISOString();

function MonitoringSummary({ report }: { report: SafetyReport }) {
  const plan = report.monitoringPlan;
  const latestFeedback = plan?.reviews?.[plan.reviews.length - 1];

  return (
    <section className="overflow-hidden rounded-lg border border-card-border bg-card">
      <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-sm font-black uppercase tracking-tight">Monitoring Summary</p>
          <p className="truncate text-[10px] text-muted-foreground">Use the recorded feedback to confirm whether the controls are effective before closing the report.</p>
        </div>
      </div>
      <div className="p-4">
        {plan ? (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-input bg-muted/5 px-3 py-2"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Next feedback</p><p className="mt-1 text-xs font-semibold">{plan.reviewDate ? format(new Date(plan.reviewDate), 'dd MMM yyyy') : 'Not scheduled'}</p></div>
              <div className="rounded-md border border-input bg-muted/5 px-3 py-2"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Latest outcome</p><p className="mt-1 text-xs font-semibold">{plan.reviewResult || 'Pending'}</p></div>
              <div className="rounded-md border border-input bg-muted/5 px-3 py-2"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Feedback entries</p><p className="mt-1 text-xs font-semibold">{plan.reviews?.length || 0} recorded</p></div>
            </div>
            {latestFeedback ? <div className="mt-3 rounded-md border border-input bg-background px-3 py-3"><p className="text-xs font-semibold">{latestFeedback.summary}</p><p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{latestFeedback.observations}</p></div> : null}
          </>
        ) : (
          <p className="rounded-md border border-dashed border-input bg-muted/5 px-3 py-4 text-sm text-muted-foreground">No monitoring feedback has been scheduled or recorded yet.</p>
        )}
      </div>
    </section>
  );
}

function ClosureMonitoringPanel({ report, showClosure = true, showMonitoring = true, onReportSaved }: { report: SafetyReport; showClosure?: boolean; showMonitoring?: boolean; onReportSaved?: (updatedReport: SafetyReport) => void }) {
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
    reviews: report.monitoringPlan?.reviews || [],
  });
  const [evaluationDate, setEvaluationDate] = React.useState(toDateInputValue(new Date().toISOString()));
  const [evaluationSummary, setEvaluationSummary] = React.useState('');
  const [evaluationObservations, setEvaluationObservations] = React.useState('');
  const [evaluationOutcome, setEvaluationOutcome] = React.useState<ControlEffectivenessStatus>('Effective');
  const [nextEvaluationDate, setNextEvaluationDate] = React.useState(toDateInputValue(report.monitoringPlan?.reviewDate));
  const [actionNotes, setActionNotes] = React.useState<Record<string, string>>(() =>
    Object.fromEntries((report.correctiveActions || []).map((action) => [action.id, action.effectivenessEvidence || ''])),
  );
  const [actionStatuses, setActionStatuses] = React.useState<Record<string, ControlEffectivenessStatus>>(() =>
    Object.fromEntries((report.correctiveActions || []).map((action) => [action.id, action.effectivenessStatus || 'Pending'])),
  );

  const actorName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : 'Safety Manager';
  const openActions = (report.correctiveActions || []).filter((action) => !['Closed', 'Cancelled'].includes(action.status));
  const hasHighSeverityRisk = (report.initialHazards || []).some((hazard) =>
    (hazard.risks || []).some((risk) => ['High', 'Critical'].includes(risk.riskAssessment?.riskLevel || '')),
  );
  const requiresRootCause = hasHighSeverityRisk || ['Incident', 'Serious Incident', 'Accident'].includes(report.eventClassification || '');
  const hasDocumentedRootCause = (report.rootCauseAnalyses || []).some((cause) => cause.title?.trim() && cause.analysis?.trim());
  const isInMonitoring = ['Closed - Monitoring', 'Closed - Effective'].includes(nextStatus);
  const availableClosureStatuses = ['Closed - Monitoring', 'Closed - Effective'].includes(report.status)
    ? [...closureStatuses.slice(0, 2), 'Closed - Effective' as const, 'Reopened' as const]
    : closureStatuses;

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

  const buildLifecycleReport = (monitoringPlan = plan): SafetyReport => {
    const approvedAt = report.closure?.approvedAt || new Date().toISOString();
    const correctiveActions = (report.correctiveActions || []).map((action) => ({
      ...action,
      effectivenessEvidence: actionNotes[action.id] || null,
    }));
    return {
      ...report,
      status: nextStatus,
      correctiveActions,
      closure: {
        rationale: closureRationale,
        approvedBy: report.closure?.approvedBy || actorName,
        approvedAt,
        reopenedAt: nextStatus === 'Reopened' ? new Date().toISOString() : report.closure?.reopenedAt,
        reopenReason: reopenReason || null,
      },
      monitoringPlan: {
        ...monitoringPlan,
        reviewDate: monitoringPlan.reviewDate || null,
        reviewCompletedAt: monitoringPlan.reviewCompletedAt || null,
      },
    };
  };

  const saveLifecycle = () => {
    if (nextStatus === 'Closed - Effective') {
      const actions = report.correctiveActions || [];
      const hasUnresolvedAction = actions.some((action) => !['Closed', 'Cancelled'].includes(action.status));
      const hasUnverifiedEffectiveness = actions.some((action) => action.status !== 'Cancelled' && action.effectivenessStatus !== 'Effective');
      if (hasUnresolvedAction || hasUnverifiedEffectiveness) {
        toast({
          variant: 'destructive',
          title: 'Effectiveness verification required',
          description: 'Close or cancel every corrective action and record it as Effective before selecting Closed - Effective.',
        });
        return;
      }
    }
    void saveReport(buildLifecycleReport(), nextStatus === 'Reopened' ? 'Report Reopened' : 'Lifecycle Review Saved');
  };

  const saveFeedbackSchedule = () => {
    const scheduledDate = plan.reviewDate ? new Date(plan.reviewDate) : null;
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      toast({ variant: 'destructive', title: 'Future feedback date required', description: 'Choose a future date before saving the feedback schedule.' });
      return;
    }
    void saveReport({
      ...report,
      monitoringPlan: {
        ...plan,
        reviewDate: plan.reviewDate,
        reviewCompletedAt: plan.reviewCompletedAt || null,
      },
    }, 'Feedback date saved');
  };

  const recordMonitoringEvaluation = () => {
    if (!evaluationSummary.trim() || !evaluationObservations.trim() || !evaluationDate) {
      toast({ variant: 'destructive', title: 'Evaluation details required', description: 'Add the evaluation date, work summary, and observations before recording the entry.' });
      return;
    }

    const nextPlan: SafetyMonitoringPlan = {
      ...plan,
      reviewDate: nextEvaluationDate ? toNoonIsoString(nextEvaluationDate) : plan.reviewDate || null,
      reviewCompletedAt: toNoonIsoString(evaluationDate),
      reviewResult: evaluationOutcome,
      reviewNotes: evaluationObservations.trim(),
      reviews: [
        ...(plan.reviews || []),
        {
          id: `monitoring-review-${Date.now()}`,
          evaluatedAt: toNoonIsoString(evaluationDate),
          summary: evaluationSummary.trim(),
          observations: evaluationObservations.trim(),
          outcome: evaluationOutcome,
          nextReviewDate: nextEvaluationDate ? toNoonIsoString(nextEvaluationDate) : null,
          recordedBy: actorName,
        },
      ],
    };

    setPlan(nextPlan);
    setEvaluationSummary('');
    setEvaluationObservations('');
    setNextEvaluationDate(toDateInputValue(nextPlan.reviewDate));
    void saveReport(buildLifecycleReport(nextPlan), 'Monitoring evaluation recorded');
  };

  const saveActionEffectiveness = (actionId: string, effectivenessStatus = actionStatuses[actionId] || 'Pending') => {
    const updatedActions = (report.correctiveActions || []).map((action) => action.id === actionId ? {
      ...action,
      status: effectivenessStatus === 'Effective'
        ? 'Closed'
        : effectivenessStatus === 'Partially Effective' || effectivenessStatus === 'Ineffective'
          ? 'In Progress'
          : action.status,
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
      <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-sm font-black uppercase tracking-tight">{showClosure ? 'Closure decision' : 'Effectiveness monitoring'}</p>
          <p className="truncate text-[10px] text-muted-foreground">{showClosure ? 'Record the closure rationale and lifecycle decision.' : 'Schedule future feedback and record whether the controls continue to work.'}</p>
        </div>
      </div>

      <div className="space-y-4 p-4">

      {showClosure ? (
        <>
      <div className="grid gap-3 md:grid-cols-3">
        <ChecklistItem label="Corrective actions" complete={openActions.length === 0} detail={openActions.length === 0 ? 'All actions are closed or cancelled.' : `${openActions.length} action${openActions.length === 1 ? '' : 's'} still open.`} />
        <ChecklistItem label="Investigation conclusion" complete={Boolean(report.investigationNotes?.trim())} detail={report.investigationNotes?.trim() ? 'Conclusion recorded.' : 'A conclusion is required before closure.'} />
        <ChecklistItem label="Root cause analysis" complete={!requiresRootCause || hasDocumentedRootCause} detail={requiresRootCause ? hasHighSeverityRisk ? 'Required because this report has high or critical risk.' : `${report.rootCauseAnalyses?.length || 0} root cause record(s).` : 'Recommended for this report type.'} />
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
              {availableClosureStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
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
        </>
      ) : null}

      {showMonitoring ? (
      <div className="rounded-lg border border-input bg-muted/5 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Feedback diary</p>
            <p className="mt-1 text-xs text-muted-foreground">Schedule the next feedback date, then record what was done and observed when that feedback is due.</p>
          </div>
          <Badge variant="outline">{plan.reviews?.length || 0} recorded</Badge>
        </div>
        <div className="mt-4 max-w-sm space-y-1.5">
          <Label>{isInMonitoring ? 'Next feedback date' : 'First feedback date'}</Label>
          <Input
            type="date"
            value={nextEvaluationDate}
            onChange={(event) => {
              const value = event.target.value;
              setNextEvaluationDate(value);
              setPlan({ ...plan, reviewDate: value ? toNoonIsoString(value) : null });
            }}
          />
        </div>
        {!isInMonitoring ? <p className="mt-3 text-xs text-muted-foreground">The dated feedback-entry form becomes available once the report enters closure monitoring. Use the control records below to save early verification evidence.</p> : null}
        {isInMonitoring ? (
          <div className="mt-4 border-t border-input pt-4">
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5"><Label>Evaluation date</Label><Input type="date" value={evaluationDate} onChange={(event) => setEvaluationDate(event.target.value)} /></div>
              <div className="space-y-1.5"><Label>End goal</Label><select value={evaluationOutcome} onChange={(event) => setEvaluationOutcome(event.target.value as ControlEffectivenessStatus)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium"><option value="Effective">Working</option><option value="Partially Effective">Partially working</option><option value="Ineffective">Not working</option></select></div>
              <div className="space-y-1.5"><Label>Next evaluation date</Label><Input type="date" value={nextEvaluationDate} onChange={(event) => setNextEvaluationDate(event.target.value)} /></div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Work completed</Label><Textarea value={evaluationSummary} onChange={(event) => setEvaluationSummary(event.target.value)} placeholder="Summarise what was done since the previous review." className="min-h-20 bg-background" /></div>
              <div className="space-y-1.5"><Label>Observations</Label><Textarea value={evaluationObservations} onChange={(event) => setEvaluationObservations(event.target.value)} placeholder="Record what was observed in operation." className="min-h-20 bg-background" /></div>
            </div>
            <div className="mt-3 flex justify-end"><Button type="button" variant="outline" onClick={recordMonitoringEvaluation} disabled={isSaving} className="h-9 px-4 text-xs font-black uppercase">Record evaluation</Button></div>
            {(plan.reviews || []).length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-input pt-4">
                {[...(plan.reviews || [])].reverse().map((review) => (
                  <div key={review.id} className="rounded-md border border-input bg-background px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black">{format(new Date(review.evaluatedAt), 'dd MMM yyyy')}</p><Badge variant={review.outcome === 'Effective' ? 'secondary' : 'outline'}>{review.outcome === 'Effective' ? 'Working' : review.outcome === 'Partially Effective' ? 'Partially working' : 'Not working'}</Badge></div>
                    <p className="mt-2 text-xs font-semibold">{review.summary}</p><p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{review.observations}</p>
                    {review.nextReviewDate ? <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Next evaluation {format(new Date(review.nextReviewDate), 'dd MMM yyyy')}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      ) : null}

      {showMonitoring && (report.correctiveActions || []).length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Control effectiveness records</p>
          <p className="text-xs text-muted-foreground">Save evidence before marking a control effective. Effective closes the corrective action; partially effective or ineffective returns it to In Progress for follow-up.</p>
          {(report.correctiveActions || []).map((action) => (
            <div key={action.id} className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
              <div className="min-w-0"><p className="text-sm font-semibold">{action.description}</p><Textarea value={actionNotes[action.id] || ''} onChange={(event) => setActionNotes({ ...actionNotes, [action.id]: event.target.value })} placeholder="Verification evidence or operational observation" className="mt-2 min-h-16 text-xs" /><Button type="button" variant="outline" size="sm" onClick={() => saveActionEffectiveness(action.id)} disabled={isSaving} className="mt-2 h-8 text-[10px] font-black uppercase">Save evidence</Button></div>
              <div className="space-y-1.5"><Label>Effectiveness</Label><select value={actionStatuses[action.id] || 'Pending'} onChange={(event) => { const nextStatus = event.target.value as ControlEffectivenessStatus; setActionStatuses({ ...actionStatuses, [action.id]: nextStatus }); saveActionEffectiveness(action.id, nextStatus); }} className="h-9 w-full rounded-md border bg-background px-2 text-xs font-medium">{monitoringStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
              <Badge variant={action.effectivenessStatus === 'Effective' ? 'secondary' : 'outline'}>{action.effectivenessStatus || 'Pending'}</Badge>
            </div>
          ))}
        </div>
      ) : null}

        <div className="flex justify-end gap-2">
          {showMonitoring ? <Button type="button" variant="outline" onClick={saveFeedbackSchedule} disabled={isSaving} className="h-9 px-5 text-xs font-black uppercase">{isSaving ? 'Saving...' : 'Save Feedback Date'}</Button> : null}
          {showClosure ? <Button type="button" onClick={saveLifecycle} disabled={isSaving} className="h-9 px-5 text-xs font-black uppercase">{isSaving ? 'Saving...' : 'Save Closure Decision'}</Button> : null}
        </div>
      </div>
    </section>
  );
}

function ChecklistItem({ label, detail, complete }: { label: string; detail: string; complete: boolean }) {
  return <div className={`rounded-lg border px-3 py-2 ${complete ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}><p className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
