'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavlogLeg, Hazard } from '@/types/booking';
import { AviationMapLibreShell } from '@/components/maps/aviation-maplibre-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ChevronDown, Layers2, Map as MapIcon, Plus, Search, Satellite, X } from 'lucide-react';
import { WaypointDmsForm } from '@/components/maps/waypoint-dms-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { formatWaypointCoordinatesDms } from '@/components/maps/waypoint-coordinate-utils';
import { parseJsonResponse } from '@/lib/safe-json';

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

type OpenAipFeature = {
  _id: string;
  name: string;
  icaoCode?: string;
  identifier?: string;
  runways?: Array<{
    designator?: string;
    dimension?: { length?: { value?: number }; width?: { value?: number } };
    declaredDistance?: { tora?: { value?: number } };
  }>;
  frequencies?: Array<{ name?: string; value?: string; publicUse?: boolean }>;
  geometry?: { coordinates?: [number, number] };
  sourceLayer: 'airports' | 'navaids' | 'reporting-points';
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

async function fetchOpenAipJson<T>(url: string, retries = 1): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
          continue;
        }
        return null;
      }

      return (await parseJsonResponse<T>(response)) ?? null;
    } catch (error) {
      if (attempt < retries) {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }

  return null;
}

const formatFrequencyLabel = (frequency: NonNullable<OpenAipFeature['frequencies']>[number]) => {
  const name = frequency.name?.trim();
  const value = frequency.value?.trim();
  if (name && value) return `${name} ${value}`;
  return name || value || '';
};

const formatWaypointFrequencies = (frequencies?: OpenAipFeature['frequencies']) =>
  frequencies
    ?.filter((frequency) => frequency.publicUse !== false)
    .map(formatFrequencyLabel)
    .filter(Boolean)
    .join(' • ');

const formatRunwaySummary = (runway: NonNullable<OpenAipFeature['runways']>[number]) => {
  const designator = runway.designator?.trim();
  const length = runway.dimension?.length?.value ?? runway.declaredDistance?.tora?.value;
  const width = runway.dimension?.width?.value;
  const size = [length ? `${Math.round(length)} m` : '', width ? `${Math.round(width)} m` : ''].filter(Boolean).join(' x ');
  return [designator, size].filter(Boolean).join(' • ');
};

const formatAirportRunways = (runways?: OpenAipFeature['runways']) =>
  runways
    ?.filter((runway) => runway.designator || runway.dimension?.length?.value || runway.declaredDistance?.tora?.value)
    .slice(0, 4)
    .map(formatRunwaySummary)
    .join(' • ');

const buildWaypointContext = (feature: OpenAipFeature) => {
  const identifier = feature.icaoCode || feature.identifier || feature.name;
  if (feature.sourceLayer === 'airports') {
    const runwaySummary = formatAirportRunways(feature.runways);
    return runwaySummary ? `OpenAIP Airports • ${identifier} • ${runwaySummary}` : `OpenAIP Airports • ${identifier}`;
  }
  if (feature.sourceLayer === 'navaids') {
    return `OpenAIP Navaids • ${identifier}`;
  }
  return `OpenAIP Reporting Points • ${identifier}`;
};

const getWaypointIdentifier = (feature: OpenAipFeature) => feature.icaoCode || feature.identifier || feature.name;

const getLayerLabel = (sourceLayer: OpenAipFeature['sourceLayer']) => {
  if (sourceLayer === 'airports') return 'OpenAIP Airports';
  if (sourceLayer === 'navaids') return 'OpenAIP Navaids';
  return 'OpenAIP Reporting Points';
};

const getSearchZoom = (sourceLayer: OpenAipFeature['sourceLayer']) => {
  if (sourceLayer === 'airports') return 13;
  if (sourceLayer === 'navaids') return 14;
  return 13;
};

const AIRPORT_CLICK_SNAP_THRESHOLD_NM = 1;
const CLICK_SNAP_THRESHOLD_NM = 20;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceNm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const earthRadiusNm = 3440.065;
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * earthRadiusNm * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
};

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
  const [isWaypointToolOpen, setIsWaypointToolOpen] = useState(false);
  const [waypointToolTab, setWaypointToolTab] = useState<'search' | 'dms'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OpenAipFeature[]>([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState<OpenAipFeature | null>(null);
  const [visiblePointFeatures, setVisiblePointFeatures] = useState<OpenAipFeature[]>([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
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

  const handleSelectSearchResult = useCallback(
    (item: OpenAipFeature) => {
      const coords = item.geometry?.coordinates;
      if (!coords || coords.length < 2) return;
      const [lon, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      setSelectedSearchResult(item);
      setSearchQuery('');
      setSearchResults([]);
    },
    []
  );

  const handleMapShortPress = useCallback(
    (lat: number, lon: number) => {
      const activeResources: Array<OpenAipFeature['sourceLayer']> = ['airports', 'navaids', 'reporting-points'];

      const collectNearest = (sourceLayer: OpenAipFeature['sourceLayer'], maxDistanceNm: number, limit = 1) => {
        const nearby = visiblePointFeatures
          .filter((feature) => feature.sourceLayer === sourceLayer && feature.geometry?.coordinates)
          .map((feature) => {
            const [featureLon, featureLat] = feature.geometry!.coordinates!;
            return { feature, distance: distanceNm(lat, lon, featureLat, featureLon) };
          })
          .filter((entry) => entry.distance <= maxDistanceNm)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit);

        return nearby;
      };

      const items = [] as Array<{ feature: OpenAipFeature; distance: number }>;
      if (activeResources.includes('airports')) {
        items.push(...collectNearest('airports', AIRPORT_CLICK_SNAP_THRESHOLD_NM, 1));
      }
      if (activeResources.includes('navaids')) {
        items.push(...collectNearest('navaids', CLICK_SNAP_THRESHOLD_NM, 2));
      }
      if (activeResources.includes('reporting-points')) {
        items.push(...collectNearest('reporting-points', CLICK_SNAP_THRESHOLD_NM, 2));
      }

      const nearest = items.sort((a, b) => a.distance - b.distance)[0]?.feature;
      if (nearest) {
        const identifier = getWaypointIdentifier(nearest);
        onAddWaypoint(
          lat,
          lon,
          identifier,
          formatWaypointFrequencies(nearest.frequencies),
          buildWaypointContext(nearest)
        );
        return;
      }

      onAddWaypoint(lat, lon, 'PNT', undefined, 'Map Position');
    },
    [onAddWaypoint, visiblePointFeatures]
  );

  useEffect(() => {
    const runSearch = async () => {
      const query = debouncedSearchQuery.trim();
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      const resources: Array<OpenAipFeature['sourceLayer']> = ['airports', 'navaids', 'reporting-points'];
      try {
        const searchResultsByResource = await Promise.all(
          resources.map(async (resource) => {
            const payload = await fetchOpenAipJson<{ items?: unknown[] }>(
              `/api/openaip?resource=${resource}&search=${encodeURIComponent(query)}`
            );
            return { resource, payload };
          })
        );

        const combinedResults = searchResultsByResource.flatMap(({ resource, payload }) =>
          (payload?.items ?? []).map((item: any) => ({ ...item, sourceLayer: resource }))
        ) as OpenAipFeature[];

        setSearchResults(combinedResults);
      } catch (error) {
        console.error('Booking planner search failed', error);
        setSearchResults([]);
      }
    };

    void runSearch();
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (isWaypointToolOpen) return;
    setWaypointToolTab('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSearchResult(null);
  }, [isWaypointToolOpen]);

  return (
    <div className="relative h-full w-full overflow-hidden">
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
        onViewportFeaturesLoaded={setVisiblePointFeatures}
        onMapShortPress={handleMapShortPress}
        onMoveWaypoint={onMoveWaypoint}
      />

      <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsWaypointToolOpen((current) => !current)}
          className="pointer-events-auto h-10 w-10 rounded-full border-slate-200 bg-white/95 p-0 text-[10px] font-black uppercase tracking-[0.12em] shadow-xl backdrop-blur hover:bg-slate-50"
          aria-label="Add Waypoint"
          title="Add Waypoint"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add Waypoint</span>
        </Button>

        {isWaypointToolOpen ? (
          <div className="pointer-events-auto mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white/95 text-[10px] shadow-xl backdrop-blur w-[min(18rem,calc(100vw-1.5rem))]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Add Waypoint</p>
                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Search OpenAIP or enter DMS coordinates
                </p>
              </div>
              <button
                type="button"
                aria-label="Close add waypoint tool"
                className="shrink-0 rounded-full border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50"
                onClick={() => setIsWaypointToolOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="px-3 py-2">
              <Tabs value={waypointToolTab} onValueChange={(value) => setWaypointToolTab(value as 'search' | 'dms')}>
                <TabsList className="grid h-8 grid-cols-2 bg-slate-100 p-1">
                  <TabsTrigger value="search" className="h-6 rounded-md text-[9px] font-black uppercase tracking-[0.12em]">
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="dms" className="h-6 rounded-md text-[9px] font-black uppercase tracking-[0.12em]">
                    DMS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="mt-3 space-y-2">
                  <div className="relative mx-auto w-[100px] max-w-full">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search..."
                      className="h-8 border-slate-200 bg-white/95 pl-8 pr-8 text-[10px] font-black uppercase shadow-sm backdrop-blur"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
                      <ScrollArea className="max-h-56">
                        <div className="divide-y divide-slate-100">
                          {searchResults.map((item) => (
                            <button
                              key={item._id}
                              type="button"
                              className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                              onClick={() => handleSelectSearchResult(item)}
                            >
                              <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-slate-900">
                                {item.name} {item.icaoCode || item.identifier ? `(${item.icaoCode || item.identifier})` : ''}
                              </p>
                              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                                {getLayerLabel(item.sourceLayer)}
                              </p>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : null}
                </TabsContent>

                <TabsContent value="dms" className="mt-3">
                  <WaypointDmsForm
                    onAddWaypoint={onAddWaypoint}
                    defaultIdentifier="PNT"
                    submitLabel="Add Waypoint"
                    onCancel={() => setIsWaypointToolOpen(false)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-[1000] flex items-start gap-2">
        {rightAccessory ? <div className="pointer-events-auto">{rightAccessory}</div> : null}
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
        <div className="pointer-events-none absolute left-2 top-2 z-[1100] w-[min(300px,calc(100%-0.75rem))]">
          <Card className="pointer-events-auto flex flex-col overflow-hidden border bg-background/95 p-2 text-[10px] shadow-2xl backdrop-blur max-h-[calc(40svh-0.75rem)] sm:max-h-[calc(100dvh-8rem)]">
            <div className="flex items-start justify-between gap-2">
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

            <div className="mt-2 grid gap-2.5">
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
        <div className="pointer-events-none absolute right-2 top-2 z-[1100] w-[min(300px,calc(100%-0.75rem))]">
          <Card className="pointer-events-auto flex h-[calc(36svh-0.75rem)] min-h-0 flex-col overflow-hidden border bg-background/95 shadow-2xl backdrop-blur sm:h-auto sm:max-h-[calc(100dvh-8rem)]">
            <CardHeader className="shrink-0 border-b px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="min-h-0 space-y-2 p-2 pb-2.5">
                <div className="grid grid-cols-2 gap-1">
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

                <div className="grid grid-cols-2 gap-1">
                  <Button type="button" variant="outline" onClick={() => setLayerTab('layers')} className={toggleButtonClass(layerTab === 'layers')}>
                    Layers
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLayerTab('labels')} className={toggleButtonClass(layerTab === 'labels')}>
                    Labels
                  </Button>
                </div>

                {layerTab === 'layers' ? (
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
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
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
