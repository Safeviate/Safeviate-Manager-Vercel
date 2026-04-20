'use client';

import { useMemo } from 'react';
import type { NavlogLeg, Hazard } from '@/types/booking';
import { AviationMapLibreShell } from '@/components/maps/aviation-maplibre-shell';

interface BookingPlanningMapProps {
  legs: NavlogLeg[];
  hazards?: Hazard[];
  onAddWaypoint: (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => void;
  onMoveWaypoint?: (legId: string, lat: number, lon: number) => void;
  isEditing?: boolean;
  rightAccessory?: React.ReactNode;
}

export function BookingPlanningMap({
  legs,
  hazards = [],
  onAddWaypoint,
  onMoveWaypoint,
  isEditing = false,
  rightAccessory,
}: BookingPlanningMapProps) {
  const center = useMemo<[number, number]>(() => {
    const lastLeg = [...legs].reverse().find((leg) => leg.latitude !== undefined && leg.longitude !== undefined);
    if (lastLeg?.latitude !== undefined && lastLeg.longitude !== undefined) {
      return [lastLeg.latitude, lastLeg.longitude];
    }
    return [-25.9, 27.9];
  }, [legs]);

  return (
    <div className="relative h-full w-full">
      <AviationMapLibreShell
        mode="route-planner"
        center={center}
        baseLayer="light"
        minZoom={4}
        maxZoom={16}
        showLabels
        showMasterChart
        showAirports
        showNavaids
        showReportingPoints
        showAirspaces
        showClassE
        showClassF
        showClassG
        showMilitaryAreas
        showTrainingAreas
        showGlidingSectors
        showHangGlidings
        showObstacles
        legs={legs}
        hazards={hazards}
        isEditing={isEditing}
        onMapShortPress={(lat, lon) => onAddWaypoint(lat, lon)}
        onMoveWaypoint={onMoveWaypoint}
      />
      {rightAccessory ? <div className="absolute right-4 top-4 z-[1000]">{rightAccessory}</div> : null}
    </div>
  );
}
