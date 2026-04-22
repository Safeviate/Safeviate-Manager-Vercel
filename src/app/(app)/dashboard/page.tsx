'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { useTheme } from '@/components/theme-provider';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { QualityAudit, CorrectiveActionPlan } from '@/types/quality';
import type { SafetyReport } from '@/types/safety-report';
import type { Risk } from '@/types/risk';
import {
  CalendarRange,
  ClipboardCheck,
  DollarSign,
  Plane,
  ShieldAlert,
  Siren,
  LayoutList,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { parseJsonResponse } from '@/lib/safe-json';
import { CardControlHeader } from '@/components/page-header';

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};
import { cn } from '@/lib/utils';

type AttentionItemTone = 'danger' | 'warning' | 'neutral';
const DASHBOARD_SECTION_CARD_CLASS = 'overflow-hidden border bg-background shadow-none';
const DASHBOARD_SECTION_HEADER_CLASS = 'border-b bg-muted/5 px-4 py-3';

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  modern = false,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  modern?: boolean;
}) {
  return (
    <Card
      className={cn(
        DASHBOARD_SECTION_CARD_CLASS,
        modern && 'border-slate-200/80 bg-white/95'
      )}
    >
      <CardHeader className={cn(DASHBOARD_SECTION_HEADER_CLASS, 'flex flex-row items-center justify-between space-y-0')}>
        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">{title}</CardTitle>
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            modern ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100' : 'text-primary'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <div className={cn('text-2xl font-black', modern && 'text-[2rem] leading-none tracking-tight text-slate-900')}>{value}</div>
        <p className={cn('mt-1 text-[10px] font-medium text-muted-foreground uppercase', modern && 'mt-2 text-[11px] tracking-wide text-slate-500')}>{hint}</p>
      </CardContent>
    </Card>
  );
}

function AttentionList({
  title,
  description,
  items,
  modern = false,
}: {
  title: string;
  description: string;
  items: { id: string; title: string; detail: string; tone?: AttentionItemTone }[];
  modern?: boolean;
}) {
  const toneClassMap: Record<AttentionItemTone, string> = {
    danger: 'border-destructive/30 bg-destructive/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    neutral: 'border-card-border/60 bg-muted/10',
  };

  return (
    <Card className={cn(DASHBOARD_SECTION_CARD_CLASS, 'flex flex-col', modern && 'border-slate-200/80 bg-white/95')}>
      <CardHeader className={cn(DASHBOARD_SECTION_HEADER_CLASS, modern && 'py-4')}>
        <CardTitle className={cn('text-sm font-black uppercase tracking-tight', modern && 'text-[15px] tracking-[0.14em] text-slate-900')}>{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-4 py-4">
        <ScrollArea className="h-full pr-3">
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-lg border px-4 py-3',
                    modern && 'rounded-2xl border-slate-200/90 bg-slate-50/70 shadow-sm',
                    toneClassMap[item.tone || 'neutral']
                  )}
                >
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-card-border/70 bg-muted/5 px-4 py-8 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-foreground/80">No items requiring immediate action.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { tenantId } = useUserProfile();
  const { tenant } = useTenantConfig();
  const { uiMode } = useTheme();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [aircrafts, setAircrafts] = useState<Aircraft[] | null>(null);
  const [audits, setAudits] = useState<QualityAudit[] | null>(null);
  const [caps, setCaps] = useState<CorrectiveActionPlan[] | null>(null);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[] | null>(null);
  const [risks, setRisks] = useState<Risk[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAviation = tenant?.industry?.startsWith('Aviation') ?? true;
  const isModern = uiMode === 'modern';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
        const payload = (await parseJsonResponse<{
          bookings?: Booking[];
          aircrafts?: Aircraft[];
          audits?: QualityAudit[];
          caps?: CorrectiveActionPlan[];
          reports?: SafetyReport[];
          risks?: Risk[];
        }>(response)) ?? {};
        if (cancelled) return;
        setBookings(payload.bookings ?? []);
        setAircrafts(payload.aircrafts ?? []);
        setAudits(payload.audits ?? []);
        setCaps(payload.caps ?? []);
        setSafetyReports(payload.reports ?? []);
        setRisks(payload.risks ?? []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const stats = useMemo(() => {
    if (!bookings || !aircrafts || !audits || !caps || !safetyReports || !risks) return null;

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
      .sort((a, b) => parseLocalDate(a.auditDate).getTime() - parseLocalDate(b.auditDate).getTime())
      .map((audit) => ({
        date: format(parseLocalDate(audit.auditDate), 'MMM'),
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
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr]">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div
      className={cn(
        'mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-col gap-6 overflow-hidden',
        isModern && 'gap-7 px-2 md:px-1'
      )}
    >
      <Card className={cn(DASHBOARD_SECTION_CARD_CLASS, 'flex min-h-0 flex-1 flex-col', isModern && 'border-slate-200/80 bg-white/95')}>
        <CardControlHeader
          className={cn(
            'sticky top-0 z-10 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
            isModern && 'bg-white/95 supports-[backdrop-filter]:bg-white/85'
          )}
          context={
            <div className="max-w-2xl py-1">
              <p className="max-w-xl text-[10px] font-medium text-muted-foreground sm:text-xs">
                Monitor flights, compliance posture, and management attention from one cleaner command surface.
              </p>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2 py-1">
              <Badge className="border border-card-border/70 bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-foreground hover:bg-muted/10">
                {stats.todayBookings} flights today
              </Badge>
              <Badge className="border border-card-border/70 bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-foreground hover:bg-muted/10">
                {stats.averageComplianceScore}% compliance score
              </Badge>
              <Badge className="border border-card-border/70 bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-foreground hover:bg-muted/10">
                {stats.openCapsCount} open actions
              </Badge>
            </div>
          }
          mobileActions={
            <div className="flex flex-wrap gap-2 py-1">
              <Badge className="border border-card-border/70 bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-foreground hover:bg-muted/10">
                {stats.todayBookings} flights today
              </Badge>
              <Badge className="border border-card-border/70 bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-foreground hover:bg-muted/10">
                {stats.averageComplianceScore}% compliance score
              </Badge>
              <Badge className="border border-card-border/70 bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-foreground hover:bg-muted/10">
                {stats.openCapsCount} open actions
              </Badge>
            </div>
          }
        />

        <CardContent className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-6 pb-10 md:p-8 md:pb-10">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {isAviation ? (
                  <MetricCard
                    title="Today's Flights"
                    value={String(stats.todayBookings)}
                    hint={`${stats.tomorrowBookings} scheduled for tomorrow`}
                    icon={CalendarRange}
                    modern={isModern}
                  />
                ) : (
                  <MetricCard
                    title="Active Tasks"
                    value={String(stats.openCapsCount)}
                    hint="Corrective actions in progress"
                    icon={LayoutList}
                    modern={isModern}
                  />
                )}
                <MetricCard
                  title="Attention Required"
                  value={String(stats.openSafetyReportsCount + stats.openHazardsCount)}
                  hint="Reports and hazards requiring review"
                  icon={Siren}
                  modern={isModern}
                />
                <MetricCard
                  title="Compliance Score"
                  value={`${stats.averageComplianceScore}%`}
                  hint={`${stats.openCapsCount} open corrective actions`}
                  icon={ClipboardCheck}
                  modern={isModern}
                />
                <MetricCard
                  title={isAviation ? 'Pending Revenue' : 'Safety Submissions'}
                  value={isAviation ? `$${stats.pendingRevenue.toFixed(2)}` : String(stats.openSafetyReportsCount)}
                  hint={isAviation ? 'Unbilled completed flights' : 'Total reports filed this period'}
                  icon={isAviation ? DollarSign : AlertCircle}
                  modern={isModern}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <AttentionList
                  title="Management Attention"
                  description="Priority items for organizational oversight."
                  items={stats.attentionItems}
                  modern={isModern}
                />
                <Card className={cn(DASHBOARD_SECTION_CARD_CLASS, isModern && 'border-slate-200/80 bg-white/95')}>
                  <CardHeader className={DASHBOARD_SECTION_HEADER_CLASS}>
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Organization Snapshot</CardTitle>
                    <CardDescription className="text-xs">High-level operational profile.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-1">
                    <div className={cn('rounded-lg border border-card-border/70 bg-muted/10 p-4', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/80')}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assets</p>
                      <p className="mt-2 text-2xl font-black">{isAviation ? stats.activeFleet : (aircrafts?.length ?? 0)}</p>
                      <p className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">{isAviation ? 'Active Fleet Count' : 'Registered Equipment'}</p>
                    </div>
                    <div className={cn('rounded-lg border border-card-border/70 bg-muted/10 p-4', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/80')}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compliance Rating</p>
                      <p className="mt-2 text-2xl font-black">{stats.averageComplianceScore}%</p>
                      <p className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">Avg. Audit performance</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {isAviation ? (
                  <Card className={cn(DASHBOARD_SECTION_CARD_CLASS, 'flex flex-col', isModern && 'border-slate-200/80 bg-white/95')}>
                    <CardHeader className={DASHBOARD_SECTION_HEADER_CLASS}>
                      <CardTitle>Fleet Utilization</CardTitle>
                      <CardDescription>Top aircraft by logged Hobbs time.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px] px-4 pb-0 pt-3">
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
                  <Card className={cn(DASHBOARD_SECTION_CARD_CLASS, 'flex flex-col', isModern && 'border-slate-200/80 bg-white/95')}>
                    <CardHeader className={DASHBOARD_SECTION_HEADER_CLASS}>
                      <CardTitle>Occurrence Types</CardTitle>
                      <CardDescription>Breakdown of reported safety events.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px] px-4 pb-0 pt-3">
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

                <Card className={cn(DASHBOARD_SECTION_CARD_CLASS, 'flex flex-col', isModern && 'border-slate-200/80 bg-white/95')}>
                  <CardHeader className={DASHBOARD_SECTION_HEADER_CLASS}>
                    <CardTitle>Status Mix</CardTitle>
                    <CardDescription>How {isAviation ? 'bookings' : 'items'} are resolving.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex h-[320px] flex-col justify-center px-4 py-4">
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
                <Card className={cn(DASHBOARD_SECTION_CARD_CLASS, 'flex flex-col overflow-hidden', isModern && 'border-slate-200/80 bg-white/95')}>
                  <CardHeader className={DASHBOARD_SECTION_HEADER_CLASS}>
                    <CardTitle>Compliance Trend</CardTitle>
                    <CardDescription>Latest finalized audit performance over time.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[320px] overflow-hidden px-4 pt-3">
                    <ChartContainer
                      className="aspect-auto h-full w-full overflow-hidden"
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
                detail: `${format(parseLocalDate(audit.auditDate), 'dd MMM yyyy')} • ${audit.status}`,
                tone: 'warning',
              }))}
              modern={isModern}
            />

            <AttentionList
              title="High Risks"
              description="Open hazards with high or critical exposure."
              items={stats.criticalRiskItems}
              modern={isModern}
            />
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

}
