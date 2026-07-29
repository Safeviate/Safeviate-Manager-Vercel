'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/types/safety-report';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useUserProfile } from '@/hooks/use-user-profile';
import { CARD_COMPACT_HEADER_BAND_CLASS, HEADER_ACTION_BUTTON_CLASS } from '@/components/page-header';
import { getInitialNarrative } from '@/lib/safety-report-text';

const isEmailLike = (value?: string | null) => Boolean(value && /\S+@\S+\.\S+/.test(value));

const resolveReporterLabel = (
  report: {
    isAnonymous?: boolean | null;
    submittedBy?: string | null;
    submittedByEmail?: string | null;
    submittedByName?: string | null;
    submittedOnBehalfOf?: string | null;
  },
  currentUserEmail?: string | null,
) => {
  if (report.isAnonymous) return 'Anonymous';
  const submittedOnBehalfOf = report.submittedOnBehalfOf?.trim() || '';
  const submittedByEmail = report.submittedByEmail?.trim() || '';
  const submittedByName = report.submittedByName?.trim() || '';
  const submittedBy = report.submittedBy?.trim() || '';
  const viewerEmail = currentUserEmail?.trim() || '';

  if (submittedOnBehalfOf) return submittedOnBehalfOf;
  if (submittedByEmail) return submittedByEmail;
  if (submittedByName && !/^vercel user$/i.test(submittedByName)) return submittedByName;
  if (isEmailLike(submittedBy)) return submittedBy;
  if ((/^vercel user$/i.test(submittedByName) || /^vercel-user$/i.test(submittedBy)) && viewerEmail) return viewerEmail;
  return submittedByName || submittedBy || 'Signed-in User';
};

const reportStatuses = ['Open', 'Under Review', 'Awaiting Action', 'Pending Closure Review', 'Closed - Monitoring', 'Closed - Effective', 'Reopened'];
const eventClassifications = [
  'Accident',
  'Serious Incident',
  'Incident',
  'Minor Incident',
  'Hazard',
  'Not Determined',
] as const;

const ICAO_CATEGORIES = [
  { code: 'ADRM', description: 'Aerodrome' },
  { code: 'AMAN', description: 'Abrupt Maneuver' },
  { code: 'ARC', description: 'Abnormal Runway Contact' },
  { code: 'BIRD', description: 'Bird strike' },
  { code: 'CABIN', description: 'Cabin Safety Events' },
  { code: 'CFIT', description: 'Controlled Flight Into or Toward Terrain' },
  { code: 'CTOL', description: 'Collision with obstacle(s) during take-off and landing' },
  { code: 'EVAC', description: 'Evacuation' },
  { code: 'F-NI', description: 'Fire/smoke (non-impact)' },
  { code: 'F-POST', description: 'Fire/smoke (post-impact)' },
  { code: 'FUEL', description: 'Fuel related' },
  { code: 'GCOL', description: 'Ground Collision' },
  { code: 'GRS', description: 'Ground Handling' },
  { code: 'HIJACK', description: 'Hijacking' },
  { code: 'ICE', description: 'Icing' },
  { code: 'LOC-G', description: 'Loss of control - Ground' },
  { code: 'LOC-I', description: 'Loss of control - Inflight' },
  { code: 'MAC', description: 'Airprox/ ACAS alert/ loss of separation' },
  { code: 'NAV', description: 'Navigation error' },
  { code: 'RE', description: 'Runway Excursion' },
  { code: 'RI', description: 'Runway Incursion' },
  { code: 'SEC', description: 'Security related' },
  { code: 'SCF-NP', description: 'System/ component failure or malfunction (non-powerplant)' },
  { code: 'SCF-PP', description: 'System/ component failure or malfunction (powerplant)' },
  { code: 'TURB', description: 'Turbulence encounter' },
  { code: 'UCOL', description: 'Undershoot/ overshoot' },
  { code: 'WSTR', description: 'Windshear or thunderstorm' },
  { code: 'OTHER', description: 'Other' },
  { code: 'UNK', description: 'Unknown or undetermined' },
];

const triageSchema = z.object({
  title: z.string().trim().max(180).optional(),
  status: z.string().min(1),
  departmentId: z.string().optional(),
  reportingChannel: z.enum(['Mandatory', 'Voluntary']).optional(),
  occurrenceCategory: z.string().optional(),
  eventClassification: z.string().optional(),
});

type TriageFormValues = z.infer<typeof triageSchema>;

interface TriageFormProps {
  report: SafetyReport;
  tenantId: string;
  isStacked?: boolean;
  onReportSaved?: (updatedReport: SafetyReport) => void;
}

export function TriageForm({ report, tenantId, isStacked = false, onReportSaved }: TriageFormProps) {
  const { toast } = useToast();
  const { userProfile } = useUserProfile();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const reporterLabel = resolveReporterLabel(report, userProfile?.email);
  const initialNarrative = getInitialNarrative(report.description, report.immediateAction);

  useEffect(() => {
    let cancelled = false;
    const loadDepartments = async () => {
      try {
        const response = await fetch('/api/departments', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ departments: [] }));
        if (!cancelled) setDepartments(Array.isArray(payload?.departments) ? payload.departments : []);
      } catch {
        if (!cancelled) setDepartments([]);
      }
    };
    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  const form = useForm<TriageFormValues>({
    resolver: zodResolver(triageSchema),
    defaultValues: {
      title: report.title || report.initialHazards?.[0]?.description || '',
      status: report.status || 'Open',
      departmentId: report.departmentId || '',
      reportingChannel: report.reportingChannel || 'Voluntary',
      occurrenceCategory: report.occurrenceCategory || '',
      eventClassification: report.eventClassification || '',
    },
  });

  const onSubmit = async (values: TriageFormValues) => {
    try {
      const department = departments.find((entry) => entry.id === values.departmentId);
      const response = await fetch(`/api/safety-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: {
            ...report,
            ...values,
            departmentId: department?.id || null,
            departmentName: department?.name || null,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to save triage details.');
      }
      const payload = await response.json().catch(() => null);
      if (payload?.report) onReportSaved?.(payload.report as SafetyReport);
      toast({ title: 'Triage Details Saved' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save triage details.',
      });
    }
  };

  return (
    <div className={cn("flex flex-col h-full", !isStacked && "overflow-hidden")}>
      <div className={cn("flex-1 p-0 overflow-hidden flex flex-col", isStacked && "overflow-visible h-auto")}>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 no-scrollbar md:p-5">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* --- INTEGRATED REPORT SUMMARY --- */}
                    <section className="overflow-hidden rounded-lg border border-card-border bg-card">
                        <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="shrink-0 text-sm font-black uppercase tracking-tight">Report Summary</p>
                            <p className="truncate text-[10px] font-medium text-muted-foreground">
                              Filed {format(new Date(report.submittedAt), 'PPP')} by {reporterLabel}{report.submittedOnBehalfOf ? ` on behalf of ${report.submittedOnBehalfOf}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 p-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Report Heading</FormLabel>
                              <FormControl><Input className="h-9 border-input bg-background text-sm font-bold" placeholder="Summarise the reported safety concern" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-80">Initial Narrative</p>
                            <div className="rounded-lg border border-input bg-primary/5 px-4 py-3">
                                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground">{initialNarrative || 'No narrative recorded.'}</p>
                            </div>
                        </div>
                        {report.immediateAction ? (
                          <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800">Immediate Action</p>
                            <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
                              <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground">{report.immediateAction}</p>
                            </div>
                          </div>
                        ) : null}
                        {report.recommendation ? (
                          <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary">Recommendation</p>
                            <div className="rounded-lg border border-input bg-primary/5 px-4 py-3">
                              <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground">{report.recommendation}</p>
                            </div>
                          </div>
                        ) : null}
                        </div>
                    </section>

                    {/* --- TRIAGE CONTROLS --- */}
                    <section className="overflow-hidden rounded-lg border border-card-border bg-card">
                        <div className={CARD_COMPACT_HEADER_BAND_CLASS}>
                          <p className="text-sm font-black uppercase tracking-tight">Classification &amp; Management</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                            <TriageFields form={form} departments={departments} />
                        </div>
                    </section>
                        {!isStacked && (
                            <div className="flex justify-end pt-4">
                                <Button type="submit" className={HEADER_ACTION_BUTTON_CLASS}>
                                    <Save className="mr-2 h-4 w-4" /> Save Triage Details
                                </Button>
                            </div>
                        )}
                </form>
            </Form>
        </div>
      </div>
    </div>
  );
}

function TriageFields({ form, departments }: { form: any; departments: { id: string; name: string }[] }) {
  return (
    <>
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Report Status</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger className="h-10 bg-background font-bold text-xs"><SelectValue placeholder="Set status" /></SelectTrigger></FormControl>
              <SelectContent>{reportStatuses.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="reportingChannel"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Reporting Channel</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger className="h-10 bg-background font-bold text-xs"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent><SelectItem value="Voluntary">Voluntary</SelectItem><SelectItem value="Mandatory">Mandatory</SelectItem></SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="departmentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assigned Department</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl><SelectTrigger className="h-10 bg-background font-bold text-xs"><SelectValue placeholder="Not assigned" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="unassigned">Not assigned</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] font-medium text-muted-foreground">Assign ownership for routing and reporting.</p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="eventClassification"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Occurrence Class (ICAO)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger className="h-10 bg-background font-bold text-xs"><SelectValue placeholder="Select occurrence class" /></SelectTrigger></FormControl>
              <SelectContent>{eventClassifications.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="occurrenceCategory"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Occurrence Category (ICAO)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger className="h-10 bg-background font-bold text-xs"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
              <SelectContent><ScrollArea className="h-[300px]">{ICAO_CATEGORIES.map((cat) => (<SelectItem key={cat.code} value={cat.code}>{cat.code} - {cat.description}</SelectItem>))}</ScrollArea></SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
