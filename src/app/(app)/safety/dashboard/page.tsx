'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ClipboardList, ExternalLink, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader, HEADER_COMPACT_CONTROL_CLASS } from '@/components/page-header';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { cn } from '@/lib/utils';
import { SafetyReportingInsights } from './safety-reporting-insights';
import type { Risk } from '@/types/risk';
import type { CorrectiveAction, SafetyReport } from '@/types/safety-report';

type SummaryPayload = { reports?: SafetyReport[]; risks?: Risk[] };
type ActionRow = CorrectiveAction & { reportNumber: string };

const PIE_COLOURS = ['#2563eb', '#d97706', '#059669', '#dc2626', '#7c3aed'];
const parseDate = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`) : null;
const isClosed = (status?: string) => status === 'Closed' || status === 'Cancelled' || status === 'Completed';

export default function SafetyDashboardPage() {
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/safety/dashboard' });
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Unable to load Safety dashboard data.');
      setReports(Array.isArray((payload as SummaryPayload).reports) ? (payload as SummaryPayload).reports! : []);
      setRisks(Array.isArray((payload as SummaryPayload).risks) ? (payload as SummaryPayload).risks! : []);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load Safety dashboard', error);
      setLoadError(error instanceof Error ? error.message : 'Unable to load Safety dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const events = ['safeviate-safety-reports-updated', 'safeviate-risks-updated'];
    events.forEach((event) => window.addEventListener(event, loadData));
    return () => events.forEach((event) => window.removeEventListener(event, loadData));
  }, [loadData]);

  const metrics = useMemo(() => {
    const openReports = reports.filter((report) => report.status !== 'Closed');
    const openRisks = risks.filter((risk) => risk.status === 'Open');
    const actions = reports.flatMap((report) => (report.correctiveActions || []).map((action) => ({ ...action, reportNumber: report.reportNumber })));
    const openActions = actions.filter((action) => !isClosed(action.status));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueActions = openActions.filter((action) => (parseDate(action.deadline)?.getTime() ?? Infinity) < today.getTime());
    return { openReports, openRisks, actions, openActions, overdueActions, totalRiskItems: openRisks.reduce((total, risk) => total + risk.risks.length, 0) };
  }, [reports, risks]);

  const reportStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach((report) => counts.set(report.status, (counts.get(report.status) || 0) + 1));
    return [...counts.entries()].map(([status, value]) => ({ status, value }));
  }, [reports]);

  const riskAreaData = useMemo(() => {
    const counts = new Map<string, number>();
    risks.filter((risk) => risk.status === 'Open').forEach((risk) => counts.set(risk.hazardArea || 'Unclassified', (counts.get(risk.hazardArea || 'Unclassified') || 0) + risk.risks.length));
    return [...counts.entries()].map(([area, value]) => ({ area, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [risks]);

  const actionStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    metrics.actions.forEach((action) => counts.set(action.status, (counts.get(action.status) || 0) + 1));
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [metrics.actions]);

  if (!isAccessLoading && !isAllowed) return <TenantLayoutDisabledState />;
  if (isAccessLoading || isLoading) return <Skeleton className="h-full min-h-[520px] w-full" />;

  const kpis = [
    { label: 'Open reports', value: metrics.openReports.length, helper: `${reports.length} total reports`, icon: ClipboardList, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: 'Open hazards', value: metrics.openRisks.length, helper: `${metrics.totalRiskItems} live risk entries`, icon: ShieldAlert, tone: 'text-violet-700 bg-violet-50 border-violet-200' },
    { label: 'Open actions', value: metrics.openActions.length, helper: `${metrics.overdueActions.length} overdue`, icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Overdue actions', value: metrics.overdueActions.length, helper: 'Requires follow-up', icon: TriangleAlert, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  ];

  return <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-auto px-1"><Card className="w-full overflow-hidden border shadow-none"><MainPageHeader title="Safety Dashboard" description="Monitor safety reporting, risk exposure, and corrective-action health." actions={<div className="flex items-center gap-2"><Button asChild variant="outline" size="sm" className={HEADER_COMPACT_CONTROL_CLASS}><Link href="/safety/safety-reports"><ClipboardList className="h-3.5 w-3.5" /> Safety Reports</Link></Button><Button asChild variant="outline" size="sm" className={HEADER_COMPACT_CONTROL_CLASS}><Link href="/safety/risk-register"><ExternalLink className="h-3.5 w-3.5" /> Risk Register</Link></Button></div>} /><CardContent className="space-y-4 p-3 md:p-4">{loadError ? <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{loadError}</div> : null}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(({ label, value, helper, icon: Icon, tone }) => <div key={label} className="rounded-md border bg-card p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div><span className={cn('rounded-md border p-2', tone)}><Icon className="h-4 w-4" /></span></div></div>)}</div><SafetyReportingInsights reports={reports} /><div className="grid gap-4 xl:grid-cols-2"><Card className="border shadow-none"><CardContent className="p-4"><div className="mb-4"><h2 className="text-sm font-bold">Safety reports</h2><p className="text-xs text-muted-foreground">Reports grouped by workflow status.</p></div><div className="h-[260px]">{reportStatusData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={reportStatusData}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="status" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No safety reports recorded.</div>}</div></CardContent></Card><Card className="border shadow-none"><CardContent className="p-4"><div className="mb-4"><h2 className="text-sm font-bold">Corrective-action health</h2><p className="text-xs text-muted-foreground">Actions recorded within safety reports.</p></div><div className="h-[260px]">{actionStatusData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={actionStatusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>{actionStatusData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLOURS[index % PIE_COLOURS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No corrective actions recorded.</div>}</div><div className="flex flex-wrap gap-2">{actionStatusData.map((entry, index) => <Badge key={entry.name} variant="outline" className="text-xs"><span className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLOURS[index % PIE_COLOURS.length] }} />{entry.name}: {entry.value}</Badge>)}</div></CardContent></Card></div><Card className="border shadow-none"><CardContent className="p-4"><div className="mb-4"><h2 className="text-sm font-bold">Open risk exposure</h2><p className="text-xs text-muted-foreground">Active risk entries by hazard area.</p></div><div className="h-[240px]">{riskAreaData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={riskAreaData} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="area" width={130} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No open risks recorded.</div>}</div></CardContent></Card></CardContent></Card></div>;
}
