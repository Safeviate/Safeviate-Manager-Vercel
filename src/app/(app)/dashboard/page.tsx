'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import { 
  Plane, 
  CalendarCheck, 
  CalendarX, 
  Clock, 
  BarChart3,
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
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export default function DashboardPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const bookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
    [firestore, tenantId]
  );
  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);

  const isLoading = isLoadingBookings || isLoadingAircrafts;

  const stats = useMemo(() => {
    if (!bookings || !aircrafts) return null;

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
        if (tailNumber) {
          hoursByAircraft[tailNumber] = (hoursByAircraft[tailNumber] || 0) + flightHours;
        }
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

    return {
      totalHours: totalHours.toFixed(1),
      totalBookings,
      cancelledBookings,
      completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : '0',
      activeFleet: aircrafts.length,
      aircraftChartData,
      statusChartData
    };
  }, [bookings, aircrafts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
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
    </div>
  );
}
