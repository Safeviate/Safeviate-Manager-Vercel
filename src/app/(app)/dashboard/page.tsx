'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { QualityAudit, CorrectiveActionPlan } from '@/types/quality';
import type { SafetyReport } from '@/types/safety-report';
import type { Risk } from '@/types/risk';
import { 
  Plane, 
  CalendarCheck, 
  CalendarX, 
  Clock, 
  BarChart3,
  CheckSquare,
  ShieldAlert,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  FileWarning
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Line,
  LineChart,
  CartesianGrid
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  // --- Data Fetching ---
  const bookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
    [firestore, tenantId]
  );
  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  const auditsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null),
    [firestore, tenantId]
  );
  const capsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null),
    [firestore, tenantId]
  );
  const safetyReportsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null),
    [firestore, tenantId]
  );
  const risksQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/risks`)) : null),
    [firestore, tenantId]
  );

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);
  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);
  const { data: safetyReports, isLoading: isLoadingSafetyReports } = useCollection<SafetyReport>(safetyReportsQuery);
  const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  const isLoading = isLoadingBookings || isLoadingAircrafts || isLoadingAudits || isLoadingCaps || isLoadingSafetyReports || isLoadingRisks;

  // --- Calculations ---
  const stats = useMemo(() => {
    if (!bookings || !aircrafts || !audits || !caps || !safetyReports || !risks) return null;

    // Flight Stats
    const totalBookings = bookings.length;
    const cancelledBookings = bookings.filter(b => b.status === 'Cancelled' || b.status === 'Cancelled with Reason').length;
    const completedBookings = bookings.filter(b => b.status === 'Completed').length;
    
    let totalHours = 0;
    const hoursByAircraft: Record<string, number> = {};
    const aircraftMap = new Map(aircrafts.map(a => [a.id, a.tailNumber]));
    aircrafts.forEach(a => { hoursByAircraft[a.tailNumber] = 0; });

    bookings.forEach(b => {
      if (b.status === 'Completed' && b.postFlightData?.hobbs !== undefined && b.preFlightData?.hobbs !== undefined) {
        const duration = b.postFlightData.hobbs - b.preFlightData.hobbs;
        const flightHours = Math.max(0, duration);
        totalHours += flightHours;
        const tailNumber = aircraftMap.get(b.aircraftId);
        if (tailNumber) hoursByAircraft[tailNumber] = (hoursByAircraft[tailNumber] || 0) + flightHours;
      }
    });

    const aircraftChartData = Object.entries(hoursByAircraft)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);

    const statusChartData = [
      { name: 'Completed', value: completedBookings, fill: 'hsl(var(--chart-2))' },
      { name: 'Cancelled', value: cancelledBookings, fill: 'hsl(var(--chart-1))' },
      { name: 'Other', value: totalBookings - completedBookings - cancelledBookings, fill: 'hsl(var(--chart-3))' },
    ].filter(d => d.value > 0);

    // Quality Stats
    const totalAudits = audits.length;
    const finalizedAudits = audits.filter(a => a.status === 'Finalized' || a.status === 'Closed');
    const avgScore = finalizedAudits.length > 0 
        ? Math.round(finalizedAudits.reduce((acc, a) => acc + (a.complianceScore || 0), 0) / finalizedAudits.length)
        : 0;
    const openCaps = caps.filter(c => c.status === 'Open' || c.status === 'In Progress').length;

    const auditTrendData = finalizedAudits
        .sort((a, b) => new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime())
        .map(a => ({ date: a.auditDate.substring(0, 10), score: a.complianceScore || 0 }))
        .slice(-6);

    // Safety Stats
    const totalSafetyReports = safetyReports.length;
    const openSafetyReports = safetyReports.filter(r => r.status !== 'Closed').length;
    const totalHazards = risks.filter(r => r.status === 'Open').length;

    const reportsByType = safetyReports.reduce((acc, r) => {
        acc[r.reportType] = (acc[r.reportType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const reportsChartData = Object.entries(reportsByType).map(([name, value]) => ({ name, value }));

    return {
      totalHours: totalHours.toFixed(1),
      totalBookings,
      cancelledBookings,
      completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : '0',
      activeFleet: aircrafts.length,
      aircraftChartData,
      statusChartData,
      totalAudits,
      avgScore,
      openCaps,
      auditTrendData,
      totalSafetyReports,
      openSafetyReports,
      totalHazards,
      reportsChartData
    };
  }, [bookings, aircrafts, audits, caps, safetyReports, risks]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto w-full">
        <Skeleton className="h-10 w-[400px] rounded-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Tabs defaultValue="flight-stats" className="w-full flex flex-col h-full">
        <div className='px-1 shrink-0'>
            <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start">
                <TabsTrigger value="flight-stats" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Flight Stats</TabsTrigger>
                <TabsTrigger value="quality" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Quality</TabsTrigger>
                <TabsTrigger value="safety" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Safety</TabsTrigger>
            </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-10">
            {/* --- Flight Stats Content --- */}
            <TabsContent value="flight-stats" className="m-0 space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours Flown</CardTitle>
                            <Clock className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalHours}</div>
                            <p className="text-xs text-muted-foreground mt-1">Accumulated fleet time</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
                            <CalendarCheck className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalBookings}</div>
                            <p className="text-xs text-muted-foreground mt-1">All records</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled Bookings</CardTitle>
                            <CalendarX className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.cancelledBookings}</div>
                            <p className="text-xs text-muted-foreground mt-1">Operations loss</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                            <BarChart3 className="h-4 w-4 text-accent" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.completionRate}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Efficiency percentage</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Hours Flown per Aircraft</CardTitle>
                            <CardDescription>Utilization breakdown by tail number.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 pb-0 h-[300px]">
                            <ChartContainer config={{ hours: { label: 'Hours', color: 'hsl(var(--primary))' } }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.aircraftChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Booking Status Distribution</CardTitle>
                            <CardDescription>Current schedule vs historical outcomes.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 pb-0 h-[300px] flex flex-col justify-center">
                            <ChartContainer config={{ 
                            Completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
                            Cancelled: { label: 'Cancelled', color: 'hsl(var(--chart-1))' },
                            Other: { label: 'Other', color: 'hsl(var(--chart-3))' }
                            }}>
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
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            </ChartContainer>
                            <div className="flex flex-wrap justify-center gap-4 py-4 text-xs">
                            {stats.statusChartData.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                                <span className="text-muted-foreground font-medium uppercase">{item.name}: {item.value}</span>
                                </div>
                            ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* --- Quality Content --- */}
            <TabsContent value="quality" className="m-0 space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Audits</CardTitle>
                            <CheckSquare className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalAudits}</div>
                            <p className="text-xs text-muted-foreground mt-1">Conducted oversight activities</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Compliance Score</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.avgScore}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Mean performance across finalized audits</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Open CAPs</CardTitle>
                            <ClipboardCheck className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.openCaps}</div>
                            <p className="text-xs text-muted-foreground mt-1">Pending corrective actions</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="flex flex-col overflow-hidden">
                    <CardHeader>
                        <CardTitle>Compliance Score Trend</CardTitle>
                        <CardDescription>Performance score over the last 6 audits.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px] overflow-hidden pt-2">
                        <ChartContainer
                            className="h-full w-full overflow-hidden aspect-auto"
                            config={{ score: { label: 'Compliance %', color: 'hsl(var(--chart-2))' } }}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.auditTrendData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={3} dot={{ r: 5, fill: 'var(--color-score)' }} activeDot={{ r: 7 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* --- Safety Content --- */}
            <TabsContent value="safety" className="m-0 space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Safety Reports</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalSafetyReports}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total filed occurrences</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Open Investigations</CardTitle>
                            <FileWarning className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.openSafetyReports}</div>
                            <p className="text-xs text-muted-foreground mt-1">Ongoing safety reviews</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Hazards</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalHazards}</div>
                            <p className="text-xs text-muted-foreground mt-1">Identified in Risk Register</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Reports by Classification</CardTitle>
                            <CardDescription>Occurrences categorized by type.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ChartContainer config={{ value: { label: 'Reports', color: 'hsl(var(--chart-4))' } }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={stats.reportsChartData} margin={{ left: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={100} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Safety Reporting Status</CardTitle>
                            <CardDescription>Proactive vs Reactive indicators.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                            <div className="text-center space-y-2">
                                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                                <p className="text-sm text-muted-foreground">Safety trends analysis visualization is currently processing.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
