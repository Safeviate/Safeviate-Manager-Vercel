'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapIcon, Route } from 'lucide-react';
import { BookingPlanningMap } from '@/components/bookings/booking-planning-map';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatLatLonDms } from '@/lib/coordinate-parser';
import { cn } from '@/lib/utils';
import type { Booking, NavlogLeg, WaypointContext } from '@/types/booking';
import type { ActiveLegState, FlightPosition } from '@/types/flight-session';

type WaypointContextItem = WaypointContext['items'][number];

const WAYPOINT_KIND_LABELS: Partial<Record<NonNullable<WaypointContextItem['kind']>, string>> = {
  airport: 'Airport',
  navaid: 'Navaid',
  'reporting-point': 'Reporting Point',
  airspace: 'Airspace',
  obstacle: 'Obstacle',
  other: 'Other',
};

const formatWaypointContextKind = (kind?: WaypointContextItem['kind']) => (kind ? WAYPOINT_KIND_LABELS[kind] || kind : 'Waypoint');
const formatHeadingDegrees = (value?: number) => (value === undefined || Number.isNaN(value) ? '---' : Math.round(value).toString().padStart(3, '0'));
const getReciprocalHeading = (value?: number) => (value === undefined || Number.isNaN(value) ? undefined : (value + 180) % 360);

const WaypointContextStack = ({ context }: { context?: WaypointContext }) => {
  if (!context?.items?.length) return null;

  return (
    <div className="mt-1.5 space-y-1.5 border-t border-border/60 pt-1.5">
      <div className="space-y-1">
        {context.items.map((item, index) => (
          <div key={`${item.layer}-${item.label}-${index}`} className="rounded-md border border-border/70 bg-background/70 px-2 py-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  {formatWaypointContextKind(item.kind)}
                </p>
                <p className="text-[9px] font-black uppercase leading-tight text-foreground">{item.label}</p>
                <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.layer}</p>
              </div>
              {item.distanceNm !== undefined ? (
                <span className="shrink-0 font-mono text-[8px] font-black text-muted-foreground">{item.distanceNm.toFixed(1)} NM</span>
              ) : null}
            </div>
            {item.detail ? <p className="mt-0.5 text-[8px] font-semibold leading-tight text-slate-700">{item.detail}</p> : null}
            {item.frequencies ? <p className="mt-0.5 text-[8px] font-semibold leading-tight text-emerald-700">{item.frequencies}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

type ActiveFlightLiveMapProps = {
  booking: Booking | null;
  legs: NavlogLeg[];
  position: FlightPosition | null;
  aircraftRegistration?: string;
  activeLegIndex?: number;
  activeLegState?: ActiveLegState | null;
  fullscreen?: boolean;
  showControls?: boolean;
  followOwnship?: boolean;
  onFollowOwnshipChange?: (followOwnship: boolean) => void;
  recenterSignal?: number;
  isLayersCardOpen?: boolean;
  isMapZoomCardOpen?: boolean;
  onLayersCardOpenChange?: (open: boolean) => void;
  onMapZoomCardOpenChange?: (open: boolean) => void;
  geolocationError?: string | null;
  permissionState?: 'idle' | 'granted' | 'denied' | 'unsupported';
  isWatching?: boolean;
};

export function ActiveFlightLiveMap({
  legs,
  activeLegIndex,
  isLayersCardOpen = false,
  onLayersCardOpenChange,
}: ActiveFlightLiveMapProps) {
  const isMobile = useIsMobile();
  const validRouteLegs = useMemo(
    () => legs.filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined),
    [legs]
  );
  const [showRouteSummary, setShowRouteSummary] = useState(!isMobile);

  useEffect(() => {
    setShowRouteSummary(!isMobile);
  }, [isMobile]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div className="relative h-full min-h-0">
        <BookingPlanningMap
          legs={legs}
          hazards={[]}
          onAddWaypoint={() => {}}
          isEditing={false}
          isLayersPanelOpen={isLayersCardOpen}
          onLayersPanelOpenChange={onLayersCardOpenChange}
        />

        {validRouteLegs.length > 0 ? (
          <>
            <button
              type="button"
              className="absolute right-3 top-16 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-xl backdrop-blur hover:bg-slate-50 md:right-4 md:top-4"
              onClick={() => setShowRouteSummary((current) => !current)}
              aria-label={showRouteSummary ? 'Hide route summary' : 'Show route summary'}
              title={showRouteSummary ? 'Hide route summary' : 'Show route summary'}
            >
              <Route className="h-4 w-4" />
            </button>

            {showRouteSummary ? (
              <div className="absolute inset-x-3 bottom-3 z-[1000] md:inset-y-3 md:left-auto md:right-3 md:w-[22rem]">
                <Card className="flex max-h-[42svh] min-h-0 flex-col overflow-hidden border border-border/70 bg-background/98 shadow-2xl backdrop-blur md:h-full md:max-h-none">
                  <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b px-3 py-2.5">
                    <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                      <MapIcon className="h-3.5 w-3.5 text-emerald-600" />
                      Route Summary
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowRouteSummary(false)}>
                      <Route className="h-4 w-4" />
                    </Button>
                  </CardHeader>

                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-2 p-3">
                      {validRouteLegs.map((leg, index) => {
                        const isActive = activeLegIndex != null && index === activeLegIndex;
                        const isNext = activeLegIndex != null && index === activeLegIndex + 1;
                        const isOriginWaypoint = index === 0;
                        const hasWaypointContext = Boolean(leg.waypointContext?.items?.length);
                        const metaLine = [hasWaypointContext ? null : leg.frequencies || leg.layerInfo, formatLatLonDms(leg.latitude, leg.longitude)]
                          .filter(Boolean)
                          .join(' | ');

                        return (
                          <div
                            key={leg.id || `${leg.waypoint}-${index}`}
                            className={cn(
                              'rounded-xl border bg-background p-3 transition-colors',
                              isActive && 'border-sky-300 bg-sky-50/70',
                              isNext && 'border-amber-300 bg-amber-50/70',
                              !isActive && !isNext && 'border-slate-200/90 bg-slate-50/70'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-[11px] font-black uppercase leading-tight text-slate-900">{leg.waypoint || `WPT-${index + 1}`}</p>
                                {metaLine ? <p className="mt-1 text-[8px] font-semibold leading-tight text-emerald-700">{metaLine}</p> : null}
                                <WaypointContextStack context={leg.waypointContext} />

                                <div className="mt-2 flex gap-5">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-bold uppercase text-muted-foreground">Dist</span>
                                    <span className="text-[10px] font-black text-slate-900">{isOriginWaypoint ? '---' : `${leg.distance?.toFixed(1) || '0.0'} NM`}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-bold uppercase text-muted-foreground">TRK</span>
                                    <span className="text-[10px] font-black text-slate-900">{isOriginWaypoint ? '---' : `${formatHeadingDegrees(getReciprocalHeading(leg.magneticHeading))}°`}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                {isActive ? (
                                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-sky-700">Active</p>
                                ) : isNext ? (
                                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-700">Next</p>
                                ) : (
                                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">#{index + 1}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
