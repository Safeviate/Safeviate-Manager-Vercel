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
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';

const AeronauticalMap = dynamic(() => import('@/components/flight-planner/aeronautical-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[60vh] items-center justify-center bg-slate-900">
      <div className="text-center space-y-4">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
          Loading aeronautical chart...
        </p>
      </div>
    </div>
  ),
});

const DEFAULT_CENTER: [number, number] = [-25.9, 27.9];

export default function FlightPlannerPage() {
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const [legs, setLegs] = useState<NavlogLeg[]>([]);
  const [departureLegId, setDepartureLegId] = useState<string | null>(null);
  const [arrivalLegId, setArrivalLegId] = useState<string | null>(null);

  const totals = useMemo(() => calculateRouteTotals(legs), [legs]);
  const departureLeg = useMemo(
    () => legs.find((leg) => leg.id === departureLegId) || null,
    [departureLegId, legs]
  );
  const arrivalLeg = useMemo(
    () => legs.find((leg) => leg.id === arrivalLegId) || null,
    [arrivalLegId, legs]
  );

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
    if (departureLegId === id) {
      setDepartureLegId(null);
    }
    if (arrivalLegId === id) {
      setArrivalLegId(null);
    }
    setLegs((current) => current.filter((leg) => leg.id !== id));
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-muted/10">
      <div className="border-b bg-background px-4 py-5 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground md:text-2xl">
              Flight Planner
            </h1>
            <p className="text-xs font-medium text-muted-foreground md:text-sm">
              Build a route on the OpenAIP chart, then search airports, navaids, and reporting points to add waypoints.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 text-[10px] font-black uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              OpenAIP Chart + Search
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLegs([])}
              disabled={legs.length === 0}
              className="h-9 px-4 text-xs font-black uppercase"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear Route
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_360px] lg:p-6">
        <Card className="min-h-0 overflow-hidden border shadow-none">
          <CardContent className="relative h-full min-h-[65vh] p-0">
            <AeronauticalMap legs={legs} onAddWaypoint={handleAddWaypoint} />
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden border shadow-none">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase tracking-widest">
                  Route Summary
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Click the map to add waypoints, or search for an airport, navaid, or reporting point.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px] font-black uppercase">
                {legs.length} WP
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 p-0">
            <div className="border-b bg-muted/5 px-4 py-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Distance
                  </p>
                  <p className="mt-1 text-sm font-black">{totals.distance.toFixed(1)} NM</p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    ETE
                  </p>
                  <p className="mt-1 text-sm font-black">{totals.ete.toFixed(0)} MIN</p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Fuel
                  </p>
                  <p className="mt-1 text-sm font-black">{totals.fuel.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[calc(65vh-140px)] lg:h-[calc(100vh-280px)]">
              <div className="space-y-2 p-3">
                <div className="grid grid-cols-2 gap-2 rounded-xl border bg-background p-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Departure
                    </p>
                    <p className="truncate text-sm font-black uppercase">
                      {departureLeg?.waypoint || 'Not set'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Arrival
                    </p>
                    <p className="truncate text-sm font-black uppercase">
                      {arrivalLeg?.waypoint || 'Not set'}
                    </p>
                  </div>
                </div>

                {legs.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed bg-background/60 text-center">
                    <div className="space-y-3 px-6">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <MapPin className="h-7 w-7 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">
                          No waypoints yet
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Click anywhere on the map to start a route.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  legs.map((leg, index) => (
                    <div
                      key={leg.id}
                      className={cn(
                        'group flex items-start gap-3 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/30'
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
                            {leg.frequencies && (
                              <p className="text-[9px] font-semibold text-emerald-700">
                                {leg.frequencies}
                              </p>
                            )}
                            {leg.layerInfo && (
                              <p className="text-[9px] font-semibold text-primary">
                                {leg.layerInfo}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {departureLegId === leg.id && (
                                <Badge variant="secondary" className="text-[9px] font-black uppercase">
                                  Departure
                                </Badge>
                              )}
                              {arrivalLegId === leg.id && (
                                <Badge variant="secondary" className="text-[9px] font-black uppercase">
                                  Arrival
                                </Badge>
                              )}
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
    </div>
  );
}
