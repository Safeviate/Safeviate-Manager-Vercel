'use client';

import Link from 'next/link';
import { useMemo, type ComponentType } from 'react';
import { collection, query } from 'firebase/firestore';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { QualityAudit, CorrectiveActionPlan } from '@/types/quality';
import type { SafetyReport } from '@/types/safety-report';
import type { Risk } from '@/types/risk';
import {
  ArrowRight,
  CalendarClock,
  CalendarRange,
  CheckSquare,
  ClipboardCheck,
  DollarSign,
  FileWarning,
  Plane,
  ShieldAlert,
  Siren,
  TrendingUp,
  LayoutList,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

type AttentionItemTone = 'danger' | 'warning' | 'neutral';

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black">{value}</div>
        <p className="mt-1 text-[10px] font-medium text-muted-foreground uppercase">{hint}</p>
      </CardContent>
    </Card>
  );
}

function AttentionList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: { id: string; title: string; detail: string; tone?: AttentionItemTone }[];
}) {
  const toneClassMap: Record<AttentionItemTone, string> = {
    danger: 'border-destructive/30 bg-destructive/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    neutral: 'border-card-border/60 bg-muted/10',
  };

  return (
    <Card className="shadow-none border">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-tight">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border px-4 py-3',
                toneClassMap[item.tone || 'neutral']
              )}
            >
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-[10px] text-muted-foreground font-medium uppercase">{item.detail}</p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-card-border/70 px-4 py-8 text-center bg-muted/5">
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest opacity-40">No items requiring immediate action.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { tenant } = useTenantConfig();

  const isAviation = tenant?.industry?.startsWith('Aviation') ?? true;

  const bookingsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
    [firestore, tenantId]
  );
  const aircraftQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  const auditsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null),
    [firestore, tenantId]
  );
  const capsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null),
    [firestore, tenantId]
  );
  const safetyReportsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null),
    [firestore, tenantId]
  );
  const risksQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/risks`)) : null),
    [firestore, tenantId]
  );

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);
  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);
  const { data: safetyReports, isLoading: isLoadingSafetyReports } = useCollection<SafetyReport>(safetyReportsQuery);
  const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  const isLoading = isLoadingBookings || isLoadingAircrafts || isLoadingAudits || isLoadingCaps || isLoadingSafetyReports || isLoadingRisks;

  const stats = useMemo(() => {
    if (!bookings || !aircrafts || !audits || !caps || !safetyReports || !risks) return null;

    const now = new Date();
    const aircraftMap = new Map(aircrafts.map((aircraft) => [aircraft.id, aircraft.tailNumber]));

    const completedBookings = bookings.filter((booking) => booking.status === 'Completed');
    const cancelledBookings = bookings.filter(
      (booking) => booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason'
    );
    const todayBookings = bookings.filter((booking) => booking.date && isToday(parseISO(`${booking.date}T00:00:00`)));
    const tomorrowBookings = bookings.filter(
      (booking) => booking.date && isTomorrow(parseISO(`${booking.date}T00:00:00`))
    );
    
    const overdueItems = caps.filter(cap => cap.status === 'Open' || cap.status === 'In Progress');

    const unbilledBookings = completedBookings.filter(
      (booking) => !booking.accountingStatus || booking.accountingStatus === 'Unbilled'
    );
    const pendingRevenue = unbilledBookings.reduce((sum, booking) => sum + (booking.totalCost || 0), 0);

    let totalHours = 0;
    const hoursByAircraft: Record<string, number> = {};
    aircrafts.forEach((aircraft) => {
      hoursByAircraft[aircraft.tailNumber] = 0;
    });

    completedBookings.forEach((booking) => {
      if (
        booking.postFlightData?.hobbs !== undefined &&
        booking.preFlightData?.hobbs !== undefined
      ) {
        const duration = Math.max(0, booking.postFlightData.hobbs - booking.preFlightData.hobbs);
        totalHours += duration;
        const tailNumber = aircraftMap.get(booking.aircraftId);
        if (tailNumber) {
          hoursByAircraft[tailNumber] = (hoursByAircraft[tailNumber] || 0) + duration;
        }
      }
    });

    const aircraftChartData = Object.entries(hoursByAircraft)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6);

    const statusChartData = [
      { name: 'Completed', value: isAviation ? completedBookings.length : caps.filter(c => c.status === 'Closed').length, fill: 'hsl(var(--chart-2))' },
      { name: 'Cancelled', value: isAviation ? cancelledBookings.length : caps.filter(c => c.status === 'Cancelled').length, fill: 'hsl(var(--chart-1))' },
      {
        name: 'Active',
        value: isAviation 
          ? Math.max(0, bookings.length - completedBookings.length - cancelledBookings.length)
          : overdueItems.length,
        fill: 'hsl(var(--chart-3))',
      },
    ].filter((item) => item.value > 0);

    const finalizedAudits = audits.filter((audit) => audit.status === 'Finalized' || audit.status === 'Closed');
    const averageComplianceScore =
      finalizedAudits.length > 0
        ? Math.round(
            finalizedAudits.reduce((sum, audit) => sum + (audit.complianceScore || 0), 0) /
              finalizedAudits.length
          )
        : 0;

    const auditTrendData = finalizedAudits
      .sort((a, b) => new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime())
      .map((audit) => ({
        date: format(new Date(audit.auditDate), 'MMM'),
        score: audit.complianceScore || 0,
      }))
      .slice(-6);

    const reportsByType = safetyReports.reduce((acc, report) => {
      acc[report.reportType] = (acc[report.reportType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const reportsChartData = Object.entries(reportsByType).map(([name, value]) => ({ name, value }));

    const openHazards = risks.filter((risk) => risk.status === 'Open');
    const criticalRiskItems = openHazards.flatMap((risk) =>
      (risk.risks || [])
        .filter((item) => {
          const level = item.initialRiskAssessment?.riskLevel;
          return level === 'Critical' || level === 'High';
        })
        .map((item) => ({
          id: `${risk.id}-${item.id}`,
          title: risk.hazard,
          detail: `${item.initialRiskAssessment?.riskLevel || 'Unrated'} risk in ${risk.hazardArea}`,
          tone: (item.initialRiskAssessment?.riskLevel === 'Critical' ? 'danger' : 'warning') as AttentionItemTone,
        }))
    );

    const attentionItems = [
      ...criticalRiskItems.slice(0, 3),
      ...overdueItems.slice(0, 3).map(cap => ({
          id: cap.id,
          title: 'Outstanding Corrective Action',
          detail: `CAP for audit findings pending resolution`,
          tone: 'warning' as AttentionItemTone
      }))
    ].slice(0, 6);

    return {
      totalHours: totalHours.toFixed(1),
      activeFleet: aircrafts.length,
      totalBookings: bookings.length,
      todayBookings: todayBookings.length,
      tomorrowBookings: tomorrowBookings.length,
      completionRate: bookings.length > 0 ? ((completedBookings.length / bookings.length) * 100).toFixed(1) : '0',
      unbilledCount: unbilledBookings.length,
      pendingRevenue,
      averageComplianceScore,
      openCapsCount: overdueItems.length,
      openSafetyReportsCount: safetyReports.filter(r => r.status !== 'Closed').length,
      openHazardsCount: openHazards.length,
      aircraftChartData,
      statusChartData,
      auditTrendData,
      reportsChartData,
      attentionItems,
      upcomingAudits: audits.filter(a => a.status === 'Scheduled').slice(0, 4),
      criticalRiskItems: criticalRiskItems.slice(0, 5),
    };
  }, [bookings, aircrafts, audits, caps, safetyReports, risks, isAviation]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mx-auto flex h-full w-full max-w-[1350px] flex-col gap-6 overflow-y-auto pb-10 no-scrollbar">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {isAviation ? (
          <MetricCard
            title="Today's Flights"
            value={String(stats.todayBookings)}
            hint={`${stats.tomorrowBookings} scheduled for tomorrow`}
            icon={CalendarRange}
          />
        ) : (
          <MetricCard
            title="Active Tasks"
            value={String(stats.openCapsCount)}
            hint="Corrective actions in progress"
            icon={LayoutList}
          />
        )}
        <MetricCard
          title="Attention Required"
          value={String(stats.openSafetyReportsCount + stats.openHazardsCount)}
          hint="Reports and hazards requiring review"
          icon={Siren}
        />
        <MetricCard
          title="Compliance Score"
          value={`${stats.averageComplianceScore}%`}
          hint={`${stats.openCapsCount} open corrective actions`}
          icon={ClipboardCheck}
        />
        <MetricCard
          title={isAviation ? "Pending Revenue" : "Safety Submissions"}
          value={isAviation ? `$${stats.pendingRevenue.toFixed(2)}` : String(stats.openSafetyReportsCount)}
          hint={isAviation ? "Unbilled completed flights" : "Total reports filed this period"}
          icon={isAviation ? DollarSign : AlertCircle}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AttentionList
          title="Management Attention"
          description="Priority items for organizational oversight."
          items={stats.attentionItems}
        />
        <Card className="shadow-none border">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-tight">Organization Snapshot</CardTitle>
            <CardDescription className="text-xs">High-level operational profile.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assets</p>
              <p className="mt-2 text-2xl font-black">{isAviation ? stats.activeFleet : aircrafts.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">{isAviation ? 'Active Fleet Count' : 'Registered Equipment'}</p>
            </div>
            <div className="rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compliance Rating</p>
              <p className="mt-2 text-2xl font-black">{stats.averageComplianceScore}%</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">Avg. Audit performance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {isAviation ? (
          <Card className="flex flex-col shadow-none border">
            <CardHeader>
              <CardTitle>Fleet Utilization</CardTitle>
              <CardDescription>Top aircraft by logged Hobbs time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] pb-0">
              <ChartContainer config={{ hours: { label: 'Hours', color: 'hsl(var(--primary))' } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.aircraftChartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col shadow-none border">
            <CardHeader>
              <CardTitle>Occurrence Types</CardTitle>
              <CardDescription>Breakdown of reported safety events.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] pb-0">
              <ChartContainer config={{ value: { label: 'Reports', color: 'hsl(var(--chart-4))' } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.reportsChartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        <Card className="flex flex-col shadow-none border">
          <CardHeader>
            <CardTitle>Status Mix</CardTitle>
            <CardDescription>How {isAviation ? 'bookings' : 'items'} are resolving.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-[320px] flex-col justify-center">
            <ChartContainer
              config={{
                Completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
                Cancelled: { label: 'Cancelled', color: 'hsl(var(--chart-1))' },
                Active: { label: 'Active', color: 'hsl(var(--chart-3))' },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={stats.statusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {stats.statusChartData.map((entry, index) => (
                      <Cell key={`status-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 py-4 text-xs">
              {stats.statusChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="font-medium uppercase text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
        <Card className="flex flex-col overflow-hidden shadow-none border">
          <CardHeader>
            <CardTitle>Compliance Trend</CardTitle>
            <CardDescription>Latest finalized audit performance over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] overflow-hidden pt-2">
            <ChartContainer
              className="h-full w-full overflow-hidden aspect-auto"
              config={{ score: { label: 'Compliance %', color: 'hsl(var(--chart-2))' } }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.auditTrendData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-score)"
                    strokeWidth={3}
                    dot={{ r: 5, fill: 'var(--color-score)' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <AttentionList
          title="Upcoming Audits"
          description="Scheduled oversight already on the radar."
          items={stats.upcomingAudits.map((audit) => ({
            id: audit.id,
            title: `${audit.auditNumber} • ${audit.title}`,
            detail: `${format(new Date(audit.auditDate), 'dd MMM yyyy')} • ${audit.status}`,
            tone: 'warning',
          }))}
        />

        <AttentionList
          title="High Risks"
          description="Open hazards with high or critical exposure."
          items={stats.criticalRiskItems}
        />
      </div>
    </div>
  );
}
