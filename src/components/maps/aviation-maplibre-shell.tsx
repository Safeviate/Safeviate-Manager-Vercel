'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Popup as MapLibrePopup } from 'maplibre-gl';
import type { FlightSession } from '@/types/flight-session';
import type { Hazard, NavlogLeg } from '@/types/booking';
import { MAPLIBRE_BASE_STYLES, OPENAIP_VECTOR_TILE_URL } from '@/lib/maplibre-map-config';
import { parseJsonResponse } from '@/lib/safe-json';
import { formatWaypointCoordinatesDms } from '@/components/maps/waypoint-coordinate-utils';
import { buildWaypointPopupMarkup } from '@/components/maps/waypoint-popup-content';
import { createNumberedWaypointElement } from '@/components/maps/waypoint-marker-style';
import {
  ROUTE_LINE_COLOR,
  ROUTE_LINE_OPACITY,
  ROUTE_LINE_WIDTH,
} from '@/components/maps/route-line-style';

type Point = [number, number];

type OpenAipFeature = {
  _id: string;
  name: string;
  icaoCode?: string;
  identifier?: string;
  runways?: Array<{
    designator?: string;
    mainRunway?: boolean;
    dimension?: {
      length?: {
        value?: number;
      };
      width?: {
        value?: number;
      };
    };
    declaredDistance?: {
      tora?: {
        value?: number;
      };
      lda?: {
        value?: number;
      };
    };
  }>;
  frequencies?: Array<{
    value?: string;
    name?: string;
    type?: number;
    primary?: boolean;
    publicUse?: boolean;
  }>;
  geometry?: {
    coordinates?: [number, number];
  };
  sourceLayer: 'airports' | 'navaids' | 'reporting-points';
};

type OpenAipAirspace = {
  _id: string;
  name: string;
  type?: number;
  icaoClass?: number;
  activity?: number;
  lowerLimit?: unknown;
  upperLimit?: unknown;
  verticalLimits?: unknown;
  limits?: unknown;
  floor?: unknown;
  ceiling?: unknown;
  geometry?: {
    type?: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString';
    coordinates?: any;
  };
  hoursOfOperation?: {
    operatingHours?: Array<{
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
    }>;
  };
};

type OpenAipObstacle = {
  _id: string;
  name: string;
  geometry?: { type?: 'Point'; coordinates?: [number, number] };
  height?: { value?: number };
  elevation?: { value?: number };
};

type LayerInfoItem = {
  label: string;
  layer: string;
  distanceNm?: number;
  frequencies?: string;
  detail?: string;
};

type LayerInfoState = {
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
  items: LayerInfoItem[];
  activeLayers: string[];
};

type AviationMapLibreShellProps = {
  className?: string;
  mode: 'route-planner' | 'fleet-tracker';
  center: Point;
  baseLayer: 'light' | 'satellite';
  minZoom: number;
  maxZoom: number;
  mapZoom?: number;
  onZoomChange?: (zoom: number) => void;
  onCenterChange?: (center: Point) => void;
  onMapReady?: (map: MapLibreMap) => void;
  onUserInteracted?: () => void;
  showLabels: boolean;
  showMasterChart: boolean;
  showAirports: boolean;
  showAirportLabels?: boolean;
  showNavaids: boolean;
  showNavaidLabels?: boolean;
  showReportingPoints: boolean;
  showReportingPointLabels?: boolean;
  showAirspaces: boolean;
  showAirspaceLabels?: boolean;
  showClassE: boolean;
  showClassELabels?: boolean;
  showClassF: boolean;
  showClassFLabels?: boolean;
  showClassG: boolean;
  showClassGLabels?: boolean;
  showMilitaryAreas: boolean;
  showMilitaryAreaLabels?: boolean;
  showTrainingAreas: boolean;
  showTrainingAreaLabels?: boolean;
  showGlidingSectors: boolean;
  showGlidingSectorLabels?: boolean;
  showHangGlidings: boolean;
  showHangGlidingLabels?: boolean;
  showObstacles: boolean;
  showObstacleLabels?: boolean;
  onlyActiveAirspace?: boolean;
  sessions?: FlightSession[];
  navlogRoutesByBookingId?: Record<string, NavlogLeg[]>;
  legs?: NavlogLeg[];
  hazards?: Hazard[];
  isEditing?: boolean;
  showAircraftNames?: boolean;
  showAircraftTrails?: boolean;
  showNavlogRoutes?: boolean;
  showRouteLine?: boolean;
  showWaypointMarkers?: boolean;
  showHazards?: boolean;
  onMoveWaypoint?: (legId: string, lat: number, lon: number) => void;
  onMapShortPress?: (lat: number, lon: number) => void;
  onMapLongPress?: (lat: number, lon: number) => void;
  pendingClickLabel?: string | null;
  layerInfo?: LayerInfoState | null;
  onAddWaypointFromLayerInfo?: (lat: number, lon: number, title: string) => void;
  onAddHazardFromLayerInfo?: (lat: number, lon: number) => void;
  onClearLayerInfo?: () => void;
  onViewportFeaturesLoaded?: (features: OpenAipFeature[]) => void;
  onAirspaceFeaturesLoaded?: (features: OpenAipAirspace[]) => void;
  onObstacleFeaturesLoaded?: (features: OpenAipObstacle[]) => void;
};

const OPENAIP_POINT_RESOURCES = ['airports', 'navaids', 'reporting-points'] as const;
const AIRSPACE_CLASS_E = 6;
const AIRSPACE_CLASS_F = 7;
const AIRSPACE_CLASS_G = 8;
const LONG_PRESS_MS = 550;
const CLICK_MOVE_TOLERANCE_METERS = 20;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toLayerVisibility = (visible: boolean) => (visible ? 'visible' : 'none') as 'visible' | 'none';

const normalizeHeading = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null;
  return ((value % 360) + 360) % 360;
};

const normalizeOpenAipItems = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as { items?: unknown[]; data?: unknown[] };
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
};

async function fetchOpenAipJson<T>(url: string, retries = 1): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          await delay(250 * (attempt + 1));
          continue;
        }
        return null;
      }
      return (await parseJsonResponse<T>(response)) ?? null;
    } catch (error) {
      if (attempt < retries) {
        await delay(250 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  return null;
}

const makeLineFeatureCollection = (points: Point[]) => ({
  type: 'FeatureCollection' as const,
  features: points.length > 1
    ? [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: points.map(([lat, lon]) => [lon, lat]),
          },
        },
      ]
    : [],
});

const distanceMeters = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const earthRadiusMeters = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
};

const distanceNm = (aLat: number, aLon: number, bLat: number, bLon: number) => distanceMeters(aLat, aLon, bLat, bLon) / 1852;

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
  return [designator ? `RWY ${designator}` : '', size].filter(Boolean).join(' • ');
};

const formatAirportRunways = (runways?: OpenAipFeature['runways']) =>
  runways
    ?.filter((runway) => runway.designator || runway.dimension?.length?.value || runway.declaredDistance?.tora?.value)
    .slice(0, 4)
    .map(formatRunwaySummary)
    .filter(Boolean)
    .join(' • ');

const formatLimitValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return `${value}`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [record.value, record.altitude, record.height, record.limit, record.text, record.unit, record.reference]
      .map((candidate) => formatLimitValue(candidate))
      .filter(Boolean)
      .join(' ');
  }
  return '';
};

const formatAirspaceVerticalLimits = (airspace: OpenAipAirspace): string => {
  const rawVertical = airspace.verticalLimits as Record<string, unknown> | undefined;
  const lower = formatLimitValue(rawVertical?.lower ?? rawVertical?.lowerLimit ?? rawVertical?.floor ?? airspace.lowerLimit ?? airspace.floor);
  const upper = formatLimitValue(rawVertical?.upper ?? rawVertical?.upperLimit ?? rawVertical?.ceiling ?? airspace.upperLimit ?? airspace.ceiling);
  const rangeParts = [lower && `Lower ${lower}`, upper && `Upper ${upper}`].filter(Boolean) as string[];
  if (rangeParts.length > 0) return rangeParts.join(' • ');
  return formatLimitValue(airspace.limits) || formatLimitValue(rawVertical?.text) || formatLimitValue(rawVertical?.display) || '';
};

const isAirspaceActiveNow = (airspace: OpenAipAirspace) => {
  const operatingHours = airspace.hoursOfOperation?.operatingHours;
  if (!operatingHours?.length) return true;
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return operatingHours.some((entry) => {
    if (entry.dayOfWeek && entry.dayOfWeek !== day) return false;
    const start = entry.startTime?.split(':').map(Number) ?? [];
    const end = entry.endTime?.split(':').map(Number) ?? [];
    if (start.length < 2 || end.length < 2) return true;
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    if (endMinutes < startMinutes) return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  });
};

const isMilitaryAirspace = (airspace: OpenAipAirspace) => airspace.activity === 17 || /mil/i.test(airspace.name || '');
const isTrainingAirspace = (airspace: OpenAipAirspace) => /train/i.test(airspace.name || '');
const isGlidingAirspace = (airspace: OpenAipAirspace) => /glid/i.test(airspace.name || '');
const isHangGlidingAirspace = (airspace: OpenAipAirspace) => /hang/i.test(airspace.name || '');
const isControlledAirspace = (airspace: OpenAipAirspace) =>
  /CTR|CONTROL\s*ZONE|CONTROLLED\s*TOR(E|W)R\s*REGION|CONTROL\s*TOR(E|W)R\s*REGION/i.test(airspace.name || '') ||
  airspace.type === 5 ||
  airspace.type === 10;

const getAirspaceClassCategory = (airspace: OpenAipAirspace) => {
  if (airspace.icaoClass === AIRSPACE_CLASS_E) return 'class-e';
  if (airspace.icaoClass === AIRSPACE_CLASS_F) return 'class-f';
  if (airspace.icaoClass === AIRSPACE_CLASS_G) return 'class-g';
  return 'other';
};

const getAirspaceCategory = (airspace: OpenAipAirspace) => {
  if (isControlledAirspace(airspace)) return 'ctr';
  if (isMilitaryAirspace(airspace)) return 'military';
  if (isTrainingAirspace(airspace)) return 'training';
  if (isGlidingAirspace(airspace)) return 'gliding';
  if (isHangGlidingAirspace(airspace)) return 'hang';
  return getAirspaceClassCategory(airspace);
};

const airspaceFeatureCollection = (items: OpenAipAirspace[]) => ({
  type: 'FeatureCollection' as const,
  features: items
    .filter((item) => item.geometry?.coordinates)
    .map((item) => ({
      type: 'Feature' as const,
      geometry: item.geometry,
      properties: {
        _id: item._id,
        name: item.name,
        category: getAirspaceCategory(item),
        limits: formatAirspaceVerticalLimits(item),
      },
    })),
});

const obstacleFeatureCollection = (items: OpenAipObstacle[]) => ({
  type: 'FeatureCollection' as const,
  features: items
    .filter((item) => item.geometry?.coordinates)
    .map((item) => ({
      type: 'Feature' as const,
      geometry: item.geometry,
      properties: {
        _id: item._id,
        name: item.name,
        height: item.height?.value,
        elevation: item.elevation?.value,
      },
    })),
});

const createAircraftIcon = (label: string, headingTrue?: number | null, onCourse?: boolean | null, isStale?: boolean, showLabel: boolean = true) => {
  const element = document.createElement('div');
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.gap = showLabel ? '8px' : '0';
  element.style.transform = 'translate(-8px, -8px)';
  element.innerHTML = `
    <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
      <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:18px solid ${
        isStale ? '#f59e0b' : onCourse === false ? '#ef4444' : '#10b981'
      };transform:rotate(${headingTrue ?? 0}deg);transform-origin:center 70%;filter:drop-shadow(0 0 6px ${
        isStale ? 'rgba(245,158,11,0.35)' : onCourse === false ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'
      });"></div>
    </div>
    ${
      showLabel
        ? `<div style="padding:4px 8px;border-radius:9999px;background:${
            isStale ? 'rgba(120,53,15,0.92)' : onCourse === false ? 'rgba(127,29,29,0.92)' : 'rgba(15,23,42,0.9)'
          };color:#f8fafc;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;border:1px solid ${
            isStale ? 'rgba(253,186,116,0.45)' : onCourse === false ? 'rgba(252,165,165,0.45)' : 'rgba(148,163,184,0.35)'
          };white-space:nowrap;">${label}</div>`
        : ''
    }`;
  return { element, size: showLabel ? [128, 36] as [number, number] : [28, 28] as [number, number], anchor: showLabel ? [20, 20] as [number, number] : [14, 14] as [number, number] };
};

const makeAircraftPopupContent = (session: FlightSession, stale: boolean) => {
  const root = document.createElement('div');
  root.className = 'space-y-1 text-xs';
  root.innerHTML = `
    <p class="font-black uppercase">${session.aircraftRegistration}</p>
    <p class="font-medium text-muted-foreground">${session.pilotName}</p>
    <p>${session.lastPosition?.latitude?.toFixed(6) ?? ''}, ${session.lastPosition?.longitude?.toFixed(6) ?? ''}</p>
    <p>Status: ${stale ? 'Stale' : 'Live'}</p>
  `;
  return root;
};

const makeWaypointPopupContent = (leg: NavlogLeg, index: number) => {
  const root = document.createElement('div');
  root.className = 'text-xs font-black uppercase space-y-1';
  root.innerHTML = buildWaypointPopupMarkup(leg, index);
  return root;
};

const makeHazardPopupContent = (hazard: Hazard) => {
  const root = document.createElement('div');
  root.className = 'p-2 space-y-2 min-w-[150px]';
  root.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-destructive"></div>
      <span class="text-[10px] font-black uppercase tracking-widest">Safety Hazard</span>
    </div>
    <p class="text-xs font-bold leading-relaxed">${hazard.note || 'No description provided.'}</p>
    <div class="pt-1 flex items-center justify-between border-t border-muted">
      <span class="text-[8px] text-muted-foreground uppercase font-black">Coordinates</span>
      <span class="text-[8px] font-mono font-bold text-muted-foreground">${formatWaypointCoordinatesDms(hazard.lat, hazard.lng)}</span>
    </div>
  `;
  return root;
};

const makeLabelPopupContent = (info: LayerInfoState, onAddWaypoint: ((lat: number, lon: number, title: string) => void) | undefined, onAddHazard: ((lat: number, lon: number) => void) | undefined) => {
  const root = document.createElement('div');
  root.className = 'space-y-3 text-xs';
  root.innerHTML = `
    <div>
      <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Layer Information</p>
      <p class="font-black uppercase">${info.title}</p>
      ${info.subtitle ? `<p class="text-[10px] font-black uppercase tracking-widest text-primary">${info.subtitle}</p>` : ''}
      <p class="text-[10px] text-muted-foreground">${formatWaypointCoordinatesDms(info.lat, info.lon)}</p>
    </div>
    <div class="space-y-2" data-items></div>
    <div class="flex flex-col gap-2 pt-2 border-t mt-4">
      <button type="button" data-add-waypoint class="h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase text-[10px] w-full rounded-md">Add to Route</button>
      ${onAddHazard ? '<button type="button" data-add-hazard class="h-8 border border-destructive/20 text-destructive hover:bg-destructive/10 font-black uppercase text-[10px] w-full rounded-md">Mark Hazard</button>' : ''}
    </div>
  `;

  const itemsHost = root.querySelector('[data-items]');
  if (itemsHost) {
    if (info.items.length > 0) {
      for (const item of info.items) {
        const entry = document.createElement('div');
        entry.className = 'rounded-md border bg-muted/30 px-2 py-1';
        entry.innerHTML = `
          <p class="font-black uppercase">${item.label}</p>
          <p class="text-[10px] uppercase tracking-widest text-muted-foreground">${item.layer}${typeof item.distanceNm === 'number' ? ` • ${item.distanceNm.toFixed(1)} NM` : ''}</p>
          ${item.detail ? `<p class="text-[10px] uppercase tracking-widest text-muted-foreground">${item.detail}</p>` : ''}
          ${item.frequencies ? `<p class="text-[10px] text-muted-foreground">${item.frequencies}</p>` : ''}
        `;
        itemsHost.appendChild(entry);
      }
    } else {
      const empty = document.createElement('p');
      empty.className = 'text-[10px] uppercase tracking-widest text-muted-foreground';
      empty.textContent = 'No nearby cached feature found.';
      itemsHost.appendChild(empty);
    }
  }

  root.querySelector<HTMLButtonElement>('[data-add-waypoint]')?.addEventListener('click', () => onAddWaypoint?.(info.lat, info.lon, info.title));
  root.querySelector<HTMLButtonElement>('[data-add-hazard]')?.addEventListener('click', () => onAddHazard?.(info.lat, info.lon));
  return root;
};

const pointFeatureCollection = (features: OpenAipFeature[]) => ({
  type: 'FeatureCollection' as const,
  features: features
    .filter((feature) => feature.geometry?.coordinates)
    .map((feature): any => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: feature.geometry!.coordinates },
      properties: {
        _id: feature._id,
        name: feature.name,
        icaoCode: feature.icaoCode,
        identifier: feature.identifier,
      },
    })),
});

const getSearchZoom = (sourceLayer: OpenAipFeature['sourceLayer']) => {
  if (sourceLayer === 'airports') return 13;
  if (sourceLayer === 'navaids') return 14;
  return 13;
};

export function AviationMapLibreShell({
  className,
  mode,
  center,
  baseLayer,
  minZoom,
  maxZoom,
  onZoomChange,
  onCenterChange,
  onMapReady,
  onUserInteracted,
  showLabels,
  showMasterChart,
  showAirports,
  showAirportLabels = showLabels,
  showNavaids,
  showNavaidLabels = showLabels,
  showReportingPoints,
  showReportingPointLabels = showLabels,
  showAirspaces,
  showAirspaceLabels = showLabels,
  showClassE,
  showClassELabels = showLabels,
  showClassF,
  showClassFLabels = showLabels,
  showClassG,
  showClassGLabels = showLabels,
  showMilitaryAreas,
  showMilitaryAreaLabels = showLabels,
  showTrainingAreas,
  showTrainingAreaLabels = showLabels,
  showGlidingSectors,
  showGlidingSectorLabels = showLabels,
  showHangGlidings,
  showHangGlidingLabels = showLabels,
  showObstacles,
  showObstacleLabels = showLabels,
  onlyActiveAirspace = false,
  sessions = [],
  navlogRoutesByBookingId = {},
  legs = [],
  hazards = [],
  isEditing = false,
  showAircraftNames = true,
  showAircraftTrails = true,
  showNavlogRoutes = true,
  showRouteLine = true,
  showWaypointMarkers = true,
  showHazards = true,
  onMoveWaypoint,
  onMapShortPress,
  onMapLongPress,
  pendingClickLabel,
  layerInfo,
  onAddWaypointFromLayerInfo,
  onAddHazardFromLayerInfo,
  onClearLayerInfo,
  onViewportFeaturesLoaded,
  onAirspaceFeaturesLoaded,
  onObstacleFeaturesLoaded,
}: AviationMapLibreShellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const routeSourceRef = useRef<GeoJSONSource | null>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  const onCenterChangeRef = useRef(onCenterChange);
  const onUserInteractedRef = useRef(onUserInteracted);
  const onMapShortPressRef = useRef(onMapShortPress);
  const onMapLongPressRef = useRef(onMapLongPress);
  const onMapReadyRef = useRef(onMapReady);
  const onMoveWaypointRef = useRef(onMoveWaypoint);
  const onAddWaypointFromLayerInfoRef = useRef(onAddWaypointFromLayerInfo);
  const onAddHazardFromLayerInfoRef = useRef(onAddHazardFromLayerInfo);
  const onClearLayerInfoRef = useRef(onClearLayerInfo);
  const [loadedAirportFeatures, setLoadedAirportFeatures] = useState<OpenAipFeature[]>([]);
  const [loadedNavaidFeatures, setLoadedNavaidFeatures] = useState<OpenAipFeature[]>([]);
  const [loadedReportingPointFeatures, setLoadedReportingPointFeatures] = useState<OpenAipFeature[]>([]);
  const [loadedAirspaceFeatures, setLoadedAirspaceFeatures] = useState<OpenAipAirspace[]>([]);
  const [loadedObstacleFeatures, setLoadedObstacleFeatures] = useState<OpenAipObstacle[]>([]);

  const useVectorOpenAipLayers = Boolean(OPENAIP_VECTOR_TILE_URL);
  const tileUrl = OPENAIP_VECTOR_TILE_URL ? `${OPENAIP_VECTOR_TILE_URL.replace(/\/$/, '')}/{z}/{x}/{y}.pbf` : '';
  const masterChartTileUrl = '/api/openaip/tiles/openaip/{z}/{x}/{y}';

  const routeGeoJson = useMemo(() => makeLineFeatureCollection(legs.filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined).map((leg) => [leg.latitude!, leg.longitude!] as [number, number])), [legs]);
  const sessionsGeoJson = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        trail: makeLineFeatureCollection((session.breadcrumb || []).filter((point) => point?.latitude !== undefined && point?.longitude !== undefined).map((point) => [point.latitude!, point.longitude!] as [number, number])),
        navlog: makeLineFeatureCollection((session.bookingId ? navlogRoutesByBookingId[session.bookingId] || [] : []).filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined).map((leg) => [leg.latitude!, leg.longitude!] as [number, number])),
      })),
    [navlogRoutesByBookingId, sessions]
  );

  const activeOpenAipLayers = useMemo(
    () => [
      ['openaip-airport-points', showMasterChart && showAirports],
      ['openaip-airport-labels', showLabels && showMasterChart && showAirports && showAirportLabels],
      ['openaip-navaid-points', showMasterChart && showNavaids],
      ['openaip-navaid-labels', showLabels && showMasterChart && showNavaids && showNavaidLabels],
      ['openaip-reporting-points', showMasterChart && showReportingPoints],
      ['openaip-reporting-labels', showLabels && showMasterChart && showReportingPoints && showReportingPointLabels],
      ['openaip-airspaces-ctr-fill', showMasterChart && showAirspaces],
      ['openaip-airspaces-ctr-line', showMasterChart && showAirspaces],
      ['openaip-airspaces-military-fill', showMasterChart && showMilitaryAreas],
      ['openaip-airspaces-military-line', showMasterChart && showMilitaryAreas],
      ['openaip-airspaces-training-fill', showMasterChart && showTrainingAreas],
      ['openaip-airspaces-training-line', showMasterChart && showTrainingAreas],
      ['openaip-airspaces-gliding-fill', showMasterChart && showGlidingSectors],
      ['openaip-airspaces-gliding-line', showMasterChart && showGlidingSectors],
      ['openaip-airspaces-hang-fill', showMasterChart && showHangGlidings],
      ['openaip-airspaces-hang-line', showMasterChart && showHangGlidings],
      ['openaip-airspaces-class-e-fill', showMasterChart && showClassE],
      ['openaip-airspaces-class-e-line', showMasterChart && showClassE],
      ['openaip-airspaces-class-f-fill', showMasterChart && showClassF],
      ['openaip-airspaces-class-f-line', showMasterChart && showClassF],
      ['openaip-airspaces-class-g-fill', showMasterChart && showClassG],
      ['openaip-airspaces-class-g-line', showMasterChart && showClassG],
      ['openaip-airspace-labels', showLabels && showMasterChart && (showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings) && showAirspaceLabels],
      ['openaip-obstacles', showMasterChart && showObstacles],
      ['openaip-obstacle-labels', showLabels && showMasterChart && showObstacles && showObstacleLabels],
    ] as const,
    [
      showAirports,
      showAirspaces,
      showAirportLabels,
      showAirspaceLabels,
      showClassE,
      showClassF,
      showClassG,
      showGlidingSectors,
      showHangGlidings,
      showLabels,
      showMasterChart,
      showMilitaryAreas,
      showNavaids,
      showNavaidLabels,
      showObstacles,
      showObstacleLabels,
      showReportingPointLabels,
      showReportingPoints,
      showTrainingAreas,
    ]
  );

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);
  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);
  useEffect(() => {
    onUserInteractedRef.current = onUserInteracted;
  }, [onUserInteracted]);
  useEffect(() => {
    onMapShortPressRef.current = onMapShortPress;
  }, [onMapShortPress]);
  useEffect(() => {
    onMapLongPressRef.current = onMapLongPress;
  }, [onMapLongPress]);
  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);
  useEffect(() => {
    onMoveWaypointRef.current = onMoveWaypoint;
  }, [onMoveWaypoint]);
  useEffect(() => {
    onAddWaypointFromLayerInfoRef.current = onAddWaypointFromLayerInfo;
  }, [onAddWaypointFromLayerInfo]);
  useEffect(() => {
    onAddHazardFromLayerInfoRef.current = onAddHazardFromLayerInfo;
  }, [onAddHazardFromLayerInfo]);
  useEffect(() => {
    onClearLayerInfoRef.current = onClearLayerInfo;
  }, [onClearLayerInfo]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAPLIBRE_BASE_STYLES[baseLayer],
      center: [center[1], center[0]],
      zoom: 8,
      minZoom,
      maxZoom,
      pitch: 0,
      bearing: 0,
      interactive: true,
      dragRotate: true,
      touchPitch: true,
      cooperativeGestures: true,
    });
    mapRef.current = map;

    const syncMapBounds = () => {
      onZoomChangeRef.current?.(map.getZoom());
      const mapCenter = map.getCenter();
      onCenterChangeRef.current?.([mapCenter.lat, mapCenter.lng]);
    };

    const handleMapInteraction = () => onUserInteractedRef.current?.();

    map.on('load', () => {
      if (mode === 'fleet-tracker') {
        map.addSource('fleet-tracker-aircraft-trails', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as any });
        map.addLayer({
          id: 'fleet-tracker-aircraft-trails',
          type: 'line',
          source: 'fleet-tracker-aircraft-trails',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 3,
            'line-opacity': 0.72,
          },
          layout: { 'line-cap': 'round', 'line-join': 'round', visibility: toLayerVisibility(showAircraftTrails) },
        });
      }

      map.addSource('openaip-master-chart', {
        type: 'raster',
        tiles: [masterChartTileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 16,
      });
      map.addLayer({
        id: 'openaip-master-chart-layer',
        type: 'raster',
        source: 'openaip-master-chart',
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 },
        layout: { visibility: toLayerVisibility(showMasterChart) },
      } as any);

      if (tileUrl) {
        map.addSource('openaip', { type: 'vector', tiles: [tileUrl], minzoom: 0, maxzoom: 16 });

        const pointLabelLayout = {
          'text-field': ['coalesce', ['get', 'icaoCode'], ['get', 'identifier'], ['get', 'name']],
          'text-size': 11,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 1],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
          'icon-rotation-alignment': 'map',
          visibility: 'visible',
        } as const;
        const pointCirclePaint = {
          'circle-radius': 4,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        } as const;

        map.addLayer({
          id: 'openaip-airport-points',
          type: 'circle',
          source: 'openaip',
          'source-layer': 'airports',
          paint: { ...pointCirclePaint, 'circle-color': '#2563eb', 'circle-stroke-opacity': 0.95 },
          layout: { visibility: toLayerVisibility(showMasterChart && showAirports) },
        } as any);
        map.addLayer({
          id: 'openaip-airport-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'airports',
          layout: { ...pointLabelLayout, visibility: toLayerVisibility(showLabels && showMasterChart && showAirports && showAirportLabels) } as any,
          paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.25 },
        });
        map.addLayer({
          id: 'openaip-navaid-points',
          type: 'circle',
          source: 'openaip',
          'source-layer': 'navaids',
          paint: { ...pointCirclePaint, 'circle-color': '#7c3aed', 'circle-stroke-opacity': 0.95 },
          layout: { visibility: toLayerVisibility(showMasterChart && showNavaids) },
        } as any);
        map.addLayer({
          id: 'openaip-navaid-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'navaids',
          layout: { ...pointLabelLayout, visibility: toLayerVisibility(showLabels && showMasterChart && showNavaids && showNavaidLabels) } as any,
          paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.25 },
        });
        map.addLayer({
          id: 'openaip-reporting-points',
          type: 'circle',
          source: 'openaip',
          'source-layer': 'reporting-points',
          paint: { ...pointCirclePaint, 'circle-color': '#d97706', 'circle-stroke-opacity': 0.95 },
          layout: { visibility: toLayerVisibility(showMasterChart && showReportingPoints) },
        } as any);
        map.addLayer({
          id: 'openaip-reporting-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'reporting-points',
          layout: { ...pointLabelLayout, visibility: toLayerVisibility(showLabels && showMasterChart && showReportingPoints && showReportingPointLabels) } as any,
          paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.25 },
        });

        const addAirspaceLayers = (layerSuffix: string, sourceLayer: string, fillColor: string, lineColor: string, filter: any, visible: boolean) => {
          map.addLayer({
            id: `openaip-airspaces-${layerSuffix}-fill`,
            type: 'fill',
            source: 'openaip',
            'source-layer': sourceLayer,
            filter,
            paint: { 'fill-color': fillColor, 'fill-opacity': 0.12 },
            layout: { visibility: toLayerVisibility(visible) },
          } as any);
          map.addLayer({
            id: `openaip-airspaces-${layerSuffix}-line`,
            type: 'line',
            source: 'openaip',
            'source-layer': sourceLayer,
            filter,
            paint: { 'line-color': lineColor, 'line-width': 1.8, 'line-opacity': 0.9 },
            layout: { visibility: toLayerVisibility(visible) },
          } as any);
        };

        const activeAirspaceFilter: any = ['any', ['!has', 'hoursOfOperation'], ['==', ['get', 'active'], true]];
        addAirspaceLayers('ctr', 'airspaces', '#dc2626', '#dc2626', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'ctr']] as any, showMasterChart && showAirspaces);
        addAirspaceLayers('military', 'airspaces', '#ef4444', '#ef4444', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'military']] as any, showMasterChart && showMilitaryAreas);
        addAirspaceLayers('training', 'airspaces', '#f59e0b', '#f59e0b', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'training']] as any, showMasterChart && showTrainingAreas);
        addAirspaceLayers('gliding', 'airspaces', '#22c55e', '#22c55e', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'gliding']] as any, showMasterChart && showGlidingSectors);
        addAirspaceLayers('hang', 'airspaces', '#a855f7', '#a855f7', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'hang']] as any, showMasterChart && showHangGlidings);
        addAirspaceLayers('class-e', 'airspaces', '#3b82f6', '#3b82f6', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'class-e']] as any, showMasterChart && showClassE);
        addAirspaceLayers('class-f', 'airspaces', '#f97316', '#f97316', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'class-f']] as any, showMasterChart && showClassF);
        addAirspaceLayers('class-g', 'airspaces', '#14b8a6', '#14b8a6', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'class-g']] as any, showMasterChart && showClassG);

        map.addLayer({
          id: 'openaip-airspace-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'airspaces',
          filter: activeAirspaceFilter,
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', 'limits']],
            'text-size': 11,
            'text-offset': [0, 0],
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            visibility: toLayerVisibility(showLabels && showMasterChart && (showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings) && showAirspaceLabels),
          } as any,
          paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.25 },
        } as any);

        map.addLayer({
          id: 'openaip-obstacles',
          type: 'circle',
          source: 'openaip',
          'source-layer': 'obstacles',
          paint: {
            'circle-color': '#ef4444',
            'circle-radius': ['case', ['>', ['to-number', ['coalesce', ['get', 'height'], 0]], 250], 5, 4],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.9,
          },
          layout: { visibility: toLayerVisibility(showMasterChart && showObstacles) },
        } as any);
        map.addLayer({
          id: 'openaip-obstacle-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'obstacles',
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', '_id']],
            'text-size': 11,
            'text-offset': [0, 1],
            'text-anchor': 'top',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            visibility: toLayerVisibility(showLabels && showMasterChart && showObstacles && showObstacleLabels),
          } as any,
          paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.25 },
        } as any);
      } else {
        map.addSource('openaip-airports', { type: 'geojson', data: pointFeatureCollection(loadedAirportFeatures) as any });
        map.addSource('openaip-navaids', { type: 'geojson', data: pointFeatureCollection(loadedNavaidFeatures) as any });
        map.addSource('openaip-reporting-points', { type: 'geojson', data: pointFeatureCollection(loadedReportingPointFeatures) as any });
        map.addSource('openaip-airspaces-class-e', { type: 'geojson', data: loadedAirspaceFeatures.length ? airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => getAirspaceClassCategory(item) === 'class-e')) as any : { type: 'FeatureCollection', features: [] } as any });
        map.addSource('openaip-airspaces-class-f', { type: 'geojson', data: loadedAirspaceFeatures.length ? airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => getAirspaceClassCategory(item) === 'class-f')) as any : { type: 'FeatureCollection', features: [] } as any });
        map.addSource('openaip-airspaces-class-g', { type: 'geojson', data: loadedAirspaceFeatures.length ? airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => getAirspaceClassCategory(item) === 'class-g')) as any : { type: 'FeatureCollection', features: [] } as any });
        map.addSource('openaip-airspaces-ctr', { type: 'geojson', data: loadedAirspaceFeatures.length ? airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => getAirspaceCategory(item) === 'ctr')) as any : { type: 'FeatureCollection', features: [] } as any });
        map.addSource('openaip-airspaces-military', { type: 'geojson', data: loadedAirspaceFeatures.length ? airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => isMilitaryAirspace(item))) as any : { type: 'FeatureCollection', features: [] } as any });
        map.addSource('openaip-airspaces-training', { type: 'geojson', data: loadedAirspaceFeatures.length ? airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => isTrainingAirspace(item))) as any : { type: 'FeatureCollection', features: [] } as any });
        map.addSource('openaip-airspaces-gliding', { type: 'geojson', data: loadedAirspaceFeatures.length ? airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => isGlidingAirspace(item))) as any : { type: 'FeatureCollection', features: [] } as any });
        map.addSource('openaip-airspaces-hang', { type: 'geojson', data: loadedAirspaceFeatures.length ? airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => isHangGlidingAirspace(item))) as any : { type: 'FeatureCollection', features: [] } as any });
        map.addSource('openaip-obstacles', { type: 'geojson', data: obstacleFeatureCollection(loadedObstacleFeatures) as any });

        const labelLayout = {
          'text-field': ['coalesce', ['get', 'icaoCode'], ['get', 'identifier'], ['get', 'name']],
          'text-size': 11,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 1],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
          'symbol-placement': 'point',
          visibility: 'visible',
        } as any;

        const addFallbackPointLayer = (id: string, source: string, color: string, visible: boolean, labelsVisible: boolean) => {
          map.addLayer({
            id: `${id}-points`,
            type: 'circle',
            source,
            paint: {
              'circle-color': color,
              'circle-radius': 4,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.95,
            },
            layout: { visibility: toLayerVisibility(visible) },
          } as any);
          map.addLayer({
            id: `${id}-labels`,
            type: 'symbol',
            source,
            layout: { ...labelLayout, visibility: toLayerVisibility(labelsVisible) },
            paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.25 },
          } as any);
        };

        addFallbackPointLayer('openaip-airport', 'openaip-airports', '#2563eb', showMasterChart && showAirports, showLabels && showMasterChart && showAirports && showAirportLabels);
        addFallbackPointLayer('openaip-navaid', 'openaip-navaids', '#7c3aed', showMasterChart && showNavaids, showLabels && showMasterChart && showNavaids && showNavaidLabels);
        addFallbackPointLayer('openaip-reporting', 'openaip-reporting-points', '#d97706', showMasterChart && showReportingPoints, showLabels && showMasterChart && showReportingPoints && showReportingPointLabels);

        const addFallbackAirspaceLayer = (id: string, source: string, fillColor: string, lineColor: string, visible: boolean) => {
          map.addLayer({ id: `${id}-fill`, type: 'fill', source, paint: { 'fill-color': fillColor, 'fill-opacity': 0.12 }, layout: { visibility: toLayerVisibility(visible) } } as any);
          map.addLayer({ id: `${id}-line`, type: 'line', source, paint: { 'line-color': lineColor, 'line-width': 1.8, 'line-opacity': 0.9 }, layout: { visibility: toLayerVisibility(visible) } } as any);
        };

        addFallbackAirspaceLayer('openaip-airspaces-ctr', 'openaip-airspaces-ctr', '#dc2626', '#dc2626', showMasterChart && showAirspaces);
        addFallbackAirspaceLayer('openaip-airspaces-military', 'openaip-airspaces-military', '#ef4444', '#ef4444', showMasterChart && showMilitaryAreas);
        addFallbackAirspaceLayer('openaip-airspaces-training', 'openaip-airspaces-training', '#f59e0b', '#f59e0b', showMasterChart && showTrainingAreas);
        addFallbackAirspaceLayer('openaip-airspaces-gliding', 'openaip-airspaces-gliding', '#22c55e', '#22c55e', showMasterChart && showGlidingSectors);
        addFallbackAirspaceLayer('openaip-airspaces-hang', 'openaip-airspaces-hang', '#a855f7', '#a855f7', showMasterChart && showHangGlidings);
        addFallbackAirspaceLayer('openaip-airspaces-class-e', 'openaip-airspaces-class-e', '#3b82f6', '#3b82f6', showMasterChart && showClassE);
        addFallbackAirspaceLayer('openaip-airspaces-class-f', 'openaip-airspaces-class-f', '#f97316', '#f97316', showMasterChart && showClassF);
        addFallbackAirspaceLayer('openaip-airspaces-class-g', 'openaip-airspaces-class-g', '#14b8a6', '#14b8a6', showMasterChart && showClassG);
        map.addLayer({
          id: 'openaip-airspace-labels',
          type: 'symbol',
          source: 'openaip-airspaces-ctr',
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', 'limits']],
            'text-size': 11,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 0],
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            visibility: toLayerVisibility(showLabels && showMasterChart && (showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings) && showAirspaceLabels),
          } as any,
          paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.25 },
        } as any);
        map.addLayer({
          id: 'openaip-obstacles',
          type: 'circle',
          source: 'openaip-obstacles',
          paint: {
            'circle-color': '#ef4444',
            'circle-radius': ['case', ['>', ['to-number', ['coalesce', ['get', 'height'], 0]], 250], 5, 4],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.9,
          },
          layout: { visibility: toLayerVisibility(showMasterChart && showObstacles) },
        } as any);
        map.addLayer({
          id: 'openaip-obstacle-labels',
          type: 'symbol',
          source: 'openaip-obstacles',
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', '_id']],
            'text-size': 11,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1],
            'text-anchor': 'top',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            visibility: toLayerVisibility(showLabels && showMasterChart && showObstacles && showObstacleLabels),
          } as any,
          paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.25 },
        } as any);
      }

      if (showRouteLine) {
        map.addSource('route', { type: 'geojson', data: routeGeoJson as any });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': ROUTE_LINE_COLOR,
            'line-width': ROUTE_LINE_WIDTH,
            'line-opacity': ROUTE_LINE_OPACITY,
          },
          layout: { 'line-cap': 'round', 'line-join': 'round', visibility: toLayerVisibility(true) },
        });
      }

      const markerIds: string[] = [];
      const addMarker = (id: string, marker: maplibregl.Marker) => {
        markerIds.push(id);
        marker.addTo(map);
      };

      if (mode === 'fleet-tracker') {
        for (const session of sessions) {
          const position = session.lastPosition;
          if (!position?.latitude || !position.longitude) continue;
          const stale = false;
          const heading = normalizeHeading(position.headingTrue) ?? 0;
          const markerInfo = createAircraftIcon(session.aircraftRegistration, heading, session.onCourse, stale, showAircraftNames);
          const marker = new maplibregl.Marker({ element: markerInfo.element, anchor: 'center' });
          marker.setLngLat([position.longitude, position.latitude]);
          marker.setPopup(new maplibregl.Popup({ offset: 20 }).setDOMContent(makeAircraftPopupContent(session, stale)));
          marker.getElement().style.transform = `rotate(${heading}deg)`;
          addMarker(`session-${session.id}`, marker);

          const breadcrumbPoints = (session.breadcrumb || [])
            .filter((point) => point?.latitude !== undefined && point?.longitude !== undefined)
            .map((point) => [point.latitude!, point.longitude!] as [number, number]);
          const navlogRoutePoints = (session.bookingId ? navlogRoutesByBookingId[session.bookingId] || [] : [])
            .filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined)
            .map((leg) => [leg.latitude!, leg.longitude!] as [number, number]);

          if (showAircraftTrails && breadcrumbPoints.length > 1) {
            const sourceId = `session-trail-${session.id}`;
            map.addSource(sourceId, { type: 'geojson', data: makeLineFeatureCollection(breadcrumbPoints) as any });
            map.addLayer({
              id: `session-trail-layer-${session.id}`,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': '#10b981',
                'line-width': 4,
                'line-opacity': 0.8,
                'line-dasharray': [8, 8],
              },
              layout: { 'line-cap': 'round', 'line-join': 'round', visibility: toLayerVisibility(true) },
            } as any);
          }

          if (showNavlogRoutes && navlogRoutePoints.length > 1) {
            const sourceId = `session-navlog-${session.id}`;
            map.addSource(sourceId, { type: 'geojson', data: makeLineFeatureCollection(navlogRoutePoints) as any });
            map.addLayer({
              id: `session-navlog-layer-${session.id}`,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': '#2563eb',
                'line-width': 3,
                'line-opacity': 0.7,
                'line-dasharray': [10, 8],
              },
              layout: { 'line-cap': 'round', 'line-join': 'round', visibility: toLayerVisibility(true) },
            } as any);
          }
        }
      }

      if (mode === 'route-planner' && layerInfo) {
        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 16 });
        popup.setLngLat([layerInfo.lon, layerInfo.lat]);
        popup.setDOMContent(makeLabelPopupContent(layerInfo, onAddWaypointFromLayerInfoRef.current, onAddHazardFromLayerInfoRef.current));
        popup.on('close', () => onClearLayerInfoRef.current?.());
        popup.addTo(map);
      }

      onMapReadyRef.current?.(map);
      map.resize();
      onZoomChangeRef.current?.(map.getZoom());
      const initialCenter = map.getCenter();
      onCenterChangeRef.current?.([initialCenter.lat, initialCenter.lng]);
      syncMapBounds();
    });

    const handlePressState = {
      latlng: null as Point | null,
      timer: null as number | null,
      longTriggered: false,
    };

    const clearPress = () => {
      if (handlePressState.timer !== null) {
        window.clearTimeout(handlePressState.timer);
      }
      handlePressState.latlng = null;
      handlePressState.timer = null;
      handlePressState.longTriggered = false;
    };

    const startPress = (lat: number, lon: number) => {
      clearPress();
      handlePressState.latlng = [lat, lon];
      handlePressState.timer = window.setTimeout(() => {
        if (!handlePressState.latlng) return;
        handlePressState.longTriggered = true;
        onMapLongPressRef.current?.(lat, lon);
      }, LONG_PRESS_MS);
    };

    const endPress = (lat: number, lon: number) => {
      if (!handlePressState.latlng) return;
      if (handlePressState.timer !== null) {
        window.clearTimeout(handlePressState.timer);
      }
      const [startLat, startLon] = handlePressState.latlng;
      const moved = distanceMeters(startLat, startLon, lat, lon);
      const longTriggered = handlePressState.longTriggered;
      clearPress();
      if (!longTriggered && moved <= CLICK_MOVE_TOLERANCE_METERS) {
        onMapShortPressRef.current?.(startLat, startLon);
      }
    };

    const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
      if ((e.originalEvent as MouseEvent).button !== 0) return;
      startPress(e.lngLat.lat, e.lngLat.lng);
    };
    const handleMouseUp = (e: maplibregl.MapMouseEvent) => {
      endPress(e.lngLat.lat, e.lngLat.lng);
    };
    const handleDragStart = () => {
      clearPress();
      handleMapInteraction();
    };
    const handleRotate = () => handleMapInteraction();

    map.on('moveend', syncMapBounds);
    map.on('zoomend', syncMapBounds);
    map.on('dragstart', handleDragStart);
    map.on('zoomstart', handleMapInteraction);
    map.on('rotate', handleRotate);
    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      clearPress();
      map.off('moveend', syncMapBounds);
      map.off('zoomend', syncMapBounds);
      map.off('dragstart', handleDragStart);
      map.off('zoomstart', handleMapInteraction);
      map.off('rotate', handleRotate);
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUp);
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);
  }, [maxZoom, minZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer('openaip-master-chart-layer')) {
      map.setLayoutProperty('openaip-master-chart-layer', 'visibility', toLayerVisibility(showMasterChart));
    }

    const visibilityUpdates: Array<[string, boolean]> = [
      ['openaip-airport-points', showMasterChart && showAirports],
      ['openaip-airport-labels', showLabels && showMasterChart && showAirports && showAirportLabels],
      ['openaip-navaid-points', showMasterChart && showNavaids],
      ['openaip-navaid-labels', showLabels && showMasterChart && showNavaids && showNavaidLabels],
      ['openaip-reporting-points', showMasterChart && showReportingPoints],
      ['openaip-reporting-labels', showLabels && showMasterChart && showReportingPoints && showReportingPointLabels],
      ['openaip-airspaces-ctr-fill', showMasterChart && showAirspaces],
      ['openaip-airspaces-ctr-line', showMasterChart && showAirspaces],
      ['openaip-airspaces-military-fill', showMasterChart && showMilitaryAreas],
      ['openaip-airspaces-military-line', showMasterChart && showMilitaryAreas],
      ['openaip-airspaces-training-fill', showMasterChart && showTrainingAreas],
      ['openaip-airspaces-training-line', showMasterChart && showTrainingAreas],
      ['openaip-airspaces-gliding-fill', showMasterChart && showGlidingSectors],
      ['openaip-airspaces-gliding-line', showMasterChart && showGlidingSectors],
      ['openaip-airspaces-hang-fill', showMasterChart && showHangGlidings],
      ['openaip-airspaces-hang-line', showMasterChart && showHangGlidings],
      ['openaip-airspaces-class-e-fill', showMasterChart && showClassE],
      ['openaip-airspaces-class-e-line', showMasterChart && showClassE],
      ['openaip-airspaces-class-f-fill', showMasterChart && showClassF],
      ['openaip-airspaces-class-f-line', showMasterChart && showClassF],
      ['openaip-airspaces-class-g-fill', showMasterChart && showClassG],
      ['openaip-airspaces-class-g-line', showMasterChart && showClassG],
      ['openaip-airspace-labels', showLabels && showMasterChart && (showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings) && showAirspaceLabels],
      ['openaip-obstacles', showMasterChart && showObstacles],
      ['openaip-obstacle-labels', showLabels && showMasterChart && showObstacles && showObstacleLabels],
    ];

    for (const [layerId, visible] of visibilityUpdates) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', toLayerVisibility(visible));
      }
    }
  }, [
    showAirports,
    showAirportLabels,
    showAirspaces,
    showAirspaceLabels,
    showClassE,
    showClassF,
    showClassG,
    showGlidingSectors,
    showHangGlidings,
    showLabels,
    showMasterChart,
    showMilitaryAreas,
    showNavaids,
    showNavaidLabels,
    showObstacles,
    showObstacleLabels,
    showReportingPointLabels,
    showReportingPoints,
    showTrainingAreas,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || useVectorOpenAipLayers) return;

    const airportSource = map.getSource('openaip-airports') as GeoJSONSource | undefined;
    const navaidSource = map.getSource('openaip-navaids') as GeoJSONSource | undefined;
    const reportingSource = map.getSource('openaip-reporting-points') as GeoJSONSource | undefined;
    const classESource = map.getSource('openaip-airspaces-class-e') as GeoJSONSource | undefined;
    const classFSource = map.getSource('openaip-airspaces-class-f') as GeoJSONSource | undefined;
    const classGSource = map.getSource('openaip-airspaces-class-g') as GeoJSONSource | undefined;
    const ctrSource = map.getSource('openaip-airspaces-ctr') as GeoJSONSource | undefined;
    const militarySource = map.getSource('openaip-airspaces-military') as GeoJSONSource | undefined;
    const trainingSource = map.getSource('openaip-airspaces-training') as GeoJSONSource | undefined;
    const glidingSource = map.getSource('openaip-airspaces-gliding') as GeoJSONSource | undefined;
    const hangSource = map.getSource('openaip-airspaces-hang') as GeoJSONSource | undefined;
    const obstacleSource = map.getSource('openaip-obstacles') as GeoJSONSource | undefined;

    airportSource?.setData(pointFeatureCollection(loadedAirportFeatures) as any);
    navaidSource?.setData(pointFeatureCollection(loadedNavaidFeatures) as any);
    reportingSource?.setData(pointFeatureCollection(loadedReportingPointFeatures) as any);
    classESource?.setData(airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => getAirspaceClassCategory(item) === 'class-e')) as any);
    classFSource?.setData(airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => getAirspaceClassCategory(item) === 'class-f')) as any);
    classGSource?.setData(airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => getAirspaceClassCategory(item) === 'class-g')) as any);
    ctrSource?.setData(airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => getAirspaceCategory(item) === 'ctr')) as any);
    militarySource?.setData(airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => isMilitaryAirspace(item))) as any);
    trainingSource?.setData(airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => isTrainingAirspace(item))) as any);
    glidingSource?.setData(airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => isGlidingAirspace(item))) as any);
    hangSource?.setData(airspaceFeatureCollection(loadedAirspaceFeatures.filter((item) => isHangGlidingAirspace(item))) as any);
    obstacleSource?.setData(obstacleFeatureCollection(loadedObstacleFeatures) as any);
  }, [loadedAirspaceFeatures, loadedAirportFeatures, loadedNavaidFeatures, loadedObstacleFeatures, loadedReportingPointFeatures, useVectorOpenAipLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reloadVisibleOpenAipData = async () => {
      if (!showMasterChart) return;
      const bounds = map.getBounds();
      const bbox = [bounds.getWest().toFixed(6), bounds.getSouth().toFixed(6), bounds.getEast().toFixed(6), bounds.getNorth().toFixed(6)].join(',');

      const loadItems = async <T,>(resource: string) => {
        const payload = await fetchOpenAipJson<{ items?: T[] }>(`/api/openaip?resource=${resource}&bbox=${bbox}`);
        return normalizeOpenAipItems(payload);
      };

      const [airports, navaids, reportingPoints, airspaces, obstacles] = await Promise.all([
        showAirports ? loadItems<any>('airports') : Promise.resolve([]),
        showNavaids ? loadItems<any>('navaids') : Promise.resolve([]),
        showReportingPoints ? loadItems<any>('reporting-points') : Promise.resolve([]),
        (showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings) ? loadItems<any>('airspaces') : Promise.resolve([]),
        showObstacles ? loadItems<any>('obstacles') : Promise.resolve([]),
      ]);

      const nextAirportFeatures = (airports as any[]).map((item) => ({ ...item, sourceLayer: 'airports' }));
      const nextNavaidFeatures = (navaids as any[]).map((item) => ({ ...item, sourceLayer: 'navaids' }));
      const nextReportingPointFeatures = (reportingPoints as any[]).map((item) => ({ ...item, sourceLayer: 'reporting-points' }));
      const nextAirspaceFeatures = (airspaces as any[]).filter((item) => item.geometry?.coordinates);
      const nextObstacleFeatures = (obstacles as any[]).filter((item) => item.geometry?.coordinates);

      setLoadedAirportFeatures(nextAirportFeatures);
      setLoadedNavaidFeatures(nextNavaidFeatures);
      setLoadedReportingPointFeatures(nextReportingPointFeatures);
      setLoadedAirspaceFeatures(nextAirspaceFeatures);
      setLoadedObstacleFeatures(nextObstacleFeatures);

      onViewportFeaturesLoaded?.(nextAirportFeatures.concat(nextNavaidFeatures, nextReportingPointFeatures));
      onAirspaceFeaturesLoaded?.(nextAirspaceFeatures as any);
      onObstacleFeaturesLoaded?.(nextObstacleFeatures as any);
    };

    void reloadVisibleOpenAipData();
    const refresh = () => {
      void reloadVisibleOpenAipData();
      onUserInteractedRef.current?.();
    };

    map.on('moveend', refresh);
    map.on('zoomend', refresh);
    return () => {
      map.off('moveend', refresh);
      map.off('zoomend', refresh);
    };
  }, [
    onAirspaceFeaturesLoaded,
    onObstacleFeaturesLoaded,
    onViewportFeaturesLoaded,
    showAirports,
    showAirspaces,
    showClassE,
    showClassF,
    showClassG,
    showGlidingSectors,
    showHangGlidings,
    showMasterChart,
    showMilitaryAreas,
    showNavaids,
    showObstacles,
    showReportingPoints,
    showTrainingAreas,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('route') as GeoJSONSource | undefined;
    source?.setData(routeGeoJson as any);
  }, [routeGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const leg of legs) {
      const marker = document.querySelector<HTMLElement>(`[data-leg-marker="${leg.id}"]`);
      if (marker && leg.latitude !== undefined && leg.longitude !== undefined) {
        // marker is positioned via maplibregl.Marker effects below
      }
    }
  }, [legs]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const waypointMarkers: maplibregl.Marker[] = [];
    const sessionMarkers: maplibregl.Marker[] = [];

    if (mode === 'fleet-tracker') {
      for (const session of sessions) {
        const position = session.lastPosition;
        if (!position?.latitude || !position.longitude) continue;
        const stale = false;
        const heading = normalizeHeading(position.headingTrue) ?? 0;
        const { element } = createAircraftIcon(session.aircraftRegistration, heading, session.onCourse, stale, showAircraftNames);
        element.setAttribute('data-session-marker', session.id);
        const marker = new maplibregl.Marker({ element, anchor: 'center' });
        marker.setLngLat([position.longitude, position.latitude]);
        marker.setPopup(new maplibregl.Popup({ offset: 20 }).setDOMContent(makeAircraftPopupContent(session, stale)));
        marker.addTo(map);
        sessionMarkers.push(marker);
      }
    }

    if (mode === 'route-planner') {
      for (const [index, leg] of legs.entries()) {
        if (leg.latitude === undefined || leg.longitude === undefined) continue;
        const element = createNumberedWaypointElement(index + 1);
        element.setAttribute('data-leg-marker', leg.id);
        element.style.cursor = isEditing ? 'grab' : 'pointer';
        element.style.touchAction = 'none';
        element.style.userSelect = 'none';
        const marker = new maplibregl.Marker({ element, draggable: isEditing, anchor: 'center' });
        marker.setLngLat([leg.longitude, leg.latitude]);
        marker.setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(makeWaypointPopupContent(leg, index)));
        marker.on('dragstart', () => {
          element.style.cursor = 'grabbing';
          map.dragPan.disable();
          map.touchZoomRotate.disable();
        });
        marker.on('dragend', () => {
          element.style.cursor = 'grab';
          map.dragPan.enable();
          map.touchZoomRotate.enable();
          const next = marker.getLngLat();
          onMoveWaypointRef.current?.(leg.id, next.lat, next.lng);
        });
        marker.addTo(map);
        waypointMarkers.push(marker);
      }

      for (const hazard of hazards) {
        const element = document.createElement('div');
        element.style.width = '24px';
        element.style.height = '24px';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        element.style.borderRadius = '9999px';
        element.style.background = '#ef4444';
        element.style.border = '2px solid #fff';
        element.style.boxShadow = '0 0 0 2px rgba(239,68,68,0.35)';
        element.style.color = '#fff';
        element.style.fontSize = '14px';
        element.style.fontWeight = '900';
        element.textContent = '!';
        const marker = new maplibregl.Marker({ element, anchor: 'center' });
        marker.setLngLat([hazard.lng, hazard.lat]);
        marker.setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(makeHazardPopupContent(hazard)));
        marker.addTo(map);
      }
    }

    return () => {
      waypointMarkers.forEach((marker) => marker.remove());
      sessionMarkers.forEach((marker) => marker.remove());
    };
  }, [hazards, isEditing, legs, mode, sessions, showAircraftNames]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mode !== 'route-planner' || !layerInfo) return;

        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 16 });
    popup.setLngLat([layerInfo.lon, layerInfo.lat]);
    popup.setDOMContent(makeLabelPopupContent(layerInfo, onAddWaypointFromLayerInfoRef.current, onAddHazardFromLayerInfoRef.current));
    popup.on('close', () => onClearLayerInfoRef.current?.());
    popup.addTo(map);
    return () => {
      popup.remove();
    };
  }, [layerInfo, mode]);

  return <div ref={containerRef} className={className ?? 'absolute inset-0 h-full w-full'} aria-hidden="true" />;
}
