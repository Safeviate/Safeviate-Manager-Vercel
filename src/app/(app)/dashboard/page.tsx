'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { parseJsonResponse } from '@/lib/safe-json';
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import type { IndustryType } from '@/types/quality';

type DashboardIndustry = 'ATO' | 'AOC' | 'AMO' | 'OHS';
type IndustryTab = { value: string; label: string };
type SummaryPayload = {
  aircrafts?: Aircraft[];
  bookings?: Array<Pick<Booking, 'aircraftId' | 'status'> & {
    date?: string;
    preFlightData?: { hobbs?: number; fuelUpliftGallons?: number; fuelUpliftLitres?: number; oilUplift?: number };
    postFlightData?: { hobbs?: number };
  }>;
};

type FleetRow = {
  aircraft: Aircraft;
  loggedHours: number;
  targetHours: number;
  hoursOnGround: number;
  hoursInMaintenance: number;
  targetMet: boolean;
  remainingHours: number | null;
  serviceState: 'available' | 'nearing' | 'overdue';
};

type FleetPeriod = 'week' | 'month' | 'all';

type FleetTrendPoint = {
  label: string;
  flightHours: number;
  maintenanceHours: number;
  utilisationHours: number;
  utilisationPercent: number;
};

const DASHBOARD_SHELL_CLASS = 'overflow-hidden border bg-background shadow-none';
const ATC_TABS: IndustryTab[] = [
  { value: 'fleet', label: 'Fleet' },
  { value: 'overview', label: 'Overview' },
  { value: 'instructors', label: 'Instructors' },
  { value: 'students', label: 'Students' },
  { value: 'safety', label: 'Safety' },
];

const INDUSTRY_TABS: Record<DashboardIndustry, IndustryTab[]> = {
  ATO: ATC_TABS,
  AOC: [
    { value: 'overview', label: 'Overview' },
    { value: 'dispatch', label: 'Dispatch' },
    { value: 'fleet', label: 'Fleet' },
    { value: 'safety', label: 'Safety' },
    { value: 'finance', label: 'Finance' },
  ],
  AMO: [
    { value: 'overview', label: 'Overview' },
    { value: 'workpacks', label: 'Workpacks' },
    { value: 'defects', label: 'Defects' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'assets', label: 'Assets' },
  ],
  OHS: [
    { value: 'overview', label: 'Overview' },
    { value: 'incidents', label: 'Incidents' },
    { value: 'hazards', label: 'Hazards' },
    { value: 'actions', label: 'Actions' },
    { value: 'compliance', label: 'Compliance' },
  ],
};

const INDUSTRY_TITLES: Record<DashboardIndustry, string> = {
  ATO: 'ATO Dashboard',
  AOC: 'Charter Operations Dashboard',
  AMO: 'Maintenance Dashboard',
  OHS: 'Safety Dashboard',
};

const INDUSTRY_DESCRIPTIONS: Record<DashboardIndustry, string> = {
  ATO: 'Fleet first. The remaining sections will be built one at a time.',
  AOC: 'The operations dashboard shell will be built section by section.',
  AMO: 'The maintenance dashboard shell will be built section by section.',
  OHS: 'The safety dashboard shell will be built section by section.',
};

const INDUSTRY_SWITCHER: IndustryTab[] = [
  { value: 'ATO', label: 'ATO' },
  { value: 'AOC', label: 'AOC' },
  { value: 'AMO', label: 'AMO' },
  { value: 'OHS', label: 'OHS' },
];

const EMPTY_NOTE = 'This section is intentionally empty for now. We will add content in the next build stage.';
const DEFAULT_FLEET_TARGET_HOURS = 20;

const resolveIndustryKey = (industry?: IndustryType | string | null): DashboardIndustry => {
  if (industry === 'Aviation: Charter / Ops (AOC)') return 'AOC';
  if (industry === 'Aviation: Maintenance (AMO)') return 'AMO';
  if (industry === 'General: Occupational Health & Safety (OHS)') return 'OHS';
  return 'ATO';
};

const getServiceState = (aircraft: Aircraft) => {
  const reading = aircraft.currentTacho ?? aircraft.currentHobbs ?? 0;
  const thresholds = [aircraft.tachoAtNext50Inspection, aircraft.tachoAtNext100Inspection].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  const nextThreshold = thresholds.length > 0 ? Math.min(...thresholds) : null;

  if (nextThreshold === null) {
    return { remainingHours: null, serviceState: 'available' as const };
  }

  const remainingHours = parseFloat(Math.max(0, nextThreshold - reading).toFixed(1));

  if (reading > nextThreshold) {
    return { remainingHours: 0, serviceState: 'overdue' as const };
  }

  if (remainingHours <= 10) {
    return { remainingHours, serviceState: 'nearing' as const };
  }

  return { remainingHours, serviceState: 'available' as const };
};

const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

const formatTrendLabel = (date: Date, period: FleetPeriod) => {
  if (period === 'all') {
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const buildTrendBuckets = (period: FleetPeriod) => {
  const now = new Date();
  const buckets: Date[] = [];

  if (period === 'week') {
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      buckets.push(date);
    }
    return buckets;
  }

  if (period === 'month') {
    for (let i = 4; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i * 7);
      buckets.push(date);
    }
    return buckets;
  }

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setMonth(now.getMonth() - i);
    buckets.push(date);
  }

  return buckets;
};

export default function DashboardPage() {
  const { uiMode } = useTheme();
  const { tenant } = useTenantConfig();
  const [activeIndustry, setActiveIndustry] = useState<DashboardIndustry>('ATO');
  const [activeTab, setActiveTab] = useState('fleet');
  const [summary, setSummary] = useState<SummaryPayload>({});
  const [fleetTargetHours, setFleetTargetHours] = useState(DEFAULT_FLEET_TARGET_HOURS);
  const [fleetPeriod, setFleetPeriod] = useState<FleetPeriod>('month');
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTargetLoading, setIsTargetLoading] = useState(true);

  const isModern = uiMode === 'modern';
  const tenantIndustry = useMemo(() => resolveIndustryKey(tenant?.industry), [tenant?.industry]);
  const tabs = INDUSTRY_TABS[activeIndustry];

  useEffect(() => {
    setActiveIndustry(tenantIndustry);
  }, [tenantIndustry]);

  useEffect(() => {
    setActiveTab(activeIndustry === 'ATO' ? 'fleet' : tabs[0]?.value ?? 'overview');
  }, [activeIndustry, tabs]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
        const payload = (await parseJsonResponse<SummaryPayload>(response)) ?? {};
        if (!cancelled) {
          setSummary(payload);
        }
      } catch {
        if (!cancelled) setSummary({});
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFleetTarget = async () => {
      setIsTargetLoading(true);
      try {
        const response = await fetch('/api/tenant-config', { cache: 'no-store' });
        const payload = response.ok ? await response.json().catch(() => ({})) : {};
        const config = payload?.config && typeof payload.config === 'object' ? (payload.config as Record<string, unknown>) : null;
        const value = config?.['fleet-target-hours'];
        const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : DEFAULT_FLEET_TARGET_HOURS;
        if (!cancelled && Number.isFinite(parsed) && parsed > 0) {
          setFleetTargetHours(parsed);
        }
      } catch {
        if (!cancelled) setFleetTargetHours(DEFAULT_FLEET_TARGET_HOURS);
      } finally {
        if (!cancelled) setIsTargetLoading(false);
      }
    };

    void loadFleetTarget();
    return () => {
      cancelled = true;
    };
  }, []);

  const fleetRows = useMemo<FleetRow[]>(() => {
    const aircrafts = Array.isArray(summary.aircrafts) ? summary.aircrafts : [];
    const bookings = Array.isArray(summary.bookings) ? summary.bookings : [];
    const targetHours = fleetTargetHours;
    const now = new Date();
    const periodStart = (() => {
      if (fleetPeriod === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return start;
      }
      if (fleetPeriod === 'month') {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        return start;
      }
      return null;
    })();
    const filteredBookings = periodStart
      ? bookings.filter((booking) => {
          if (!booking.date) return false;
          const bookingDate = new Date(booking.date);
          return !Number.isNaN(bookingDate.getTime()) && bookingDate >= periodStart && bookingDate <= now;
        })
      : bookings;

    return aircrafts
      .map((aircraft) => {
        const loggedHours = filteredBookings.reduce((sum, booking) => {
          if (booking.aircraftId !== aircraft.id) return sum;
          const pre = booking.preFlightData?.hobbs;
          const post = booking.postFlightData?.hobbs;
          if (pre === undefined || post === undefined) return sum;
          return sum + Math.max(0, post - pre);
        }, 0);

        const service = getServiceState(aircraft);
        const hoursOnGround = parseFloat(Math.max(targetHours - loggedHours, 0).toFixed(1));
        const hoursInMaintenance = parseFloat(
          (service.serviceState === 'overdue' ? Math.max(loggedHours - targetHours, 0) : 0).toFixed(1)
        );

        return {
          aircraft,
          loggedHours: parseFloat(loggedHours.toFixed(1)),
          targetHours,
          hoursOnGround,
          hoursInMaintenance,
          targetMet: loggedHours >= targetHours,
          remainingHours: service.remainingHours,
          serviceState: service.serviceState,
        };
      })
      .sort((a, b) => b.loggedHours - a.loggedHours);
  }, [fleetPeriod, fleetTargetHours, summary.aircrafts, summary.bookings]);

  useEffect(() => {
    if (!selectedAircraftId && fleetRows[0]?.aircraft.id) {
      setSelectedAircraftId(fleetRows[0].aircraft.id);
    }
  }, [fleetRows, selectedAircraftId]);

  const fleetTrend = useMemo<FleetTrendPoint[]>(() => {
    const bookings = Array.isArray(summary.bookings) ? summary.bookings : [];
    const buckets = buildTrendBuckets(fleetPeriod);
    const now = new Date();
    const bucketed = buckets.map((bucketStart) => {
      const bucketEnd = new Date(bucketStart);
      if (fleetPeriod === 'all') {
        bucketEnd.setMonth(bucketStart.getMonth() + 1);
      } else if (fleetPeriod === 'month') {
        bucketEnd.setDate(bucketStart.getDate() + 7);
      } else {
        bucketEnd.setDate(bucketStart.getDate() + 1);
      }
      return {
        start: bucketStart,
        end: bucketEnd > now ? now : bucketEnd,
      };
    });

    return bucketed.map(({ start, end }) => {
      const relevantBookings = bookings.filter((booking) => {
        if (!booking.date) return false;
        const bookingDate = new Date(booking.date);
        return !Number.isNaN(bookingDate.getTime()) && bookingDate >= start && bookingDate < end;
      });

      const flightHours = relevantBookings.reduce((sum, booking) => {
        const pre = booking.preFlightData?.hobbs;
        const post = booking.postFlightData?.hobbs;
        if (pre === undefined || post === undefined) return sum;
        return sum + Math.max(0, post - pre);
      }, 0);

      const maintenanceHours = relevantBookings.reduce((sum, booking) => {
        const pre = booking.preFlightData?.hobbs;
        const post = booking.postFlightData?.hobbs;
        if (pre === undefined || post === undefined) return sum;
        const logged = Math.max(0, post - pre);
        return sum + Math.max(0, logged * 0.15);
      }, 0);

      const utilisationHours = Math.max(0, flightHours + maintenanceHours);
      const utilisationPercent = fleetTargetHours > 0 ? Math.min(100, (flightHours / fleetTargetHours) * 100) : 0;

      return {
        label: formatTrendLabel(start, fleetPeriod),
        flightHours: parseFloat(flightHours.toFixed(1)),
        maintenanceHours: parseFloat(maintenanceHours.toFixed(1)),
        utilisationHours: parseFloat(utilisationHours.toFixed(1)),
        utilisationPercent: parseFloat(utilisationPercent.toFixed(1)),
      };
    });
  }, [fleetPeriod, fleetTargetHours, summary.bookings]);

  const fleetTotals = useMemo(() => {
    const inService = fleetRows.filter((row) => row.serviceState === 'available').length;
    const nearingService = fleetRows.filter((row) => row.serviceState === 'nearing').length;
    const overdueService = fleetRows.filter((row) => row.serviceState === 'overdue').length;
    const totalHours = fleetRows.reduce((sum, row) => sum + row.loggedHours, 0);
    const totalTargetHours = fleetRows.reduce((sum, row) => sum + row.targetHours, 0);
    const bookings = Array.isArray(summary.bookings) ? summary.bookings : [];
    const totalFuelLitres = bookings.reduce((sum, booking) => sum + (booking.preFlightData?.fuelUpliftLitres || 0), 0);
    const totalFuelGallons = bookings.reduce((sum, booking) => sum + (booking.preFlightData?.fuelUpliftGallons || 0), 0);
    const totalOilUplift = bookings.reduce((sum, booking) => sum + (booking.preFlightData?.oilUplift || 0), 0);
    const averageUtilisation = fleetRows.length > 0 ? totalHours / fleetRows.length : 0;
    const highestUtilized = fleetRows[0];
    const lowestUtilized = fleetRows.at(-1);
    const metTargetCount = fleetRows.filter((row) => row.targetMet).length;

    return {
      inService,
      nearingService,
      overdueService,
      totalHours: parseFloat(totalHours.toFixed(1)),
      totalTargetHours: parseFloat(totalTargetHours.toFixed(1)),
      totalFuelLitres: parseFloat(totalFuelLitres.toFixed(1)),
      totalFuelGallons: parseFloat(totalFuelGallons.toFixed(1)),
      totalOilUplift: parseFloat(totalOilUplift.toFixed(1)),
      averageUtilisation: parseFloat(averageUtilisation.toFixed(1)),
      metTargetCount,
      highestUtilized,
      lowestUtilized,
    };
  }, [fleetRows, summary.bookings]);

  const targetHoursLabel = isTargetLoading ? 'Loading...' : formatHours(fleetTargetHours);
  const selectedAircraft = fleetRows.find((row) => row.aircraft.id === selectedAircraftId) || fleetRows[0] || null;
  const selectedAircraftTrend = useMemo<FleetTrendPoint[]>(() => {
    if (!selectedAircraft) return [];
    const bookings = Array.isArray(summary.bookings) ? summary.bookings : [];
    const now = new Date();
    const buckets = buildTrendBuckets(fleetPeriod).map((bucketStart) => {
      const bucketEnd = new Date(bucketStart);
      if (fleetPeriod === 'all') {
        bucketEnd.setMonth(bucketStart.getMonth() + 1);
      } else if (fleetPeriod === 'month') {
        bucketEnd.setDate(bucketStart.getDate() + 7);
      } else {
        bucketEnd.setDate(bucketStart.getDate() + 1);
      }
      return {
        start: bucketStart,
        end: bucketEnd > now ? now : bucketEnd,
      };
    });

    return buckets.map(({ start, end }) => {
      const relevantBookings = bookings.filter((booking) => {
        if (booking.aircraftId !== selectedAircraft.aircraft.id || !booking.date) return false;
        const bookingDate = new Date(booking.date);
        return !Number.isNaN(bookingDate.getTime()) && bookingDate >= start && bookingDate < end;
      });

      const flightHours = relevantBookings.reduce((sum, booking) => {
        const pre = booking.preFlightData?.hobbs;
        const post = booking.postFlightData?.hobbs;
        if (pre === undefined || post === undefined) return sum;
        return sum + Math.max(0, post - pre);
      }, 0);

      const maintenanceHours = relevantBookings.reduce((sum, booking) => {
        const pre = booking.preFlightData?.hobbs;
        const post = booking.postFlightData?.hobbs;
        if (pre === undefined || post === undefined) return sum;
        const logged = Math.max(0, post - pre);
        return sum + Math.max(0, logged * 0.15);
      }, 0);

      const utilisationHours = Math.max(0, flightHours + maintenanceHours);
      const utilisationPercent = fleetTargetHours > 0 ? Math.min(100, (flightHours / fleetTargetHours) * 100) : 0;

      return {
        label: formatTrendLabel(start, fleetPeriod),
        flightHours: parseFloat(flightHours.toFixed(1)),
        maintenanceHours: parseFloat(maintenanceHours.toFixed(1)),
        utilisationHours: parseFloat(utilisationHours.toFixed(1)),
        utilisationPercent: parseFloat(utilisationPercent.toFixed(1)),
      };
    });
  }, [fleetPeriod, fleetTargetHours, selectedAircraft, summary.bookings]);

  return (
    <div
      className={cn(
        'mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-col gap-6 overflow-hidden',
        isModern && 'gap-7 px-2 md:px-1'
      )}
    >
      <Card className={cn(DASHBOARD_SHELL_CLASS, 'flex min-h-0 flex-1 flex-col', isModern && 'border-slate-200/80 bg-white/95')}>
        <CardHeader
          className={cn(
            'sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
            isModern && 'bg-white/95 supports-[backdrop-filter]:bg-white/85'
          )}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-black uppercase tracking-tight">{INDUSTRY_TITLES[activeIndustry]}</CardTitle>
              <Tabs value={activeIndustry} onValueChange={(value) => setActiveIndustry(value as DashboardIndustry)} className="w-full md:w-auto">
                <TabsList className="grid h-auto w-full grid-cols-4 gap-2 rounded-none bg-transparent p-0 md:w-auto">
                  {INDUSTRY_SWITCHER.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="rounded-none border border-input px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
          <CardDescription className="text-xs">
            {INDUSTRY_DESCRIPTIONS[activeIndustry]}
            <span className="ml-2 font-black uppercase tracking-[0.18em] text-foreground/70">
              Active: {tabs.find((tab) => tab.value === activeTab)?.label || tabs[0]?.label}
            </span>
            {activeIndustry === 'ATO' ? (
              <span className="ml-2 font-black uppercase tracking-[0.18em] text-foreground/70">
                Period: {fleetPeriod === 'week' ? 'Last 7 days' : fleetPeriod === 'month' ? 'Last 30 days' : 'All time'}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-6 pb-10 md:p-8 md:pb-10">
              <Tabs key={activeIndustry} value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-none border-b bg-transparent p-0">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-none border-b-2 border-transparent px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {activeIndustry === 'ATO' ? (
                  <>
                    <TabsContent value="fleet" className="m-0 space-y-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Period</span>
                        {(['week', 'month', 'all'] as FleetPeriod[]).map((period) => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => setFleetPeriod(period)}
                            className={cn(
                              'rounded-none border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]',
                              fleetPeriod === period ? 'border-foreground text-foreground' : 'border-input text-muted-foreground'
                            )}
                          >
                            {period === 'week' ? '7 Days' : period === 'month' ? '30 Days' : 'All Time'}
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                        <Card className={cn(DASHBOARD_SHELL_CLASS, 'flex min-h-[460px] flex-col', isModern && 'border-slate-200/80 bg-white/95')}>
                          <CardHeader className="border-b bg-muted/5 px-4 py-3">
                            <CardTitle className="text-sm font-black uppercase tracking-tight">Fleet Overview</CardTitle>
                            <CardDescription className="text-xs">Aircraft readiness, fuel, oil, and utilisation at a glance.</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                            <StatTile label="In Service" value={String(fleetTotals.inService)} hint="Aircraft ready for training" />
                            <StatTile label="Nearing Service" value={String(fleetTotals.nearingService)} hint="Within warning band" />
                            <StatTile label="Overdue" value={String(fleetTotals.overdueService)} hint="Past service threshold" />
                            <StatTile label="Fleet Hours" value={formatHours(fleetTotals.totalHours)} hint="Logged flight time" />
                            <StatTile label="Fuel Uplift" value={`${fleetTotals.totalFuelLitres.toFixed(1)}L`} hint={`${fleetTotals.totalFuelGallons.toFixed(1)} gal logged`} />
                            <StatTile label="Oil Uplift" value={`${fleetTotals.totalOilUplift.toFixed(1)}`} hint="Logged oil uplift" />
                            <StatTile label="Avg Utilisation" value={formatHours(fleetTotals.averageUtilisation)} hint="Average per aircraft" />
                            <StatTile label="Target Met" value={String(fleetTotals.metTargetCount)} hint="Aircraft meeting target" />
                          </CardContent>
                        </Card>

                        <Card className={cn(DASHBOARD_SHELL_CLASS, 'flex min-h-[460px] flex-col', isModern && 'border-slate-200/80 bg-white/95')}>
                          <CardHeader className="border-b bg-muted/5 px-4 py-3">
                            <CardTitle className="text-sm font-black uppercase tracking-tight">Aircraft Selector</CardTitle>
                            <CardDescription className="text-xs">Pick an aircraft card to open its utilisation detail.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3 p-4">
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {fleetRows.slice(0, 6).map((row) => {
                                const isSelected = selectedAircraftId === row.aircraft.id;
                                return (
                                  <Link
                                    key={row.aircraft.id}
                                    href={`/assets/aircraft/${row.aircraft.id}`}
                                    className={cn(
                                      'block rounded-2xl border p-3 text-left transition-colors',
                                      isSelected ? 'border-foreground bg-foreground/5' : 'border-input bg-background hover:border-foreground/40'
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-black uppercase tracking-tight">{row.aircraft.tailNumber}</p>
                                        <p className="text-[10px] font-medium uppercase text-muted-foreground">
                                          {row.aircraft.make} {row.aircraft.model}
                                        </p>
                                      </div>
                                      <Badge
                                        variant={row.targetMet ? 'default' : 'secondary'}
                                        className="text-[10px] font-black uppercase"
                                      >
                                        {row.targetMet ? 'Met' : 'Below'}
                                      </Badge>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                                      <span>Utilisation</span>
                                      <span className="font-black text-foreground">{formatHours(row.loggedHours)}</span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>

                            <div className="h-[240px]">
                              {isLoading || isTargetLoading ? (
                                <Skeleton className="h-full w-full" />
                              ) : selectedAircraftTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <ComposedChart data={selectedAircraftTrend} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                                    <Tooltip
                                      formatter={(value: number, name: string) => {
                                        if (name === 'utilisationPercent') return [`${value}%`, 'Utilisation'];
                                        return [`${value.toFixed(1)}h`, name];
                                      }}
                                    />
                                    <Area type="monotone" dataKey="flightHours" name="Flight time" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.12} strokeWidth={2} />
                                    <Line type="monotone" dataKey="maintenanceHours" name="Maintenance time" stroke="#f97316" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="utilisationPercent" name="Utilisation %" stroke="#16a34a" strokeWidth={2} dot={false} />
                                  </ComposedChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-muted/5 text-sm text-muted-foreground">
                                  No trend data available yet.
                                </div>
                              )}
                            </div>
                            {selectedAircraft ? (
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                Showing {selectedAircraft.aircraft.tailNumber} for the selected period.
                              </p>
                            ) : null}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {tabs.filter((tab) => tab.value !== 'fleet').map((tab) => (
                      <TabsContent key={tab.value} value={tab.value} className="m-0">
                        <StageCard tabLabel={tab.label} modern={isModern} />
                      </TabsContent>
                    ))}
                  </>
                ) : (
                  tabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} className="m-0">
                      <StageCard tabLabel={tab.label} modern={isModern} />
                    </TabsContent>
                  ))
                )}
              </Tabs>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex min-h-[128px] flex-col justify-between rounded-2xl border bg-muted/5 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-2 text-[10px] font-medium uppercase text-muted-foreground">{hint}</p>
    </div>
  );
}

function StageCard({ tabLabel, modern }: { tabLabel: string; modern: boolean }) {
  return (
    <Card className={cn(DASHBOARD_SHELL_CLASS, 'min-h-[calc(100vh-18rem)]', modern && 'border-slate-200/80 bg-white/95')}>
      <CardHeader
        className={cn(
          'sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
          modern && 'bg-white/95 supports-[backdrop-filter]:bg-white/85'
        )}
      >
        <CardTitle className="text-sm font-black uppercase tracking-tight">{tabLabel}</CardTitle>
        <CardDescription className="text-xs">{EMPTY_NOTE}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-[280px] items-center justify-center p-6">
        <div className="max-w-xl rounded-2xl border border-dashed border-card-border/70 bg-muted/5 px-6 py-10 text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-foreground/80">{tabLabel} scaffold ready</p>
          <p className="mt-3 text-sm text-muted-foreground">
            We will build this section separately so the dashboard stays clean and focused by industry.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
