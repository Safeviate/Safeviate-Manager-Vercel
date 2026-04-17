'use client';

import { useMemo } from 'react';
import type { Booking, NavlogLeg } from '@/types/booking';
import type { ActiveLegState, FlightPosition } from '@/types/flight-session';
import { cn } from '@/lib/utils';

type ActiveFlightTelemetryStripProps = {
  booking: Booking | null;
  legs: NavlogLeg[];
  position: FlightPosition | null;
  activeLegIndex?: number;
  activeLegState?: ActiveLegState | null;
  className?: string;
};

export function ActiveFlightTelemetryStrip({
  booking,
  legs,
  position,
  activeLegIndex,
  activeLegState,
  className,
}: ActiveFlightTelemetryStripProps) {
  const validRouteLegs = useMemo(
    () => legs.filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined),
    [legs]
  );

  const currentLeg = activeLegIndex != null ? validRouteLegs[activeLegIndex] || null : null;
  const nextLeg = activeLegIndex != null ? validRouteLegs[activeLegIndex + 1] || null : null;
  const currentLegLabel =
    activeLegState?.fromWaypoint && activeLegState?.toWaypoint
      ? `${activeLegState.fromWaypoint} -> ${activeLegState.toWaypoint}`
      : currentLeg?.waypoint || 'N/A';
  const currentFrequency = currentLeg?.frequencies || currentLeg?.layerInfo || 'N/A';
  const nextWaypoint = activeLegState?.toWaypoint || nextLeg?.waypoint || 'N/A';
  const nextFrequency = nextLeg?.frequencies || nextLeg?.layerInfo || 'N/A';
  const altitude = position?.altitude ?? null;
  const speed = activeLegState?.groundSpeedKt ?? position?.speedKt ?? null;
  const track = position?.headingTrue ?? null;
  const eta = activeLegState?.etaToNextWaypointMinutes ?? null;

  const fields = [
    { label: 'GPS HGT', shortLabel: 'HGT', value: altitude != null ? `${Math.round(altitude)} m` : 'N/A' },
    { label: 'Speed', shortLabel: 'SPD', value: speed != null ? `${speed.toFixed(0)} kt` : 'N/A' },
    { label: 'Track', shortLabel: 'TRK', value: track != null ? `${Math.round(((track % 360) + 360) % 360)} deg` : 'N/A' },
    { label: 'Current Leg', shortLabel: 'LEG', value: currentLegLabel },
    { label: 'Cur Freq', shortLabel: 'CFRQ', value: currentFrequency },
    { label: 'Next Waypoint', shortLabel: 'NWPT', value: nextWaypoint },
    { label: 'Next Freq', shortLabel: 'NFRQ', value: nextFrequency },
    { label: 'ETA NEXT WPT', shortLabel: 'ETA', value: eta != null ? `${eta.toFixed(0)} min` : 'N/A' },
  ];

  return (
    <div className={cn('overflow-hidden', className)}>
      <div className="grid grid-cols-4 divide-x divide-y divide-slate-200/80 border-t border-slate-200/80 bg-white sm:grid-cols-4 md:grid-cols-8">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0 px-2 py-2 md:px-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate text-[8px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden">
                {field.shortLabel}
              </p>
              <p className="hidden truncate text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 sm:block">
                {field.label}
              </p>
              <p className="shrink-0 truncate text-[9px] font-black uppercase tracking-[0.06em] text-slate-900 sm:text-[9px] sm:tracking-[0.08em] md:text-[10px]">
                {field.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
