'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, ClipboardCheck, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SafetyReport } from '@/types/safety-report';
import { usePageLayout } from '@/hooks/use-page-layout';
import { useUserProfile } from '@/hooks/use-user-profile';
import { cn } from '@/lib/utils';
import {
  CARD_HEADER_BAND_CLASS,
  HEADER_COMPACT_CONTROL_CLASS,
  HEADER_SECONDARY_BUTTON_CLASS,
} from '@/components/page-header';

type MonitoringFilter = 'all' | 'pending' | 'overdue' | 'completed' | 'attention';
type MonitoringState = 'Scheduled' | 'Due soon' | 'Overdue' | 'Completed' | 'Needs attention';

const parseMonitoringDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatMonitoringDate = (value?: string | null) => {
  const parsed = parseMonitoringDate(value);
  return parsed ? format(parsed, 'dd MMM yyyy') : 'Not scheduled';
};

const getReportTitle = (report: SafetyReport) => {
  const title = report.title?.trim();
  if (title) return title;
  const firstDescriptionLine = report.description?.split(/\r?\n/)[0]?.trim();
  return firstDescriptionLine || 'Untitled safety report';
};

const getMonitoringState = (report: SafetyReport): MonitoringState => {
  const result = report.monitoringPlan?.reviewResult || 'Pending';
  if (result === 'Ineffective' || result === 'Partially Effective') return 'Needs attention';
  if (result !== 'Pending') return 'Completed';

  const reviewDate = parseMonitoringDate(report.monitoringPlan?.reviewDate);
  if (!reviewDate) return 'Scheduled';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (reviewDate < today) return 'Overdue';

  const daysUntilReview = Math.ceil((reviewDate.getTime() - today.getTime()) / 86_400_000);
  return daysUntilReview <= 30 ? 'Due soon' : 'Scheduled';
};

const getStateClassName = (state: MonitoringState) => {
  switch (state) {
    case 'Overdue':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'Due soon':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'Completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'Needs attention':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const matchesFilter = (state: MonitoringState, filter: MonitoringFilter) => {
  if (filter === 'all') return true;
  if (filter === 'pending') return state === 'Scheduled' || state === 'Due soon';
  if (filter === 'overdue') return state === 'Overdue';
  if (filter === 'completed') return state === 'Completed';
  return state === 'Needs attention';
};

function MonitoringRow({ report }: { report: SafetyReport }) {
  const plan = report.monitoringPlan;
  const state = getMonitoringState(report);
  const result = plan?.reviewResult || 'Pending';
  const latestFeedback = plan?.reviews?.[plan.reviews.length - 1];

  return (
    <div className="border-t border-card-border px-4 py-4 first:border-t-0 sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black tracking-tight">{report.reportNumber}</span>
            <Badge variant="outline" className="h-5 rounded-md px-2 text-[9px] font-black uppercase tracking-[0.08em]">
              {report.status}
            </Badge>
            <span className={cn('inline-flex h-5 items-center rounded-md border px-2 text-[9px] font-black uppercase tracking-[0.08em]', getStateClassName(state))}>
              {state}
            </span>
          </div>
          <p className="mt-1 break-words text-sm font-semibold text-foreground">{getReportTitle(report)}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
            {report.departmentName || 'Unassigned department'}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className={cn(HEADER_SECONDARY_BUTTON_CLASS, HEADER_COMPACT_CONTROL_CLASS, 'shrink-0 self-start')}>
          <Link href={`/safety/safety-reports/${report.id}?tab=monitoring`}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open monitoring
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-card-border bg-background px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Next feedback</p>
          <p className="mt-1 text-xs font-semibold">{formatMonitoringDate(plan?.reviewDate)}</p>
        </div>
        <div className="rounded-md border border-card-border bg-background px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Latest outcome</p>
          <p className="mt-1 break-words text-xs font-semibold">{result}</p>
        </div>
        <div className="rounded-md border border-card-border bg-background px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Feedback entries</p>
          <p className="mt-1 break-words text-xs font-semibold">{plan?.reviews?.length || 0} recorded</p>
        </div>
      </div>

      {latestFeedback && (
        <div className="mt-3 border-t border-card-border pt-3">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Latest feedback</p>
          <p className="mt-1 text-xs font-semibold">{latestFeedback.summary}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{latestFeedback.observations}</p>
        </div>
      )}
    </div>
  );
}

export default function SafetyReportMonitoringPage() {
  const { tenantId } = useUserProfile();
  const { isPageEnabled } = usePageLayout('safety-reports');
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [filter, setFilter] = useState<MonitoringFilter>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/safety-reports', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ reports: [] }));
        if (!cancelled) {
          setReports(Array.isArray(payload?.reports)
            ? payload.reports.filter((report: SafetyReport) => Boolean(report.monitoringPlan) && ['Closed - Monitoring', 'Closed - Effective'].includes(report.status))
            : []);
        }
      } catch {
        if (!cancelled) setReports([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const monitoringReports = useMemo(() => {
    return reports
      .map((report) => ({ report, state: getMonitoringState(report) }))
      .filter(({ state }) => matchesFilter(state, filter))
      .sort((left, right) => {
        const leftDate = parseMonitoringDate(left.report.monitoringPlan?.reviewDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        const rightDate = parseMonitoringDate(right.report.monitoringPlan?.reviewDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        return leftDate - rightDate;
      });
  }, [filter, reports]);

  const summary = useMemo(() => {
    const states = reports.map(getMonitoringState);
    return {
      total: reports.length,
      pending: states.filter((state) => state === 'Scheduled' || state === 'Due soon').length,
      overdue: states.filter((state) => state === 'Overdue').length,
      completed: states.filter((state) => state === 'Completed').length,
      attention: states.filter((state) => state === 'Needs attention').length,
    };
  }, [reports]);

  if (!isPageEnabled) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-1 pt-4">
        <Card className="border shadow-none">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">This page is disabled for the current tenant layout.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-col gap-4 overflow-hidden px-1 pt-4">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-none">
        <div className={CARD_HEADER_BAND_CLASS}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Post-Closure Monitoring</p>
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Review every monitoring action across the safety report register.</p>
            </div>
            <Button asChild variant="outline" size="sm" className={cn(HEADER_SECONDARY_BUTTON_CLASS, HEADER_COMPACT_CONTROL_CLASS, 'shrink-0')}>
              <Link href="/safety/safety-reports">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Safety reports
              </Link>
            </Button>
          </div>
        </div>

        <CardContent className="min-h-0 flex-1 overflow-y-auto bg-background p-4 sm:p-5">
          <div className="grid gap-2 sm:grid-cols-5">
            {[
              ['All plans', summary.total, 'all'],
              ['Pending', summary.pending, 'pending'],
              ['Overdue', summary.overdue, 'overdue'],
              ['Completed', summary.completed, 'completed'],
              ['Needs attention', summary.attention, 'attention'],
            ].map(([label, value, valueFilter]) => (
              <button
                key={valueFilter}
                type="button"
                onClick={() => setFilter(valueFilter as MonitoringFilter)}
                className={cn('rounded-md border border-card-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/30', filter === valueFilter && 'border-slate-900 bg-muted/30')}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-black tracking-tight">{value}</p>
              </button>
            ))}
          </div>

          <Card className="mt-4 overflow-hidden rounded-lg border shadow-none">
            <div className="flex flex-col gap-2 border-b border-card-border bg-muted/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-sm font-black uppercase tracking-tight">Monitoring actions</p>
                <p className="mt-1 text-xs text-muted-foreground">{monitoringReports.length} shown from {summary.total} recorded plan{summary.total === 1 ? '' : 's'}.</p>
              </div>
              <Select value={filter} onValueChange={(value: MonitoringFilter) => setFilter(value)}>
                <SelectTrigger className={cn(HEADER_COMPACT_CONTROL_CLASS, 'w-full sm:w-[170px]')} aria-label="Filter monitoring actions">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="attention">Needs attention</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading monitoring actions...
              </div>
            ) : monitoringReports.length > 0 ? (
              monitoringReports.map(({ report }) => <MonitoringRow key={report.id} report={report} />)
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-black uppercase tracking-tight">No monitoring actions recorded</p>
                <p className="mt-2 text-sm text-muted-foreground">Monitoring plans saved in a report&apos;s Monitoring step will appear here.</p>
              </div>
            )}
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
