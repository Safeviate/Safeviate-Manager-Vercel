'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClipboardPlus, ExternalLink, Search } from 'lucide-react';
import { MainPageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';

type Facility = { id: string; name: string; type: string; code?: string };
type FacilityMaintenanceReport = { id: string; facilityId: string; title: string; category: string; description?: string; priority: 'Low' | 'Medium' | 'High' | 'Critical'; operationalImpact: 'Serviceable' | 'Restricted' | 'Out of service'; status: 'Open' | 'Assigned' | 'In progress' | 'Closed'; assignedTo?: string; dueDate?: string; reportedBy?: string; createdAt: string; updatedAt: string };

const statuses = ['All', 'Open', 'Assigned', 'In progress', 'Closed'] as const;

export default function FacilityMaintenanceReportsPage() {
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/assets/facilities/reports' });
  const [reports, setReports] = useState<FacilityMaintenanceReport[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof statuses)[number]>('All');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [reportsResponse, facilitiesResponse] = await Promise.all([fetch('/api/facilities/maintenance-reports', { cache: 'no-store' }), fetch('/api/facilities', { cache: 'no-store' })]);
        const [reportsPayload, facilitiesPayload] = await Promise.all([reportsResponse.json(), facilitiesResponse.json()]);
        if (!cancelled) {
          setReports(Array.isArray(reportsPayload.reports) ? reportsPayload.reports : []);
          setFacilities(Array.isArray(facilitiesPayload.facilities) ? facilitiesPayload.facilities : []);
        }
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const facilityById = useMemo(() => new Map(facilities.map((facility) => [facility.id, facility])), [facilities]);
  const visibleReports = useMemo(() => reports.filter((report) => {
    const facility = facilityById.get(report.facilityId);
    const haystack = `${report.title} ${report.category} ${report.assignedTo || ''} ${facility?.name || ''}`.toLowerCase();
    return (status === 'All' || report.status === status) && haystack.includes(query.trim().toLowerCase());
  }), [facilityById, query, reports, status]);
  const openCount = reports.filter((report) => report.status !== 'Closed').length;
  const criticalCount = reports.filter((report) => report.priority === 'Critical' && report.status !== 'Closed').length;

  if (!isAccessLoading && !isAllowed) return <TenantLayoutDisabledState />;
  if (loading || isAccessLoading) return <div className="mx-auto w-full max-w-[1180px] space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-[520px] w-full" /></div>;

  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4"><Card className="overflow-hidden border shadow-none"><MainPageHeader title="Facility Maintenance Reports" description="Review open infrastructure and equipment reports across every airport, heliport, and base." actions={<Button asChild variant="outline" size="sm"><Link href="/assets/facilities">Facility register</Link></Button>} /><CardContent className="space-y-3 p-3"><div className="grid gap-3 sm:grid-cols-3"><Summary label="Open reports" value={openCount} /><Summary label="Critical open" value={criticalCount} tone="text-destructive" /><Summary label="All reports" value={reports.length} /></div><div className="flex flex-col gap-2 border-y py-3 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search report, facility, or assignee…" /></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div>{visibleReports.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded border border-dashed p-6 text-center"><ClipboardPlus className="h-8 w-8 text-muted-foreground" /><p className="font-semibold">No maintenance reports found</p><p className="text-sm text-muted-foreground">Reports submitted through Facilities or its QR codes will appear here.</p></div> : <div className="overflow-hidden rounded border"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b bg-muted/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid-cols-[minmax(0,1.5fr)_minmax(140px,.75fr)_auto]"><span>Report</span><span className="hidden sm:block">Facility</span><span>Status</span></div>{visibleReports.map((report) => { const facility = facilityById.get(report.facilityId); return <div key={report.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(140px,.75fr)_auto]"><div className="min-w-0"><p className="truncate text-sm font-semibold">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">{report.category} · {report.assignedTo ? `Assigned to ${report.assignedTo}` : 'Unassigned'}{report.dueDate ? ` · Due ${report.dueDate.slice(0, 10)}` : ''}</p><div className="mt-2 flex flex-wrap gap-1"><Badge variant="outline">{report.priority}</Badge><Badge variant="outline">{report.operationalImpact}</Badge></div></div><div className="hidden min-w-0 sm:block"><p className="truncate text-sm font-medium">{facility?.name || 'Removed facility'}</p><p className="mt-1 text-xs text-muted-foreground">{facility?.type || 'Facility'}</p></div><div className="flex items-start gap-2"><Badge variant="outline">{report.status}</Badge>{facility && <Button asChild variant="ghost" size="icon" className="h-7 w-7"><Link href="/assets/facilities" aria-label={`Open ${facility.name}`}><ExternalLink className="h-3.5 w-3.5" /></Link></Button>}</div></div>; })}</div>}</CardContent></Card></div>;
}

function Summary({ label, value, tone = '' }: { label: string; value: number; tone?: string }) { return <div className="rounded border bg-card p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p></div>; }
