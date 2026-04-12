'use client';

import { ActiveFlightLiveMap } from '@/components/active-flight/active-flight-live-map';
import type { ActiveLegState, FlightPosition } from '@/types/flight-session';
import type { Booking, NavlogLeg } from '@/types/booking';

type FullScreenFlightLayoutProps = {
  booking: Booking | null;
  legs: NavlogLeg[];
  position: FlightPosition | null;
  aircraftRegistration?: string;
  activeLegIndex?: number;
  activeLegState?: ActiveLegState | null;
};

export function FullScreenFlightLayout({
  booking,
  legs,
  position,
  aircraftRegistration,
  activeLegIndex,
  activeLegState,
}: FullScreenFlightLayoutProps) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-black">
      <ActiveFlightLiveMap
        booking={booking}
        legs={legs}
        position={position}
        aircraftRegistration={aircraftRegistration}
        activeLegIndex={activeLegIndex}
        activeLegState={activeLegState}
        fullscreen
      />
    </div>
  );
}
