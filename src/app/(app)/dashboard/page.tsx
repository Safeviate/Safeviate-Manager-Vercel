'use client';

import Link from 'next/link';
import { useMemo, type ComponentType } from 'react';
import { collection, query } from 'firebase/firestore';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
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
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-card-border/70 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Nothing urgent right now.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const quickActions = [
  { label: 'Daily Schedule', href: '/bookings/schedule' },
  { label: 'Bookings History', href: '/bookings/history' },
  { label: 'Quality Audits', href: '/quality/audits' },
  { label: 'Safety Reports', href: '/safety/safety-reports' },
  { label: 'Risk Register', href: '/safety/risk-register' },
  { label: 'Accounting & Billing', href: '/admin/accounting' },
] as const;

function QuickActions() {

  return (
    <Card className="shadow-none border">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Jump into the areas management checks most often.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {quickActions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant="outline"
            className="justify-between h-11 font-semibold"
          >
            <Link href={action.href}>
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();

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

  const isLoading =
    isLoadingBookings ||
    isLoadingAircrafts ||
    isLoadingAudits ||
    isLoadingCaps ||
    isLoadingSafetyReports ||
    isLoadingRisks;

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
    const approvedPending = bookings.filter(
      (booking) => booking.status === 'Approved' || booking.status === 'Confirmed'
    );
    const overduePostFlight = approvedPending.filter((booking) => {
      if (!booking.date || !booking.endTime) return false;
      const bookingEnd = parseISO(`${booking.date}T${booking.endTime}:00`);
      return bookingEnd < now && booking.status !== 'Completed';
    });
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
      { name: 'Completed', value: completedBookings.length, fill: 'hsl(var(--chart-2))' },
      { name: 'Cancelled', value: cancelledBookings.length, fill: 'hsl(var(--chart-1))' },
      {
        name: 'Active',
        value: Math.max(0, bookings.length - completedBookings.length - cancelledBookings.length),
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

    const upcomingAudits = audits
      .filter((audit) => audit.status === 'Scheduled' || audit.status === 'In Progress')
      .sort((a, b) => new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime())
      .slice(0, 4);

    const openCaps = caps.filter((cap) => cap.status === 'Open' || cap.status === 'In Progress');
    const auditTrendData = finalizedAudits
      .sort((a, b) => new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime())
      .map((audit) => ({
        date: audit.auditDate.substring(0, 10),
        score: audit.complianceScore || 0,
      }))
      .slice(-6);

    const openSafetyReports = safetyReports.filter((report) => report.status !== 'Closed');
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
          detail: `${risk.hazardArea} • ${item.initialRiskAssessment?.riskLevel || 'Unrated'} risk`,
          tone: (item.initialRiskAssessment?.riskLevel === 'Critical' ? 'danger' : 'warning') as AttentionItemTone,
        }))
    );

    const todayOps = todayBookings
      .slice(0, 5)
      .map((booking) => ({
        id: booking.id,
        title: `${booking.bookingNumber} • ${aircraftMap.get(booking.aircraftId) || 'Unknown Aircraft'}`,
        detail: `${booking.startTime} - ${booking.endTime} • ${booking.status}`,
        tone: 'neutral' as AttentionItemTone,
      }));

    const attentionItems = [
      ...overduePostFlight.slice(0, 3).map((booking) => ({
        id: `postflight-${booking.id}`,
        title: `${booking.bookingNumber} requires closure`,
        detail: `${aircraftMap.get(booking.aircraftId) || 'Unknown Aircraft'} • Post-flight still incomplete`,
        tone: 'danger' as AttentionItemTone,
      })),
      ...upcomingAudits.slice(0, 2).map((audit) => ({
        id: `audit-${audit.id}`,
        title: `${audit.auditNumber} scheduled`,
        detail: `${audit.title} • ${format(new Date(audit.auditDate), 'dd MMM yyyy')}`,
        tone: 'warning' as AttentionItemTone,
      })),
      ...criticalRiskItems.slice(0, 2),
    ].slice(0, 6);

    return {
      totalHours: totalHours.toFixed(1),
      activeFleet: aircrafts.length,
      totalBookings: bookings.length,
      todayBookings: todayBookings.length,
      tomorrowBookings: tomorrowBookings.length,
      completionRate: bookings.length > 0 ? ((completedBookings.length / bookings.length) * 100).toFixed(1) : '0',
      overduePostFlightCount: overduePostFlight.length,
      unbilledCount: unbilledBookings.length,
      pendingRevenue,
      averageComplianceScore,
      openCapsCount: openCaps.length,
      openSafetyReportsCount: openSafetyReports.length,
      openHazardsCount: openHazards.length,
      aircraftChartData,
      statusChartData,
      auditTrendData,
      reportsChartData,
      attentionItems,
      todayOps,
      upcomingAudits,
      criticalRiskItems,
    };
  }, [bookings, aircrafts, audits, caps, safetyReports, risks]);

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
        <div className="grid gap-6 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-[280px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mx-auto flex h-full w-full max-w-[1350px] flex-col gap-6 overflow-y-auto pb-10">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Today's Flights"
          value={String(stats.todayBookings)}
          hint={`${stats.tomorrowBookings} scheduled for tomorrow`}
          icon={CalendarRange}
        />
        <MetricCard
          title="Attention Required"
          value={String(stats.overduePostFlightCount)}
          hint="Overdue post-flight or immediate oversight items"
          icon={Siren}
        />
        <MetricCard
          title="Compliance Score"
          value={`${stats.averageComplianceScore}%`}
          hint={`${stats.openCapsCount} open corrective actions`}
          icon={ClipboardCheck}
        />
        <MetricCard
          title="Pending Revenue"
          value={`$${stats.pendingRevenue.toFixed(2)}`}
          hint={`${stats.unbilledCount} completed flights still unbilled`}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AttentionList
          title="Management Attention"
          description="The first items leadership should review today."
          items={stats.attentionItems}
        />
        <Card className="shadow-none border">
          <CardHeader>
            <CardTitle>Operational Snapshot</CardTitle>
            <CardDescription>What the operation looks like right now.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fleet</p>
              <p className="mt-2 text-2xl font-bold">{stats.activeFleet}</p>
              <p className="text-xs text-muted-foreground">Active aircraft in company records</p>
            </div>
            <div className="rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completion Rate</p>
              <p className="mt-2 text-2xl font-bold">{stats.completionRate}%</p>
              <p className="text-xs text-muted-foreground">Completed flights as a share of total bookings</p>
            </div>
            <div className="rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Open Safety Reports</p>
              <p className="mt-2 text-2xl font-bold">{stats.openSafetyReportsCount}</p>
              <p className="text-xs text-muted-foreground">Reports still under review or action</p>
            </div>
            <div className="rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Open Hazards</p>
              <p className="mt-2 text-2xl font-bold">{stats.openHazardsCount}</p>
              <p className="text-xs text-muted-foreground">Live items in the risk register</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="shadow-none border xl:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Operation</CardTitle>
            <CardDescription>Current flying programme and high-level live activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.todayOps.length > 0 ? (
              stats.todayOps.map((item) => (
                <div key={item.id} className="rounded-lg border border-card-border/70 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">
                      Today
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-card-border/70 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No flights scheduled for today.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <QuickActions />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
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

        <Card className="flex flex-col shadow-none border">
          <CardHeader>
            <CardTitle>Booking Status Mix</CardTitle>
            <CardDescription>How bookings are resolving operationally.</CardDescription>
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="flex flex-col shadow-none border">
          <CardHeader>
            <CardTitle>Safety Reports by Type</CardTitle>
            <CardDescription>Where most reporting volume is currently coming from.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{ value: { label: 'Reports', color: 'hsl(var(--chart-4))' } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={stats.reportsChartData} margin={{ left: 20, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    width={110}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader>
            <CardTitle>Executive Snapshot</CardTitle>
            <CardDescription>One-screen summary for company oversight.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <Plane className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Operations</p>
                <p className="text-xs text-muted-foreground">
                  {stats.todayBookings} flights today, {stats.tomorrowBookings} tomorrow, {stats.totalBookings} total records.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <CheckSquare className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Compliance</p>
                <p className="text-xs text-muted-foreground">
                  {stats.averageComplianceScore}% average score with {stats.openCapsCount} open CAPs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Safety</p>
                <p className="text-xs text-muted-foreground">
                  {stats.openSafetyReportsCount} open reports and {stats.openHazardsCount} open hazards need monitoring.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <TrendingUp className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Commercial</p>
                <p className="text-xs text-muted-foreground">
                  {stats.unbilledCount} completed flights still unbilled, worth ${stats.pendingRevenue.toFixed(2)}.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Closeout Pressure</p>
                <p className="text-xs text-muted-foreground">
                  {stats.overduePostFlightCount} bookings appear overdue for post-flight completion.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-card-border/70 bg-muted/10 p-4">
              <FileWarning className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Focus</p>
                <p className="text-xs text-muted-foreground">
                  Use this page for daily management awareness, then drill into schedule, audits, safety, and billing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
