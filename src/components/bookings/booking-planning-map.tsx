'use client';

import dynamic from 'next/dynamic';
import type { NavlogLeg, Hazard, WaypointContext } from '@/types/booking';
import { useIsMobile } from '@/hooks/use-mobile';

const AeronauticalMap = dynamic(() => import('@/components/flight-planner/aeronautical-map'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-900/10" />,
});

interface BookingPlanningMapProps {
  legs: NavlogLeg[];
  hazards?: Hazard[];
  onAddWaypoint: (
    lat: number,
    lon: number,
    identifier?: string,
    frequencies?: string,
    layerInfo?: string,
    waypointContext?: WaypointContext
  ) => void;
  onMoveWaypoint?: (legId: string, lat: number, lon: number) => void;
  isEditing?: boolean;
  isLayersPanelOpen?: boolean;
  onLayersPanelOpenChange?: (open: boolean) => void;
  rightAccessory?: React.ReactNode;
}

export function BookingPlanningMap({
  legs,
  hazards = [],
  onAddWaypoint,
  onMoveWaypoint,
  isEditing = false,
  isLayersPanelOpen = false,
  onLayersPanelOpenChange,
  rightAccessory,
}: BookingPlanningMapProps) {
  const isMobile = useIsMobile();

  return (
    <div className="booking-planning-map relative h-full w-full">
      <AeronauticalMap
        legs={legs}
        hazards={hazards}
        onAddWaypoint={onAddWaypoint}
        onMoveWaypoint={onMoveWaypoint}
        isEditing={isEditing}
        isLayersPanelOpen={isLayersPanelOpen}
        onLayersPanelOpenChange={onLayersPanelOpenChange}
      />
      {rightAccessory ? (
        <div
          className={`absolute z-[1000] ${isMobile ? 'right-3 top-16' : 'right-4 top-4'}`}
        >
          {rightAccessory}
        </div>
      ) : null}
      <style jsx global>{`
        .booking-planning-map .leaflet-container {
          cursor: pointer;
        }
        .booking-planning-map .leaflet-grab,
        .booking-planning-map .leaflet-dragging,
        .booking-planning-map .leaflet-interactive {
          cursor: pointer !important;
        }
        @media (max-width: 639px) {
          .booking-planning-map .leaflet-top.leaflet-left {
            top: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
