'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarCheck2, CheckCircle2, ClipboardCheck, ExternalLink, ListChecks } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader, HEADER_COMPACT_CONTROL_CLASS } from '@/components/page-header';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { cn } from '@/lib/utils';
import type { AuditScheduleItem, AuditScheduleStatus, CorrectiveActionPlan, QualityAudit } from '@/types/quality';

type ScheduleType = 'Audits' | 'Checklists' | 'Tasks';

type SummaryPayload = { audits?: QualityAudit[]; caps?: CorrectiveActionPlan[] };

const STATUS_COLOURS: Record<AuditScheduleStatus, string> = {
  Scheduled: '#2563eb',
  Completed: '#059669',
  Pending: '#d97706',
  'Not Scheduled': '#94a3b8',
};

const PIE_COLOURS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];

const parseDate = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`) : null;
const isClosed = (status?: string) => status === 'Closed' || status === 'Cancelled';

export default function QualityDashboardPage() {
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/quality/dashboard' });
  const { hasPermission } = usePermissions();
  const canViewAuditSchedule = hasPermission('quality-audit-schedule-view');
  const canViewChecklists = hasPermission('quality-checklists-view');
  const [audits, setAudits] = useState<QualityAudit[]>([]);
  const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
  const [schedule, setSchedule] = useState<Array<AuditScheduleItem & { type: ScheduleType }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryResponse, auditScheduleResponse, checklistScheduleResponse, taskScheduleResponse] = await Promise.all([
        fetch('/api/dashboard-summary', { cache: 'no-store' }),
        canViewAuditSchedule ? fetch('/api/audit-schedule', { cache: 'no-store' }) : Promise.resolve(null),
        canViewChecklists ? fetch('/api/audit-schedule?scope=checklists', { cache: 'no-store' }) : Promise.resolve(null),
        canViewAuditSchedule ? fetch('/api/audit-schedule?scope=tasks', { cache: 'no-store' }) : Promise.resolve(null),
      ]);
      const [summary, auditSchedule, checklistSchedule, taskSchedule] = await Promise.all([
        summaryResponse.json().catch(() => ({})),
        auditScheduleResponse?.json().catch(() => ({})),
        checklistScheduleResponse?.json().catch(() => ({})),
        taskScheduleResponse?.json().catch(() => ({})),
      ]);
      if (!summaryResponse.ok || (auditScheduleResponse && !auditScheduleResponse.ok) || (checklistScheduleResponse && !checklistScheduleResponse.ok) || (taskScheduleResponse && !taskScheduleResponse.ok)) {
        throw new Error('Unable to load Quality dashboard data.');
      }
      const toSchedule = (payload: { items?: AuditScheduleItem[] }, type: ScheduleType) =>
        (Array.isArray(payload.items) ? payload.items : []).map((item) => ({ ...item, type }));
      setAudits(Array.isArray((summary as SummaryPayload).audits) ? (summary as SummaryPayload).audits! : []);
      setCaps(Array.isArray((summary as SummaryPayload).caps) ? (summary as SummaryPayload).caps! : []);
      setSchedule([
        ...toSchedule(auditSchedule, 'Audits'),
        ...toSchedule(checklistSchedule, 'Checklists'),
        ...toSchedule(taskSchedule, 'Tasks'),
      ]);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load Quality dashboard', error);
      setLoadError(error instanceof Error ? error.message : 'Unable to load Quality dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [canViewAuditSchedule, canViewChecklists]);

  useEffect(() => {
    void loadData();
    const events = ['safeviate-audit-schedule-updated', 'safeviate-quality-updated'];
    events.forEach((event) => window.addEventListener(event, loadData));
    return () => events.forEach((event) => window.removeEventListener(event, loadData));
  }, [loadData]);

  const metrics = useMemo(() => {
    const dated = schedule.filter((item) => item.plannedDate);
    const completed = dated.filter((item) => item.status === 'Completed').length;
    const pending = dated.filter((item) => item.status === 'Pending').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueSchedule = dated.filter((item) => item.status !== 'Completed' && (parseDate(item.plannedDate)?.getTime() ?? Infinity) < today.getTime()).length;
    const openCaps = caps.filter((cap) => !isClosed(cap.status));
    const overdueCaps = openCaps.filter((cap) => (parseDate(cap.dueDate)?.getTime() ?? Infinity) < today.getTime()).length;
    const findings = audits.flatMap((audit) => audit.findings || []);
    return { dated, completed, pending, overdueSchedule, openCaps: openCaps.length, overdueCaps, findings };
  }, [audits, caps, schedule]);

  const scheduleStatusData = useMemo(() => (['Completed', 'Scheduled', 'Pending', 'Not Scheduled'] as AuditScheduleStatus[]).map((status) => ({
    status,
    value: metrics.dated.filter((item) => item.status === status).length,
  })), [metrics.dated]);

  const capStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    caps.forEach((cap) => counts.set(cap.status, (counts.get(cap.status) || 0) + 1));
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [caps]);

  const findingsData = useMemo(() => {
    const counts = { Compliant: 0, 'Non Compliant': 0, 'Not Applicable': 0, Unrecorded: 0 };
    metrics.findings.forEach((finding) => {
      if (finding.finding === 'Compliant') counts.Compliant += 1;
      else if (finding.finding === 'Non Compliant') counts['Non Compliant'] += 1;
      else if (finding.finding === 'Not Applicable') counts['Not Applicable'] += 1;
      else counts.Unrecorded += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [metrics.findings]);

  if (!isAccessLoading && !isAllowed) return <TenantLayoutDisabledState />;
  if (isAccessLoading || isLoading) return <Skeleton className="h-full min-h-[520px] w-full" />;

  const kpis = [
    { label: 'Planned work', value: metrics.dated.length, helper: `${metrics.completed} completed`, icon: CalendarCheck2, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: 'Completion rate', value: metrics.dated.length ? `${Math.round((metrics.completed / metrics.dated.length) * 100)}%` : '—', helper: `${metrics.pending} pending`, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Overdue work', value: metrics.overdueSchedule, helper: 'Scheduled audits, checklists & tasks', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Open CAPs', value: metrics.openCaps, helper: `${metrics.overdueCaps} overdue`, icon: ClipboardCheck, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-auto px-1">
      <Card className="w-full overflow-hidden border shadow-none">
        <MainPageHeader
          title="Quality Dashboard"
          description="Monitor quality delivery, audit findings, and corrective-action health."
          actions={<div className="flex items-center gap-2"><Button asChild variant="outline" size="sm" className={HEADER_COMPACT_CONTROL_CLASS}><Link href="/quality/audit-schedule"><CalendarCheck2 className="h-3.5 w-3.5" /> Quality Schedule</Link></Button><Button asChild variant="outline" size="sm" className={HEADER_COMPACT_CONTROL_CLASS}><Link href="/quality/task-tracker"><ExternalLink className="h-3.5 w-3.5" /> Task Tracker</Link></Button></div>}
        />
        <CardContent className="space-y-4 p-3 md:p-4">
          {loadError ? <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{loadError}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, value, helper, icon: Icon, tone }) => <div key={label} className="rounded-md border bg-card p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div><span className={cn('rounded-md border p-2', tone)}><Icon className="h-4 w-4" /></span></div></div>)}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border shadow-none"><CardContent className="p-4"><div className="mb-4"><h2 className="text-sm font-bold">Schedule compliance</h2><p className="text-xs text-muted-foreground">All planned Quality work by current status.</p></div><div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={scheduleStatusData}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="status" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{scheduleStatusData.map((entry) => <Cell key={entry.status} fill={STATUS_COLOURS[entry.status as AuditScheduleStatus]} />)}</Bar></BarChart></ResponsiveContainer></div></CardContent></Card>
            <Card className="border shadow-none"><CardContent className="p-4"><div className="mb-4"><h2 className="text-sm font-bold">Corrective-action health</h2><p className="text-xs text-muted-foreground">Corrective action plans by live workflow status.</p></div><div className="h-[260px]">{capStatusData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={capStatusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>{capStatusData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLOURS[index % PIE_COLOURS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No corrective-action plans recorded.</div>}</div><div className="flex flex-wrap gap-2">{capStatusData.map((entry, index) => <Badge key={entry.name} variant="outline" className="text-xs"><span className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLOURS[index % PIE_COLOURS.length] }} />{entry.name}: {entry.value}</Badge>)}</div></CardContent></Card>
          </div>
          <Card className="border shadow-none"><CardContent className="p-4"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-bold">Audit findings</h2><p className="text-xs text-muted-foreground">Finding outcomes captured in Quality audit execution.</p></div><Badge variant="outline" className="h-6"><ListChecks className="mr-1.5 h-3.5 w-3.5" /> {metrics.findings.length} findings</Badge></div><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={findingsData} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
        </CardContent>
      </Card>
    </div>
  );
}
