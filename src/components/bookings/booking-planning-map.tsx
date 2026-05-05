'use client';

import { useMemo, useState } from 'react';
import type { NavlogLeg, Hazard } from '@/types/booking';
import { AviationMapLibreShell } from '@/components/maps/aviation-maplibre-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ChevronDown, Layers2, Map as MapIcon, Satellite, X } from 'lucide-react';
import { WaypointDmsDialog } from '@/components/maps/waypoint-dms-dialog';

type BookingPlanningMapSettings = {
  baseLayer: 'light' | 'satellite';
  showLabels: boolean;
  showMasterChart: boolean;
  showAirports: boolean;
  showAirportLabels: boolean;
  showNavaids: boolean;
  showNavaidLabels: boolean;
  showReportingPoints: boolean;
  showReportingPointLabels: boolean;
  showAirspaces: boolean;
  showAirspaceLabels: boolean;
  showClassE: boolean;
  showClassELabels: boolean;
  showClassF: boolean;
  showClassFLabels: boolean;
  showClassG: boolean;
  showClassGLabels: boolean;
  showMilitaryAreas: boolean;
  showMilitaryAreaLabels: boolean;
  showTrainingAreas: boolean;
  showTrainingAreaLabels: boolean;
  showGlidingSectors: boolean;
  showGlidingSectorLabels: boolean;
  showHangGlidings: boolean;
  showHangGlidingLabels: boolean;
  showObstacles: boolean;
  showObstacleLabels: boolean;
  showRouteLine: boolean;
  showWaypointMarkers: boolean;
  showHazards: boolean;
};

const DEFAULT_SETTINGS: BookingPlanningMapSettings = {
  baseLayer: 'light',
  showLabels: true,
  showMasterChart: true,
  showAirports: true,
  showAirportLabels: true,
  showNavaids: true,
  showNavaidLabels: true,
  showReportingPoints: true,
  showReportingPointLabels: true,
  showAirspaces: true,
  showAirspaceLabels: true,
  showClassE: true,
  showClassELabels: true,
  showClassF: true,
  showClassFLabels: true,
  showClassG: true,
  showClassGLabels: true,
  showMilitaryAreas: true,
  showMilitaryAreaLabels: true,
  showTrainingAreas: true,
  showTrainingAreaLabels: true,
  showGlidingSectors: true,
  showGlidingSectorLabels: true,
  showHangGlidings: true,
  showHangGlidingLabels: true,
  showObstacles: true,
  showObstacleLabels: true,
  showRouteLine: true,
  showWaypointMarkers: true,
  showHazards: true,
};

interface BookingPlanningMapProps {
  legs: NavlogLeg[];
  hazards?: Hazard[];
  onAddWaypoint: (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => void;
  onMoveWaypoint?: (legId: string, lat: number, lon: number) => void;
  isEditing?: boolean;
  rightAccessory?: React.ReactNode;
}

const toggleButtonClass = (active: boolean) =>
  cn(
    'h-8 rounded-md border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition-colors',
    active
      ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-900'
      : 'border-slate-200 bg-background text-slate-600 hover:bg-slate-50'
  );

const sheetToggleClass = (active: boolean) =>
  cn(
    'flex h-10 w-full items-center justify-start gap-2 rounded-md border px-3 text-[10px] font-black uppercase tracking-[0.08em]',
    active
      ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-900'
      : 'border-slate-200 bg-background text-slate-600 hover:bg-slate-50'
  );

export function BookingPlanningMap({
  legs,
  hazards = [],
  onAddWaypoint,
  onMoveWaypoint,
  isEditing = false,
  rightAccessory,
}: BookingPlanningMapProps) {
  const [showMapZoomPanel, setShowMapZoomPanel] = useState(false);
  const [showMapLayers, setShowMapLayers] = useState(false);
  const [layerTab, setLayerTab] = useState<'layers' | 'labels'>('layers');
  const [settings, setSettings] = useState<BookingPlanningMapSettings>(DEFAULT_SETTINGS);
  const [currentZoom, setCurrentZoom] = useState(8);
  const [minVisibleZoom, setMinVisibleZoom] = useState(4);
  const [maxVisibleZoom, setMaxVisibleZoom] = useState(16);
  const layerToggleItems = [
    ['showLabels', 'Labels'],
    ['showMasterChart', 'Master Chart'],
    ['showAirports', 'Airports'],
    ['showNavaids', 'Navaids'],
    ['showReportingPoints', 'Reporting Points'],
    ['showAirspaces', 'Airspaces'],
    ['showClassE', 'Class E'],
    ['showClassF', 'Class F'],
    ['showClassG', 'Class G'],
    ['showMilitaryAreas', 'Military Areas'],
    ['showTrainingAreas', 'Training Areas'],
    ['showGlidingSectors', 'Gliding Sectors'],
    ['showHangGlidings', 'Hang Glidings'],
    ['showObstacles', 'Obstacles'],
    ['showRouteLine', 'Route'],
    ['showWaypointMarkers', 'Waypoints'],
    ['showHazards', 'Hazards'],
  ] as const;
  const labelToggleItems = [
    ['showAirportLabels', 'Airport Labels'],
    ['showNavaidLabels', 'Navaid Labels'],
    ['showReportingPointLabels', 'Reporting Labels'],
    ['showAirspaceLabels', 'Airspace Labels'],
    ['showClassELabels', 'Class E Labels'],
    ['showClassFLabels', 'Class F Labels'],
    ['showClassGLabels', 'Class G Labels'],
    ['showMilitaryAreaLabels', 'Military Labels'],
    ['showTrainingAreaLabels', 'Training Labels'],
    ['showGlidingSectorLabels', 'Gliding Labels'],
    ['showHangGlidingLabels', 'Hang Gliding Labels'],
    ['showObstacleLabels', 'Obstacle Labels'],
  ] as const;

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
        baseLayer={settings.baseLayer}
        showLabels={settings.showLabels}
        showMasterChart={settings.showMasterChart}
        showAirports={settings.showAirports}
        showAirportLabels={settings.showAirportLabels}
        showNavaids={settings.showNavaids}
        showNavaidLabels={settings.showNavaidLabels}
        showReportingPoints={settings.showReportingPoints}
        showReportingPointLabels={settings.showReportingPointLabels}
        showAirspaces={settings.showAirspaces}
        showAirspaceLabels={settings.showAirspaceLabels}
        showClassE={settings.showClassE}
        showClassELabels={settings.showClassELabels}
        showClassF={settings.showClassF}
        showClassFLabels={settings.showClassFLabels}
        showClassG={settings.showClassG}
        showClassGLabels={settings.showClassGLabels}
        showMilitaryAreas={settings.showMilitaryAreas}
        showMilitaryAreaLabels={settings.showMilitaryAreaLabels}
        showTrainingAreas={settings.showTrainingAreas}
        showTrainingAreaLabels={settings.showTrainingAreaLabels}
        showGlidingSectors={settings.showGlidingSectors}
        showGlidingSectorLabels={settings.showGlidingSectorLabels}
        showHangGlidings={settings.showHangGlidings}
        showHangGlidingLabels={settings.showHangGlidingLabels}
        showObstacles={settings.showObstacles}
        showObstacleLabels={settings.showObstacleLabels}
        legs={legs}
        hazards={hazards}
        isEditing={isEditing}
        showRouteLine={settings.showRouteLine}
        showWaypointMarkers={settings.showWaypointMarkers}
        showHazards={settings.showHazards}
        minZoom={minVisibleZoom}
        maxZoom={maxVisibleZoom}
        onZoomChange={setCurrentZoom}
        onMapShortPress={(lat, lon) => onAddWaypoint(lat, lon)}
        onMoveWaypoint={onMoveWaypoint}
      />

      <div className="pointer-events-none absolute right-4 top-4 z-[1000] flex items-start gap-2">
        {rightAccessory ? (
          <div className="pointer-events-auto">
            {rightAccessory}
          </div>
        ) : (
          <WaypointDmsDialog
            onAddWaypoint={onAddWaypoint}
            triggerLabel="DMS WP"
            triggerIconOnly
            triggerClassName="pointer-events-auto h-10 w-10 rounded-full border-slate-200 bg-white/95 p-0 text-[10px] font-black uppercase tracking-[0.12em] shadow-xl backdrop-blur hover:bg-slate-50"
          />
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMapZoomPanel((current) => !current)}
          className="pointer-events-auto h-10 w-10 rounded-full border-slate-200 bg-white/95 p-0 text-[10px] font-black uppercase tracking-[0.12em] shadow-xl backdrop-blur hover:bg-slate-50"
          aria-label="Map Zoom"
          title="Map Zoom"
        >
          <MapIcon className="h-4 w-4" />
          <span className="sr-only">Map Zoom</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMapLayers((current) => !current)}
          className="pointer-events-auto h-10 w-10 rounded-full border-slate-200 bg-white/95 p-0 text-[10px] font-black uppercase tracking-[0.12em] shadow-xl backdrop-blur hover:bg-slate-50"
          aria-label="Map Layers"
          title="Map Layers"
        >
          <Layers2 className="h-4 w-4" />
          <span className="sr-only">Map Layers</span>
        </Button>
      </div>

      {showMapZoomPanel ? (
        <div className="pointer-events-none absolute left-3 top-3 z-[1100] w-[320px] max-w-[calc(100%-1.5rem)]">
          <Card className="pointer-events-auto flex flex-col overflow-hidden border bg-background/95 p-3 text-[10px] shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Map Zoom</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
                  Zoom {currentZoom.toFixed(0)} · range {minVisibleZoom}-{maxVisibleZoom}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50"
                onClick={() => setShowMapZoomPanel(false)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">Min Zoom Level</p>
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{minVisibleZoom}</span>
                </div>
                <Slider
                  value={[minVisibleZoom]}
                  min={4}
                  max={16}
                  step={1}
                  onValueChange={([nextMin]) => {
                    setMinVisibleZoom(nextMin);
                    if (nextMin > maxVisibleZoom) {
                      setMaxVisibleZoom(nextMin);
                    }
                  }}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">Max Zoom Level</p>
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{maxVisibleZoom}</span>
                </div>
                <Slider
                  value={[maxVisibleZoom]}
                  min={4}
                  max={16}
                  step={1}
                  onValueChange={([nextMax]) => {
                    setMaxVisibleZoom(nextMax);
                    if (nextMax < minVisibleZoom) {
                      setMinVisibleZoom(nextMax);
                    }
                  }}
                  className="py-1"
                />
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {showMapLayers ? (
        <div className="pointer-events-none absolute right-4 top-4 z-[1100] w-[min(320px,calc(100%-1rem))]">
          <Card className="pointer-events-auto flex max-h-[calc(100dvh-8rem)] flex-col overflow-hidden border bg-background/95 shadow-2xl backdrop-blur">
            <CardHeader className="shrink-0 border-b px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Map Layers
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMapLayers(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-3 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSettings((current) => ({ ...current, baseLayer: 'light' }))}
                    className={toggleButtonClass(settings.baseLayer === 'light')}
                  >
                    <MapIcon className="mr-2 h-3.5 w-3.5" />
                    Light
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSettings((current) => ({ ...current, baseLayer: 'satellite' }))}
                    className={toggleButtonClass(settings.baseLayer === 'satellite')}
                  >
                    <Satellite className="mr-2 h-3.5 w-3.5" />
                    Satellite
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setLayerTab('layers')} className={toggleButtonClass(layerTab === 'layers')}>
                    Layers
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLayerTab('labels')} className={toggleButtonClass(layerTab === 'labels')}>
                    Labels
                  </Button>
                </div>

                {layerTab === 'layers' ? (
                  <div className="space-y-2">
                    {layerToggleItems.map(([key, label]) => (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        onClick={() => setSettings((current) => ({ ...current, [key]: !current[key] }))}
                        className={sheetToggleClass(settings[key])}
                      >
                        <span className={cn('h-2.5 w-2.5 rounded-full border', settings[key] ? 'border-white bg-white' : 'border-slate-300 bg-transparent')} />
                        {label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {labelToggleItems.map(([key, label]) => (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        onClick={() => setSettings((current) => ({ ...current, [key]: !current[key] }))}
                        className={sheetToggleClass(settings[key])}
                      >
                        <span className={cn('h-2.5 w-2.5 rounded-full border', settings[key] ? 'border-white bg-white' : 'border-slate-300 bg-transparent')} />
                        {label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
