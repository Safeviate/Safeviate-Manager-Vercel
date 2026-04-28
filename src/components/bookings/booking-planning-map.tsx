'use client';

import dynamic from 'next/dynamic';
import type { NavlogLeg, Hazard } from '@/types/booking';

const AeronauticalMap = dynamic(() => import('@/components/flight-planner/aeronautical-map'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-900/10" />,
});

interface BookingPlanningMapProps {
  legs: NavlogLeg[];
  hazards?: Hazard[];
  onAddWaypoint: (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => void;
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
      {rightAccessory ? <div className="absolute right-4 top-4 z-[1000]">{rightAccessory}</div> : null}
      <style jsx global>{`
        .booking-planning-map .leaflet-container {
          cursor: pointer;
        }
        .booking-planning-map .leaflet-grab,
        .booking-planning-map .leaflet-dragging,
        .booking-planning-map .leaflet-interactive {
          cursor: pointer !important;
        }
      `}</style>
    </div>
  );
}
