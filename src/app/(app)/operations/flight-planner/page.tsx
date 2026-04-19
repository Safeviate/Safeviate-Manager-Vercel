'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Loader2, MapPin, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import type { NavlogLeg } from '@/types/booking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateRouteTotals, createNavlogLegFromCoordinates } from '@/lib/flight-planner';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { useTheme } from '@/components/theme-provider';
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';

const AeronauticalMap = dynamic(() => import('@/components/flight-planner/aeronautical-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[60vh] items-center justify-center bg-slate-900">
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
          Loading aeronautical chart...
        </p>
      </div>
    </div>
  ),
});

export default function FlightPlannerPage() {
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const { uiMode } = useTheme();
  const [legs, setLegs] = useState<NavlogLeg[]>([]);
  const [departureLegId, setDepartureLegId] = useState<string | null>(null);
  const [arrivalLegId, setArrivalLegId] = useState<string | null>(null);

  const isModern = uiMode === 'modern';
  const totals = useMemo(() => calculateRouteTotals(legs), [legs]);
  const departureLeg = useMemo(() => legs.find((leg) => leg.id === departureLegId) || null, [departureLegId, legs]);
  const arrivalLeg = useMemo(() => legs.find((leg) => leg.id === arrivalLegId) || null, [arrivalLegId, legs]);

  if (isTenantLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-background px-6 py-12 text-center">
        <div className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-black uppercase tracking-widest">Loading Flight Planner</p>
        </div>
      </div>
    );
  }

  if (
    !shouldBypassIndustryRestrictions(tenant?.id) &&
    !isHrefEnabledForIndustry('/operations/flight-planner', tenant?.industry) &&
    !(tenant?.enabledMenus?.includes('/operations/flight-planner') ?? false)
  ) {
    return (
      <Card className="mx-auto w-full max-w-3xl border shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Flight Planner Unavailable</CardTitle>
          <CardDescription>The route planner is only available for aviation tenants.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="font-black uppercase">
            <Link href="/operations">Back to Operations</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleAddWaypoint = (lat: number, lon: number, identifier = 'WP', frequencies?: string, layerInfo?: string) => {
    setLegs((current) => [...current, createNavlogLegFromCoordinates(current, lat, lon, identifier, frequencies, layerInfo)]);
  };

  const handleSetDeparture = (legId: string) => {
    setDepartureLegId(legId);
    setArrivalLegId((current) => (current === legId ? null : current));
  };

  const handleSetArrival = (legId: string) => {
    setArrivalLegId(legId);
    setDepartureLegId((current) => (current === legId ? null : current));
  };

  const removeLeg = (id: string) => {
    if (departureLegId === id) setDepartureLegId(null);
    if (arrivalLegId === id) setArrivalLegId(null);
    setLegs((current) => current.filter((leg) => leg.id !== id));
  };

  return (
    <div className={cn('mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-6 overflow-y-auto p-4 pt-6 md:p-8', isModern && 'gap-7')}>
      <Card className={cn('border shadow-none', isModern && 'overflow-hidden border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)]')}>
        <CardHeader className={cn('border-b bg-muted/20', isModern && 'bg-transparent')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-slate-50 text-slate-700')}>Planning Surface</Badge>
                <Badge className={cn('text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-sky-50 text-sky-800 hover:bg-sky-50')}>Route Planner</Badge>
                <Badge variant="outline" className={cn('text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-emerald-50 text-emerald-800')}>
                  {legs.length} waypoints
                </Badge>
              </div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Live Route Planning</CardTitle>
              <CardDescription className="max-w-3xl text-sm">
                Build routes on the chart first, then review totals, departure and arrival, and waypoint-by-waypoint planning details alongside the map.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5 text-[10px] font-black uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                OpenAIP Chart + Search
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLegs([])}
                disabled={legs.length === 0}
                className={cn('h-9 px-4 text-xs font-black uppercase', isModern && 'border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50')}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Route
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className={cn('self-start min-h-[70vh] border shadow-none', isModern && 'overflow-hidden border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Planning Map Surface</CardTitle>
              <CardDescription>Search, click, and build the route directly on the aeronautical chart.</CardDescription>
            </CardHeader>
            <CardContent className="relative h-full min-h-[60vh] p-0">
              <AeronauticalMap legs={legs} onAddWaypoint={handleAddWaypoint} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-black uppercase tracking-widest">Route Summary</CardTitle>
                  <CardDescription>Totals and route endpoints update as waypoints are added.</CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px] font-black uppercase">
                  {legs.length} WP
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className={cn('rounded-lg border bg-background p-3', isModern && 'rounded-2xl border-slate-200 bg-slate-50/70')}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Distance</p>
                    <p className="mt-1 text-sm font-black">{totals.distance.toFixed(1)} NM</p>
                  </div>
                  <div className={cn('rounded-lg border bg-background p-3', isModern && 'rounded-2xl border-slate-200 bg-slate-50/70')}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ETE</p>
                    <p className="mt-1 text-sm font-black">{totals.ete.toFixed(0)} MIN</p>
                  </div>
                  <div className={cn('rounded-lg border bg-background p-3', isModern && 'rounded-2xl border-slate-200 bg-slate-50/70')}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fuel</p>
                    <p className="mt-1 text-sm font-black">{totals.fuel.toFixed(1)}</p>
                  </div>
                </div>

                <div className={cn('grid grid-cols-2 gap-2 rounded-xl border bg-background p-3', isModern && 'rounded-2xl border-slate-200 bg-slate-50/70')}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Departure</p>
                    <p className="truncate text-sm font-black uppercase">{departureLeg?.waypoint || 'Not set'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arrival</p>
                    <p className="truncate text-sm font-black uppercase">{arrivalLeg?.waypoint || 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Route Legs</CardTitle>
                <CardDescription>Waypoint sequence, leg math, and departure or arrival selection.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-24rem)] min-h-[420px]">
                  <div className="space-y-2 p-3">
                    {legs.length === 0 ? (
                      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed bg-background/60 text-center">
                        <div className="space-y-3 px-6">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                            <MapPin className="h-7 w-7 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest">No waypoints yet</p>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Click anywhere on the map to start a route.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      legs.map((leg, index) => (
                        <div
                          key={leg.id}
                          className={cn(
                            'group flex items-start gap-3 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/30',
                            isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70 shadow-sm',
                          )}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700/10 text-[10px] font-black text-emerald-700">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-black uppercase">{leg.waypoint}</p>
                                <p className="text-[9px] font-mono font-bold text-muted-foreground">
                                  {leg.latitude?.toFixed(4)}, {leg.longitude?.toFixed(4)}
                                </p>
                                {leg.frequencies && <p className="text-[9px] font-semibold text-emerald-700">{leg.frequencies}</p>}
                                {leg.layerInfo && <p className="text-[9px] font-semibold text-primary">{leg.layerInfo}</p>}
                                <div className="flex flex-wrap gap-1">
                                  {departureLegId === leg.id && <Badge variant="secondary" className="text-[9px] font-black uppercase">Departure</Badge>}
                                  {arrivalLegId === leg.id && <Badge variant="secondary" className="text-[9px] font-black uppercase">Arrival</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant={departureLegId === leg.id ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-7 px-2 text-[10px] font-black uppercase"
                                  onClick={() => handleSetDeparture(leg.id)}
                                >
                                  Dep
                                </Button>
                                <Button
                                  variant={arrivalLegId === leg.id ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-7 px-2 text-[10px] font-black uppercase"
                                  onClick={() => handleSetArrival(leg.id)}
                                >
                                  Arr
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                                  onClick={() => removeLeg(leg.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-1.5 text-[10px] font-black uppercase">
                              <div className="rounded-lg bg-muted/20 px-2 py-1.5">
                                <span className="text-muted-foreground">TC</span>
                                <span className="ml-1">{leg.trueCourse?.toFixed(0) || '-'}°</span>
                              </div>
                              <div className="rounded-lg bg-muted/20 px-2 py-1.5">
                                <span className="text-muted-foreground">WCA</span>
                                <span className="ml-1">{leg.wca !== undefined ? `${leg.wca >= 0 ? '+' : ''}${leg.wca.toFixed(0)}°` : '-'}</span>
                              </div>
                              <div className="rounded-lg bg-muted/20 px-2 py-1.5">
                                <span className="text-muted-foreground">VAR</span>
                                <span className="ml-1">{leg.variation !== undefined ? `${leg.variation >= 0 ? `${leg.variation.toFixed(0)}E` : `${Math.abs(leg.variation).toFixed(0)}W`}` : '-'}</span>
                              </div>
                              <div className="rounded-lg bg-primary/10 px-2 py-1.5">
                                <span className="text-primary">MH</span>
                                <span className="ml-1 text-primary">{leg.magneticHeading?.toFixed(0) || '-'}°</span>
                              </div>
                              <div className="rounded-lg bg-muted/20 px-2 py-1.5">
                                <span className="text-muted-foreground">Dist</span>
                                <span className="ml-1">{leg.distance?.toFixed(1) || '-'}</span>
                              </div>
                              <div className="rounded-lg bg-muted/20 px-2 py-1.5">
                                <span className="text-muted-foreground">GS</span>
                                <span className="ml-1">{leg.groundSpeed?.toFixed(0) || '-'}</span>
                              </div>
                              <div className="rounded-lg bg-muted/20 px-2 py-1.5">
                                <span className="text-muted-foreground">ETE</span>
                                <span className="ml-1">{leg.ete?.toFixed(0) || '-'}m</span>
                              </div>
                              <div className="rounded-lg bg-muted/20 px-2 py-1.5">
                                <span className="text-muted-foreground">Fuel</span>
                                <span className="ml-1">{leg.tripFuel?.toFixed(1) || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
