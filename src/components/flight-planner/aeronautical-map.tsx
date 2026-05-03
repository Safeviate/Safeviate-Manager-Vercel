'use client';

import { TileLayer, Marker, Popup, Polyline, GeoJSON, FeatureGroup, useMapEvents, LayersControl, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NavlogLeg, Hazard } from '@/types/booking';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, X, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { parseJsonResponse } from '@/lib/safe-json';
import { LeafletMapFrame } from '@/components/maps/leaflet-map-frame';
import { ROUTE_LINE_COLOR, ROUTE_LINE_OPACITY, ROUTE_LINE_WIDTH } from '@/components/maps/route-line-style';
import { createNumberedWaypointIcon } from '@/components/maps/waypoint-marker-style';
import type { ReactNode } from 'react';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const createMeasurePointIcon = (label: string, color = '#0f172a') =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        min-width:22px;
        height:22px;
        padding:0 6px;
        border-radius:9999px;
        background:${color};
        border:2px solid #fff;
        box-shadow:0 0 0 2px rgba(15,23,42,0.28);
        color:#fff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:11px;
        font-weight:900;
        line-height:1;
        white-space:nowrap;
      ">${label}</div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const createMeasureLabelIcon = (label: string) => {
  const width = Math.max(58, label.length * 7 + 16);
  return L.divIcon({
    className: '',
    html: `
      <div style="
        min-width:${width}px;
        height:24px;
        padding:0 8px;
        border-radius:9999px;
        background:rgba(15,23,42,0.92);
        border:2px solid #fff;
        box-shadow:0 0 0 2px rgba(15,23,42,0.24);
        color:#fff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:10px;
        font-weight:900;
        line-height:1;
        white-space:nowrap;
      ">${label}</div>
    `,
    iconSize: [width, 24],
    iconAnchor: [width / 2, 12],
  });
};

const getOwnshipInnerMarkup = (style: OwnshipIconStyle = 'triangle') =>
  style === 'aircraft'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true" style="position:relative;z-index:1;width:19px;height:19px;fill:#0369a1;filter:drop-shadow(0 1px 1px rgba(15,23,42,0.2));"><path d="M12 2l2.6 6.6 6.4 1.2-6.4 1.4L12 22l-2.6-10.8-6.4-1.4 6.4-1.2L12 2z" /></svg>'
    : style === 'dot-line'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true" style="position:relative;z-index:1;width:20px;height:20px;overflow:visible;filter:drop-shadow(0 1px 1px rgba(15,23,42,0.2));"><path d="M3 12h11" stroke="#0369a1" stroke-width="3.25" stroke-linecap="round"/><path d="M14 6l8 6-8 6v-4H10v-4h4z" fill="#0369a1"/><circle cx="4.5" cy="12" r="3.5" fill="#0369a1" stroke="#fff" stroke-width="1.75"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true" style="position:relative;z-index:1;width:19px;height:19px;fill:#0369a1;filter:drop-shadow(0 1px 1px rgba(15,23,42,0.2));"><path d="M12 2l8 20-8-4-8 4z" /></svg>';

const getOwnshipIconMarkup = (headingTrue?: number | null, style: OwnshipIconStyle = 'triangle') =>
  `
      <div style="
        width:32px;
        height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        transform:rotate(${headingTrue != null && !Number.isNaN(headingTrue) ? headingTrue : 0}deg);
        transform-origin:center;
      ">
        <div style="
          position:relative;
          width:30px;
          height:30px;
          display:flex;
          align-items:center;
          justify-content:center;
        ">
          <div style="
            position:absolute;
            inset:2px;
            border-radius:9999px;
            background:rgba(14,165,233,0.08);
            border:2px solid rgba(255,255,255,0.92);
            box-shadow:0 0 0 4px rgba(14,165,233,0.14);
          "></div>
          ${getOwnshipInnerMarkup(style)}
        </div>
      </div>
    `;

const createOwnshipIcon = (headingTrue?: number | null, style: OwnshipIconStyle = 'triangle') =>
  L.divIcon({
    className: '',
    html: getOwnshipIconMarkup(headingTrue, style),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

interface AeronauticalMapProps {
  legs: NavlogLeg[];
  onAddWaypoint: (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => void;
  onMoveWaypoint?: (legId: string, lat: number, lon: number) => void;
  hazards?: Hazard[];
  onAddHazard?: (lat: number, lng: number) => void;
  isEditing?: boolean;
  isZoomPanelOpen?: boolean;
  onZoomPanelOpenChange?: (open: boolean) => void;
  isLayersPanelOpen?: boolean;
  onLayersPanelOpenChange?: (open: boolean) => void;
  rightAccessory?: ReactNode;
}

const HazardIcon = L.divIcon({
  className: '',
  html: '<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 2px rgba(239,68,68,0.35);color:#fff;font-size:14px;font-weight:900;">!</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

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

type OpenAipFeature = {
  _id: string;
  name: string;
  type?: string;
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
  const size = [length ? `${Math.round(length)} m` : '', width ? `${Math.round(width)} m` : '']
    .filter(Boolean)
    .join(' x ');

  return [designator ? `RWY ${designator}` : '', size].filter(Boolean).join(' • ');
};

const formatAirportRunways = (runways?: OpenAipFeature['runways']) =>
  runways
    ?.filter((runway) => runway.designator || runway.dimension?.length?.value || runway.declaredDistance?.tora?.value)
    .slice(0, 4)
    .map(formatRunwaySummary)
    .filter(Boolean)
    .join(' • ');

const getSearchZoom = (sourceLayer: OpenAipFeature['sourceLayer']) => {
  if (sourceLayer === 'airports') return 13;
  if (sourceLayer === 'navaids') return 14;
  return 13; // reporting-points
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  geometry?: {
    type?: 'Point';
    coordinates?: [number, number];
  };
  height?: { value?: number };
  elevation?: { value?: number };
};

type FlightPlannerMapSettings = {
  id?: string;
  baseLayer?: 'light' | 'satellite';
  showLabels?: boolean;
  showMasterChart?: boolean;
  showAirports?: boolean;
  showNavaids?: boolean;
  showReportingPoints?: boolean;
  showAirspaces?: boolean;
  showClassE?: boolean;
  showClassF?: boolean;
  showClassG?: boolean;
  showObstacles?: boolean;
  showMilitaryAreas?: boolean;
  showTrainingAreas?: boolean;
  showGlidingSectors?: boolean;
  showHangGlidings?: boolean;
  showOnlyActiveAirspace?: boolean;
};

type OwnshipIconStyle = 'triangle' | 'aircraft' | 'dot-line';

const FLIGHT_PLANNER_MAP_SETTINGS_KEY = 'safeviate.flight-planner-map-settings';
const DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS: Required<Omit<FlightPlannerMapSettings, 'id'>> = {
  baseLayer: 'light',
  showLabels: true,
  showMasterChart: true,
  showAirports: true,
  showNavaids: true,
  showReportingPoints: true,
  showAirspaces: true,
  showClassE: true,
  showClassF: true,
  showClassG: true,
  showObstacles: false,
  showMilitaryAreas: true,
  showTrainingAreas: true,
  showGlidingSectors: true,
  showHangGlidings: true,
  showOnlyActiveAirspace: false,
};

const readStoredFlightPlannerMapSettings = (): FlightPlannerMapSettings => {
  if (typeof window === 'undefined') {
    return { id: 'flight-planner-map', ...DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS };
  }

  const stored = window.localStorage.getItem(FLIGHT_PLANNER_MAP_SETTINGS_KEY);
  if (!stored) {
    return { id: 'flight-planner-map', ...DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS };
  }

  try {
    const parsed = JSON.parse(stored) as Partial<FlightPlannerMapSettings>;
    return {
      id: 'flight-planner-map',
      ...DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.error('Failed to parse map settings', error);
    return { id: 'flight-planner-map', ...DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS };
  }
};

const OPENAIP_POINT_RESOURCES = ['airports', 'navaids', 'reporting-points'] as const;

const AIRSPACE_CLASS_E = 6;
const AIRSPACE_CLASS_F = 7;
const AIRSPACE_CLASS_G = 8;

const mergeOpenAipFeatures = (current: OpenAipFeature[], next: OpenAipFeature[]) => {
  const merged = [...current];
  for (const item of next) {
    if (!merged.some((existing) => existing._id === item._id)) {
      merged.push(item);
    }
  }
  return merged;
};

const LONG_PRESS_MS = 550;
const CLICK_MOVE_TOLERANCE_METERS = 20;

function MapEvents({
  onShortPress,
  onLongPress,
}: {
  onShortPress: (lat: number, lon: number) => void;
  onLongPress: (lat: number, lon: number) => void;
}) {
  const map = useMap();
  const pressRef = useRef<{
    latlng: L.LatLng;
    timer: number | null;
    longTriggered: boolean;
  } | null>(null);

  const clearPress = useCallback(() => {
    const currentPress = pressRef.current;
    if (!currentPress) {
      pressRef.current = null;
      return;
    }
    if (currentPress.timer !== null) {
      window.clearTimeout(currentPress.timer);
    }
    pressRef.current = null;
  }, []);

  const startPress = useCallback((latlng: L.LatLng) => {
    clearPress();
    pressRef.current = {
      latlng,
      longTriggered: false,
      timer: window.setTimeout(() => {
        const currentPress = pressRef.current;
        if (!currentPress) return;
        currentPress.longTriggered = true;
        onLongPress(currentPress.latlng.lat, currentPress.latlng.lng);
      }, LONG_PRESS_MS),
    };
  }, [clearPress, onLongPress]);

  const endPress = useCallback((endLatlng: L.LatLng) => {
    const press = pressRef.current;
    if (!press) return;
    if (press.timer !== null) {
      window.clearTimeout(press.timer);
    }

    const movedMeters = map.distance(press.latlng, endLatlng);
    const wasLongPress = press.longTriggered;
    const lat = press.latlng.lat;
    const lon = press.latlng.lng;
    pressRef.current = null;

    if (!wasLongPress && movedMeters <= CLICK_MOVE_TOLERANCE_METERS) {
      onShortPress(lat, lon);
    }
  }, [map, onShortPress]);

  // Mouse events via Leaflet's useMapEvents
  useMapEvents({
    mousedown(e) {
      if ((e.originalEvent as MouseEvent).button !== 0) return;
      startPress(e.latlng);
    },
    mouseup(e) {
      endPress(e.latlng);
    },
    dragstart: clearPress,
    contextmenu: clearPress,
  });

  // Touch events via native DOM listeners (Leaflet doesn't forward touch events reliably)
  useEffect(() => {
    const container = map.getContainer();

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { clearPress(); return; }
      const touch = e.touches[0];
      const latlng = map.containerPointToLatLng(L.point(touch.clientX - container.getBoundingClientRect().left, touch.clientY - container.getBoundingClientRect().top));
      startPress(latlng);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pressRef.current || e.touches.length !== 1) { clearPress(); return; }
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const moveLatlng = map.containerPointToLatLng(L.point(touch.clientX - rect.left, touch.clientY - rect.top));
      const movedMeters = map.distance(pressRef.current.latlng, moveLatlng);
      if (movedMeters > CLICK_MOVE_TOLERANCE_METERS) {
        clearPress();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const press = pressRef.current;
      if (!press) return;
      // Use the original press position for the end (changedTouches may not give a reliable final position)
      endPress(press.latlng);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', clearPress, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', clearPress);
    };
  }, [map, startPress, endPress, clearPress]);

  useEffect(() => clearPress, [clearPress]);

  return null;
}

function VisiblePointLoader({
  airportsEnabled,
  navaidsEnabled,
  reportingEnabled,
  onFeaturesLoaded,
}: {
  airportsEnabled: boolean;
  navaidsEnabled: boolean;
  reportingEnabled: boolean;
  onFeaturesLoaded: (features: OpenAipFeature[]) => void;
}) {
  const map = useMap();
  const requestSeq = useRef(0);
  const lastRequestKeyRef = useRef('');

  const activeResources = useMemo(() => {
    const resources: Array<typeof OPENAIP_POINT_RESOURCES[number]> = [];
    if (airportsEnabled) resources.push('airports');
    if (navaidsEnabled) resources.push('navaids');
    if (reportingEnabled) resources.push('reporting-points');
    return resources;
  }, [airportsEnabled, navaidsEnabled, reportingEnabled]);

  const loadVisiblePoints = useCallback(async () => {
    if (activeResources.length === 0) return;

    const bounds = map.getBounds().pad(0.25);
    const bbox = [
      bounds.getWest().toFixed(6),
      bounds.getSouth().toFixed(6),
      bounds.getEast().toFixed(6),
      bounds.getNorth().toFixed(6),
    ].join(',');
    const requestKey = `${activeResources.join(',')}|${bbox}`;
    if (lastRequestKeyRef.current === requestKey) return;
    lastRequestKeyRef.current = requestKey;
    const nextSeq = ++requestSeq.current;

    try {
      const responses = await Promise.all(
        activeResources.map(async (resource) => {
          const data =
            (await fetchOpenAipJson<{ items?: unknown[] }>(`/api/openaip?resource=${resource}&bbox=${bbox}`)) ?? { items: [] };
          return { resource, data };
        })
      );

      if (nextSeq !== requestSeq.current) return;

      const combined = responses.flatMap(({ resource, data }) =>
        (data.items || []).map((item: any) => ({ ...item, sourceLayer: resource }))
      );
      onFeaturesLoaded(combined);
    } catch (error) {
      console.error('Viewport OpenAIP load failed', error);
    }
  }, [map, onFeaturesLoaded, activeResources]);

  useEffect(() => {
    loadVisiblePoints();
  }, [loadVisiblePoints]);

  useMapEvents({
    moveend: loadVisiblePoints,
    zoomend: loadVisiblePoints,
  });

  return null;
}

function MapZoomState({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  return null;
}

function MapZoomLimits({
  minZoom,
  maxZoom,
}: {
  minZoom: number;
  maxZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);

    const currentZoom = map.getZoom();
    if (currentZoom < minZoom) {
      map.setZoom(minZoom);
      return;
    }
    if (currentZoom > maxZoom) {
      map.setZoom(maxZoom);
    }
  }, [map, minZoom, maxZoom]);

  return null;
}

function MapDragLock({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (enabled) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }

    return () => {
      map.dragging.enable();
    };
  }, [enabled, map]);

  return null;
}

function VisibleAirspaceLoader({
  enabled,
  onFeaturesLoaded,
}: {
  enabled: boolean;
  onFeaturesLoaded: (features: OpenAipAirspace[]) => void;
}) {
  const map = useMap();
  const requestSeq = useRef(0);
  const lastRequestKeyRef = useRef('');

  const loadVisibleAirspaces = useCallback(async () => {
    if (!enabled) return;

    const bounds = map.getBounds().pad(0.25);
    const bbox = [
      bounds.getWest().toFixed(6),
      bounds.getSouth().toFixed(6),
      bounds.getEast().toFixed(6),
      bounds.getNorth().toFixed(6),
    ].join(',');
    if (lastRequestKeyRef.current === bbox) return;
    lastRequestKeyRef.current = bbox;
    const nextSeq = ++requestSeq.current;

    try {
      const data =
        (await fetchOpenAipJson<{ items?: unknown[] }>(`/api/openaip?resource=airspaces&bbox=${bbox}`)) ?? { items: [] };
      if (nextSeq !== requestSeq.current) return;
      onFeaturesLoaded((data.items || []) as OpenAipAirspace[]);
    } catch (error) {
      console.error('Viewport OpenAIP airspace load failed', error);
    }
  }, [enabled, map, onFeaturesLoaded]);

  useEffect(() => {
    loadVisibleAirspaces();
  }, [loadVisibleAirspaces]);

  useMapEvents({
    moveend: loadVisibleAirspaces,
    zoomend: loadVisibleAirspaces,
  });

  return null;
}

function VisibleObstacleLoader({
  enabled,
  onFeaturesLoaded,
}: {
  enabled: boolean;
  onFeaturesLoaded: (features: OpenAipObstacle[]) => void;
}) {
  const map = useMap();
  const requestSeq = useRef(0);
  const lastRequestKeyRef = useRef('');

  const loadVisibleObstacles = useCallback(async () => {
    if (!enabled) return;

    const bounds = map.getBounds().pad(0.35);
    const bbox = [
      bounds.getWest().toFixed(6),
      bounds.getSouth().toFixed(6),
      bounds.getEast().toFixed(6),
      bounds.getNorth().toFixed(6),
    ].join(',');
    if (lastRequestKeyRef.current === bbox) return;
    lastRequestKeyRef.current = bbox;
    const nextSeq = ++requestSeq.current;

    try {
      const data =
        (await fetchOpenAipJson<{ items?: unknown[] }>(`/api/openaip?resource=obstacles&bbox=${bbox}`)) ?? { items: [] };
      if (nextSeq !== requestSeq.current) return;
      onFeaturesLoaded((data.items || []) as OpenAipObstacle[]);
    } catch (error) {
      console.error('Viewport OpenAIP obstacle load failed', error);
    }
  }, [enabled, map, onFeaturesLoaded]);

  useEffect(() => {
    loadVisibleObstacles();
  }, [loadVisibleObstacles]);

  useMapEvents({
    moveend: loadVisibleObstacles,
    zoomend: loadVisibleObstacles,
  });

  return null;
}

function LayerStateSync({
  onBaseLayerChange,
  onOverlayChange,
}: {
  onBaseLayerChange: (name: 'light' | 'satellite') => void;
  onOverlayChange: (name: string, active: boolean) => void;
}) {
  useMapEvents({
    overlayadd(event: any) {
      onOverlayChange(event.name, true);
    },
    overlayremove(event: any) {
      onOverlayChange(event.name, false);
    },
    baselayerchange(event: any) {
      onBaseLayerChange(event.name === 'Satellite (Hybrid)' ? 'satellite' : 'light');
    },
  });

  return null;
}

const CLICK_SNAP_THRESHOLD_NM = 8;
const AVAILABLE_ZOOM_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceNm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const earthRadiusNm = 3440.065;
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusNm * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
};

const pointInRing = (lat: number, lon: number, ring: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const pointInPolygonGeometry = (
  lat: number,
  lon: number,
  geometry?: OpenAipAirspace['geometry']
) => {
  if (!geometry?.coordinates) return false;
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as [number, number][][];
    if (!rings.length) return false;
    if (!pointInRing(lat, lon, rings[0])) return false;
    return !rings.slice(1).some((hole) => pointInRing(lat, lon, hole));
  }
  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates as [number, number][][][];
    return polygons.some((polygon) => {
      if (!polygon.length) return false;
      if (!pointInRing(lat, lon, polygon[0])) return false;
      return !polygon.slice(1).some((hole) => pointInRing(lat, lon, hole));
    });
  }
  return false;
};

const getAirspaceDisplayLabel = (airspace: OpenAipAirspace) => {
  const category = getAirspaceCategory(airspace);
  if (category === 'ctr') return 'Control Zone (CTR)';
  if (category === 'military') return 'Military Operations Area';
  if (category === 'training') return 'Training Area';
  if (category === 'gliding') return 'Gliding Sector';
  if (category === 'hang') return 'Hang Gliding Site';
  if (category === 'class-e') return 'Airspace Class E';
  if (category === 'class-f') return 'Airspace Class F';
  if (category === 'class-g') return 'Airspace Class G';
  return 'OpenAIP Airspace';
};

const formatLimitValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return `${value}`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidates = [
      record.value,
      record.altitude,
      record.height,
      record.limit,
      record.text,
      record.unit,
      record.reference,
    ];
    const parts: string[] = candidates
      .map((candidate) => formatLimitValue(candidate))
      .filter(Boolean);
    return parts.join(' ');
  }
  return '';
};

const formatAirspaceVerticalLimits = (airspace: OpenAipAirspace): string => {
  const rawVertical = airspace.verticalLimits as Record<string, unknown> | undefined;
  const lower =
    formatLimitValue(rawVertical?.lower ?? rawVertical?.lowerLimit ?? rawVertical?.floor ?? airspace.lowerLimit ?? airspace.floor);
  const upper =
    formatLimitValue(rawVertical?.upper ?? rawVertical?.upperLimit ?? rawVertical?.ceiling ?? airspace.upperLimit ?? airspace.ceiling);
  const fallback =
    formatLimitValue(airspace.limits) ||
    formatLimitValue(rawVertical?.text) ||
    formatLimitValue(rawVertical?.display) ||
    '';

  const rangeParts = [lower && `Lower ${lower}`, upper && `Upper ${upper}`].filter(Boolean) as string[];
  if (rangeParts.length > 0) return rangeParts.join(' • ');
  return fallback;
};

const isAirspaceActiveNow = (airspace: OpenAipAirspace) => {
  const operatingHours = airspace.hoursOfOperation?.operatingHours;
  if (!operatingHours || operatingHours.length === 0) return true;

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return operatingHours.some((entry) => {
    if (entry.dayOfWeek !== undefined && entry.dayOfWeek !== currentDay) return false;
    if (!entry.startTime || !entry.endTime) return true;
    if (entry.startTime === '00:00' && entry.endTime === '00:00') return true;

    const [startHour, startMinute] = entry.startTime.split(':').map(Number);
    const [endHour, endMinute] = entry.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  });
};

const isMilitaryAirspace = (airspace: OpenAipAirspace) =>
  airspace.type === 1 ||
  airspace.type === 33 ||
  /MILITARY|SHOOTING|WEAPONS|RANGE|MOA|M\.O\.A|OPERATIONS AREA/i.test(airspace.name);

const isTrainingAirspace = (airspace: OpenAipAirspace) =>
  airspace.type === 2 ||
  /TRAINING|GENERAL FLYING|FLYING TNG|PJE/i.test(airspace.name);

const isGlidingAirspace = (airspace: OpenAipAirspace) =>
  airspace.type === 21 || /GLIDING|GLIDER/i.test(airspace.name);

const isHangGlidingAirspace = (airspace: OpenAipAirspace) =>
  /HANG\s*GLIDING|HANGGLIDING|HANG/i.test(airspace.name);

const isControlledAirspace = (airspace: OpenAipAirspace) =>
  /CTR|CONTROL\s*ZONE|CONTROLLED\s*TOR(E|W)R\s*REGION|CONTROL\s*TOR(E|W)R\s*REGION/i.test(airspace.name) ||
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
  const classCategory = getAirspaceClassCategory(airspace);
  if (classCategory !== 'other') return classCategory;
  return 'other';
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
          type: item.type,
          icaoClass: item.icaoClass,
          category: getAirspaceCategory(item),
          classCategory: getAirspaceClassCategory(item),
          active: isAirspaceActiveNow(item),
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

const stopPropagation = (event: React.SyntheticEvent) => {
  event.stopPropagation();
};

const blockMapInteraction = (event: React.SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const SearchControl = ({
  onAddWaypoint,
  onResultsChange,
}: {
  onAddWaypoint: (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => void;
  onResultsChange: (results: OpenAipFeature[]) => void;
}) => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenAipFeature[]>([]);
  const [selected, setSelected] = useState<OpenAipFeature | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const onResultsChangeRef = useRef(onResultsChange);

  useEffect(() => {
    onResultsChangeRef.current = onResultsChange;
  }, [onResultsChange]);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      onResultsChangeRef.current([]);
      return;
    }

    const resources = ['airports', 'navaids', 'reporting-points'] as const;
    try {
      const searchPromises = resources.map(resource =>
        // Use basic search parameter directly as used previously successfully by the component.
        fetchOpenAipJson(`/api/openaip?resource=${resource}&search=${encodeURIComponent(searchQuery)}`)
          .then((data) => data ?? [])
          .catch(() => [])
      );
      
      const searchResults = await Promise.all(searchPromises);
      const combinedResults = searchResults.flatMap((result, index) => {
        const sourceLayer = resources[index];
        const payload = result as { items?: unknown[]; data?: unknown[] } | unknown[];
        const items = Array.isArray(payload) ? payload : (payload.items || payload.data || []);
        return items.map((item: any) => ({ ...item, sourceLayer }));
      });
      
      setResults(combinedResults);
      onResultsChangeRef.current(combinedResults);
    } catch (error) {
      console.error('Search failed', error);
    }
  }, []);

  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery, handleSearch]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQuery('');
        setResults([]);
        onResultsChangeRef.current([]);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSelect = (item: OpenAipFeature) => {
    // Extract coordinates robustly — OpenAIP may return nested geometry
    const coords = item.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lon, lat] = coords;
    if (!isFinite(lat) || !isFinite(lon)) return;

    setSelected({ ...item, geometry: { coordinates: [lon, lat] } });
    
    // Jump to result
    map.flyTo([lat, lon], getSearchZoom(item.sourceLayer), {
      animate: true,
      duration: 1.5,
    });
    
    setResults([]);
    setQuery('');
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm pointer-events-auto"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Airport, Navaid, or Point..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setQuery('');
              setResults([]);
              onResultsChangeRef.current([]);
            } else if (event.key === 'Enter' && results[0]) {
              event.preventDefault();
              handleSelect(results[0]);
            }
          }}
          className="pl-9 pr-9 h-10 shadow-lg"
        />
        {query && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setQuery('');
              setResults([]);
              onResultsChangeRef.current([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-background rounded-lg shadow-lg mt-2 border">
          <ScrollArea className="h-[200px]">
            {results.map(item => (
              <div
                key={item._id}
                onClick={() => handleSelect(item)}
                onMouseDown={blockMapInteraction}
                onPointerDown={blockMapInteraction}
                onTouchStart={blockMapInteraction}
                className="p-3 border-b text-sm hover:bg-muted cursor-pointer"
              >
                <p className="font-bold">{item.name} ({item.icaoCode || item.identifier})</p>
                <p className="text-xs text-muted-foreground">{item.sourceLayer}</p>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}

      {selected && selected.geometry?.coordinates && (
        <Popup
          position={[selected.geometry.coordinates[1], selected.geometry.coordinates[0]]}
          eventHandlers={{
            remove: () => {
              // Fired when Leaflet's native × button closes the popup
              setSelected(null);
              onResultsChangeRef.current([]);
            },
          }}
        >
          <div className="text-sm space-y-2 w-48">
            <p className="font-bold text-base">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.sourceLayer}</p>
            {selected.frequencies?.length ? (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Radio Frequencies</p>
                <div className="space-y-1">
                  {selected.frequencies
                    .filter((frequency) => frequency.publicUse !== false)
                    .slice(0, 4)
                    .map((frequency, index) => {
                      const label = formatFrequencyLabel(frequency);
                      if (!label) return null;
                      return (
                        <div key={`${selected._id}-freq-${index}`} className="rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-semibold">
                          {label}
                          {frequency.primary ? ' • primary' : ''}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : null}
            {selected.sourceLayer === 'airports' && selected.runways?.length ? (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Runways</p>
                <div className="space-y-1">
                  {selected.runways
                    .filter((runway) => runway.designator || runway.dimension?.length?.value || runway.declaredDistance?.tora?.value)
                    .slice(0, 4)
                    .map((runway, index) => {
                      const label = formatRunwaySummary(runway);
                      if (!label) return null;
                      return (
                        <div key={`${selected._id}-rwy-${index}`} className="rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-semibold">
                          {label}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : null}
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="w-full" onMouseDown={blockMapInteraction} onPointerDown={blockMapInteraction} onTouchStart={blockMapInteraction} onClick={(event) => {
                blockMapInteraction(event);
                const [lon, lat] = selected.geometry!.coordinates!;
                onAddWaypoint(
                  lat,
                  lon,
                  selected.icaoCode || selected.identifier || selected.name,
                  formatWaypointFrequencies(selected.frequencies),
                  selected.sourceLayer === 'airports'
                    ? 'OpenAIP Airports'
                    : selected.sourceLayer === 'navaids'
                      ? 'OpenAIP Navaids'
                      : 'OpenAIP Reporting Points'
                );
                setSelected(null);
                onResultsChangeRef.current([]);
              }}>
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
              <Button size="sm" variant="ghost" className="w-full" onMouseDown={blockMapInteraction} onPointerDown={blockMapInteraction} onTouchStart={blockMapInteraction} onClick={(event) => {
                blockMapInteraction(event);
                setSelected(null);
                onResultsChangeRef.current([]);
              }}>
                <X className="h-4 w-4 mr-2" /> Close
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default function AeronauticalMap({
  legs,
  onAddWaypoint,
  onMoveWaypoint,
  hazards = [],
  onAddHazard,
  isEditing = false,
  isZoomPanelOpen = false,
  onZoomPanelOpenChange,
  isLayersPanelOpen = false,
  onLayersPanelOpenChange,
}: AeronauticalMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [layerPanelTab, setLayerPanelTab] = useState<'layers' | 'labels'>('layers');
  const [searchFeatures, setSearchFeatures] = useState<OpenAipFeature[]>([]);
  const [viewportFeatures, setViewportFeatures] = useState<OpenAipFeature[]>([]);
  const [airspaceFeatures, setAirspaceFeatures] = useState<OpenAipAirspace[]>([]);
  const [obstacleFeatures, setObstacleFeatures] = useState<OpenAipObstacle[]>([]);
  const [mapZoom, setMapZoom] = useState(8);
  const [masterVisible, setMasterVisible] = useState(() => readStoredFlightPlannerMapSettings().showMasterChart ?? true);
  const [labelsVisible, setLabelsVisible] = useState(() => readStoredFlightPlannerMapSettings().showLabels ?? true);
  const [airportsVisible, setAirportsVisible] = useState(() => readStoredFlightPlannerMapSettings().showAirports ?? true);
  const [navaidsVisible, setNavaidsVisible] = useState(() => readStoredFlightPlannerMapSettings().showNavaids ?? true);
  const [reportingVisible, setReportingVisible] = useState(() => readStoredFlightPlannerMapSettings().showReportingPoints ?? true);
  const [airspacesVisible, setAirspacesVisible] = useState(() => readStoredFlightPlannerMapSettings().showAirspaces ?? true);
  const [classEVisible, setClassEVisible] = useState(() => readStoredFlightPlannerMapSettings().showClassE ?? true);
  const [classFVisible, setClassFVisible] = useState(() => readStoredFlightPlannerMapSettings().showClassF ?? true);
  const [classGVisible, setClassGVisible] = useState(() => readStoredFlightPlannerMapSettings().showClassG ?? true);
  const [obstaclesVisible, setObstaclesVisible] = useState(() => readStoredFlightPlannerMapSettings().showObstacles ?? false);
  const [militaryAreasVisible, setMilitaryAreasVisible] = useState(() => readStoredFlightPlannerMapSettings().showMilitaryAreas ?? true);
  const [trainingAreasVisible, setTrainingAreasVisible] = useState(() => readStoredFlightPlannerMapSettings().showTrainingAreas ?? true);
  const [glidingSectorsVisible, setGlidingSectorsVisible] = useState(() => readStoredFlightPlannerMapSettings().showGlidingSectors ?? true);
  const [hangGlidingVisible, setHangGlidingVisible] = useState(() => readStoredFlightPlannerMapSettings().showHangGlidings ?? true);
  const [onlyActiveAirspace, setOnlyActiveAirspace] = useState(() => readStoredFlightPlannerMapSettings().showOnlyActiveAirspace ?? false);
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<'light' | 'satellite'>(() => readStoredFlightPlannerMapSettings().baseLayer ?? 'light');
  const [pendingClickLabel, setPendingClickLabel] = useState<string | null>(null);
  const [layerInfo, setLayerInfo] = useState<LayerInfoState | null>(null);
  const lastPersistedSettingsRef = useRef<string>('');
  const [minVisibleZoom, setMinVisibleZoom] = useState(4);
  const [maxVisibleZoom, setMaxVisibleZoom] = useState(16);
  const [draggingWaypointId, setDraggingWaypointId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isLayersPanelOpen) {
      setLayerPanelTab('layers');
    }
  }, [isLayersPanelOpen]);

  const openAipFeatures = useMemo(() => mergeOpenAipFeatures(viewportFeatures, searchFeatures), [searchFeatures, viewportFeatures]);
  const airportFeatures = useMemo(
    () => viewportFeatures.filter((item) => item.sourceLayer === 'airports' && item.geometry?.coordinates),
    [viewportFeatures]
  );
  const navaidFeatures = useMemo(
    () => viewportFeatures.filter((item) => item.sourceLayer === 'navaids' && item.geometry?.coordinates),
    [viewportFeatures]
  );
  const reportingPointFeatures = useMemo(
    () => viewportFeatures.filter((item) => item.sourceLayer === 'reporting-points' && item.geometry?.coordinates),
    [viewportFeatures]
  );
  const airspaceCollections = useMemo(() => {
    const filterItems = (predicate: (item: OpenAipAirspace) => boolean) =>
      airspaceFeatureCollection(
        airspaceFeatures.filter((item) => item.geometry?.coordinates && (!onlyActiveAirspace || isAirspaceActiveNow(item)) && predicate(item))
      );

    return {
      classE: filterItems((item) => getAirspaceClassCategory(item) === 'class-e'),
      classF: filterItems((item) => getAirspaceClassCategory(item) === 'class-f'),
      classG: filterItems((item) => getAirspaceClassCategory(item) === 'class-g'),
      military: filterItems((item) => isMilitaryAirspace(item)),
      training: filterItems((item) => isTrainingAirspace(item)),
      gliding: filterItems((item) => isGlidingAirspace(item)),
      hangGliding: filterItems((item) => isHangGlidingAirspace(item)),
      general: filterItems((item) => {
        const category = getAirspaceCategory(item);
        return category === 'other';
      }),
    };
  }, [airspaceFeatures, onlyActiveAirspace]);
  const obstacleGeoJson = useMemo(() => obstacleFeatureCollection(obstacleFeatures), [obstacleFeatures]);
  const activeLayerLabels = useMemo(() => {
    const layers: string[] = [selectedBaseLayer === 'light' ? 'Light (Standard)' : 'Satellite (Hybrid)'];
    if (masterVisible) layers.push('OpenAIP Master Chart');
    if (airportsVisible) layers.push('OpenAIP Airports');
    if (navaidsVisible) layers.push('OpenAIP Navaids');
    if (reportingVisible) layers.push('OpenAIP Reporting Points');
    if (airspacesVisible) layers.push('OpenAIP Airspaces');
    if (classEVisible) layers.push('Airspace Class E');
    if (classFVisible) layers.push('Airspace Class F');
    if (classGVisible) layers.push('Airspace Class G');
    if (militaryAreasVisible) layers.push('Military Operations Areas');
    if (trainingAreasVisible) layers.push('Training Areas');
    if (glidingSectorsVisible) layers.push('Gliding Sectors');
    if (hangGlidingVisible) layers.push('Hang Glidings');
    if (obstaclesVisible) layers.push('OpenAIP Obstacles');
    return layers;
  }, [
    airportsVisible,
    airspacesVisible,
    classEVisible,
    classFVisible,
    classGVisible,
    glidingSectorsVisible,
    hangGlidingVisible,
    masterVisible,
    militaryAreasVisible,
    navaidsVisible,
    obstaclesVisible,
    reportingVisible,
    selectedBaseLayer,
    trainingAreasVisible,
  ]);
  const airspaceStyle = useCallback((feature: any) => {
    const category = feature?.properties?.category;
    let palette = { color: '#38bdf8', fillColor: '#38bdf8' };
    if (category === 'ctr') {
      palette = { color: '#dc2626', fillColor: '#fca5a5' };
    } else if (category === 'military') {
      palette = { color: '#ef4444', fillColor: '#ef4444' };
    } else if (category === 'training') {
      palette = { color: '#f59e0b', fillColor: '#f59e0b' };
    } else if (category === 'gliding') {
      palette = { color: '#22c55e', fillColor: '#22c55e' };
    } else if (category === 'hang') {
      palette = { color: '#a855f7', fillColor: '#a855f7' };
    } else if (category === 'class-e') {
      palette = { color: '#3b82f6', fillColor: '#3b82f6' };
    } else if (category === 'class-f') {
      palette = { color: '#f97316', fillColor: '#f97316' };
    } else if (category === 'class-g') {
      palette = { color: '#14b8a6', fillColor: '#14b8a6' };
    }

    return {
      ...palette,
      weight: 2,
      fillOpacity: 0.12,
      opacity: 0.85,
    };
  }, []);
  const featurePointIcon = useCallback((color: string) => L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(15,23,42,0.24);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  }), []);
  const airportPointIcon = useMemo(() => featurePointIcon('#2563eb'), [featurePointIcon]);
  const navaidPointIcon = useMemo(() => featurePointIcon('#7c3aed'), [featurePointIcon]);
  const reportingPointIcon = useMemo(() => featurePointIcon('#d97706'), [featurePointIcon]);
  const labelClassName = 'active-flight-map-label rounded-sm border border-slate-200 bg-white/95 px-[1px] py-0 text-[8px] leading-[1] font-black uppercase tracking-[0.02em] text-slate-900 shadow-sm';
  const airspaceLabelClassName = 'active-flight-map-airspace-label rounded-sm border border-slate-300 bg-white/90 px-[1px] py-0 text-[8px] leading-[1] font-black uppercase tracking-[0.02em] text-slate-900 shadow-sm';
  const obstaclePointToLayer = useCallback((feature: any, latlng: L.LatLngExpression) => {
    const height = feature?.properties?.height;
    return L.circleMarker(latlng, {
      radius: height && Number(height) > 250 ? 5 : 4,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.8,
      weight: 1,
    });
  }, []);
  const stopMarkerPress = useCallback((event: L.LeafletMouseEvent | L.LeafletEvent) => {
    if ('originalEvent' in event && event.originalEvent) {
      L.DomEvent.stop(event.originalEvent as Event);
    }
  }, []);
  const buildWaypointContext = useCallback((info: LayerInfoState) => {
    const primary =
      info.items.find((item) => item.layer === 'OpenAIP Airports') ||
      info.items.find((item) => item.layer === 'OpenAIP Navaids') ||
      info.items.find((item) => item.layer === 'OpenAIP Reporting Points') ||
      info.items.find((item) => item.layer === 'OpenAIP Obstacles') ||
      info.items[0];
    if (!primary) return undefined;
    if (primary.detail) return `${primary.layer} • ${primary.label} • ${primary.detail}`;
    return `${primary.layer} • ${primary.label}`;
  }, []);
  const buildLayerInfo = useCallback((lat: number, lon: number): LayerInfoState => {
    const items: LayerInfoItem[] = [];
    const airspaceMatches = airspaceFeatures
      .filter((item) => {
        if (!item.geometry?.coordinates) return false;
        if (onlyActiveAirspace && !isAirspaceActiveNow(item)) return false;
        const category = getAirspaceCategory(item);
        if (category === 'military') return militaryAreasVisible;
        if (category === 'training') return trainingAreasVisible;
        if (category === 'gliding') return glidingSectorsVisible;
        if (category === 'hang') return hangGlidingVisible;
        if (category === 'class-e') return classEVisible;
        if (category === 'class-f') return classFVisible;
        if (category === 'class-g') return classGVisible;
        return airspacesVisible;
      })
      .filter((item) => pointInPolygonGeometry(lat, lon, item.geometry))
      .map((item) => ({
        feature: item,
        layer: getAirspaceDisplayLabel(item),
      }))
      .sort((a, b) => a.layer.localeCompare(b.layer) || a.feature.name.localeCompare(b.feature.name));

    for (const match of airspaceMatches.slice(0, 4)) {
      const verticalLimits = formatAirspaceVerticalLimits(match.feature);
      items.push({
        label: match.feature.name,
        layer: match.layer,
        detail: [getAirspaceCategory(match.feature), match.feature.icaoClass ? `class ${match.feature.icaoClass}` : '', verticalLimits]
          .filter(Boolean)
          .join(' • '),
      });
    }

    const collectNearest = (
      features: OpenAipFeature[],
      layer: string,
      maxDistanceNm: number,
      limit = 1
    ) => {
      const nearby = features
        .map((feature) => {
          const coords = feature.geometry?.coordinates;
          if (!coords) return null;
          const [featureLon, featureLat] = coords;
          return {
            feature,
            distance: distanceNm(lat, lon, featureLat, featureLon),
          };
        })
        .filter((entry): entry is { feature: OpenAipFeature; distance: number } => Boolean(entry))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
        .filter((entry) => entry.distance <= maxDistanceNm);

      for (const entry of nearby) {
        const label = entry.feature.icaoCode || entry.feature.identifier || entry.feature.name;
        items.push({
          label,
          layer,
          distanceNm: entry.distance,
          frequencies: formatWaypointFrequencies(entry.feature.frequencies),
          detail: layer === 'OpenAIP Airports' ? formatAirportRunways(entry.feature.runways) || undefined : undefined,
        });
      }
    };
    collectNearest(openAipFeatures.filter((item) => item.sourceLayer === 'airports' && airportsVisible), 'OpenAIP Airports', 20);
    collectNearest(openAipFeatures.filter((item) => item.sourceLayer === 'navaids' && navaidsVisible), 'OpenAIP Navaids', 20);
    collectNearest(openAipFeatures.filter((item) => item.sourceLayer === 'reporting-points' && reportingVisible), 'OpenAIP Reporting Points', 20);

    const obstacleNearest = obstacleFeatures
      .map((feature) => {
        const coords = feature.geometry?.coordinates;
        if (!coords) return null;
        const [featureLon, featureLat] = coords;
        return {
          feature,
          distance: distanceNm(lat, lon, featureLat, featureLon),
        };
      })
      .filter((entry): entry is { feature: OpenAipObstacle; distance: number } => Boolean(entry))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 1)
      .find((entry) => entry.distance <= 10);

    if (obstacleNearest) {
      items.push({
        label: obstacleNearest.feature.name || 'Obstacle',
        layer: 'OpenAIP Obstacles',
        detail: obstacleNearest.feature.height?.value ? `Height ${obstacleNearest.feature.height.value} m` : undefined,
        distanceNm: obstacleNearest.distance,
      });
    }

    return {
      lat,
      lon,
      title: items[0]?.label || 'Map Position',
      subtitle: airspaceMatches[0]?.layer || undefined,
      items: items.slice(0, 5),
      activeLayers: activeLayerLabels,
    };
  }, [
    activeLayerLabels,
    airspaceFeatures,
    airportsVisible,
    classEVisible,
    classFVisible,
    classGVisible,
    glidingSectorsVisible,
    hangGlidingVisible,
    militaryAreasVisible,
    navaidsVisible,
    obstacleFeatures,
    openAipFeatures,
    onlyActiveAirspace,
    reportingVisible,
    trainingAreasVisible,
    airspacesVisible,
  ]);
  const handleMapClick = useCallback((lat: number, lon: number) => {
    const candidates = openAipFeatures.filter((item) => {
      if (item.sourceLayer === 'airports') return airportsVisible;
      if (item.sourceLayer === 'navaids') return navaidsVisible;
      if (item.sourceLayer === 'reporting-points') return reportingVisible;
      return false;
    });

    let nearest: OpenAipFeature | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const feature of candidates) {
      const coords = feature.geometry?.coordinates;
      if (!coords) continue;
      const [featureLon, featureLat] = coords;
      const d = distanceNm(lat, lon, featureLat, featureLon);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = feature;
      }
    }

    if (nearest && nearestDistance <= CLICK_SNAP_THRESHOLD_NM) {
      const identifier = nearest.icaoCode || nearest.identifier || nearest.name;
      const frequencies = formatWaypointFrequencies(nearest.frequencies);
      const context = buildWaypointContext(buildLayerInfo(lat, lon));
      setPendingClickLabel(identifier);
      onAddWaypoint(lat, lon, identifier, frequencies, context);
      return;
    }

    const context = buildWaypointContext(buildLayerInfo(lat, lon));
    setPendingClickLabel('PNT');
    onAddWaypoint(lat, lon, 'PNT', undefined, context);
  }, [airportsVisible, buildLayerInfo, buildWaypointContext, navaidsVisible, openAipFeatures, onAddWaypoint, reportingVisible]);

  const handleLongPress = useCallback((lat: number, lon: number) => {
    if (isEditing) return;
    setPendingClickLabel('Layer info');
    setLayerInfo(buildLayerInfo(lat, lon));
  }, [buildLayerInfo, isEditing]);

  useEffect(() => {
    if (isEditing) {
      setLayerInfo(null);
    }
  }, [isEditing]);

  useEffect(() => {
    const nextSettings: FlightPlannerMapSettings = {
      id: 'flight-planner-map',
      baseLayer: selectedBaseLayer,
      showLabels: labelsVisible,
      showMasterChart: masterVisible,
      showAirports: airportsVisible,
      showNavaids: navaidsVisible,
      showReportingPoints: reportingVisible,
      showAirspaces: airspacesVisible,
      showClassE: classEVisible,
      showClassF: classFVisible,
      showClassG: classGVisible,
      showObstacles: obstaclesVisible,
      showMilitaryAreas: militaryAreasVisible,
      showTrainingAreas: trainingAreasVisible,
      showGlidingSectors: glidingSectorsVisible,
      showHangGlidings: hangGlidingVisible,
      showOnlyActiveAirspace: onlyActiveAirspace,
    };
    const serialized = JSON.stringify(nextSettings);
    if (serialized === lastPersistedSettingsRef.current) return;

    lastPersistedSettingsRef.current = serialized;
    localStorage.setItem(FLIGHT_PLANNER_MAP_SETTINGS_KEY, serialized);
  }, [
    airspacesVisible,
    airportsVisible,
    labelsVisible,
    classEVisible,
    classFVisible,
    classGVisible,
    glidingSectorsVisible,
    hangGlidingVisible,
    militaryAreasVisible,
    navaidsVisible,
    obstaclesVisible,
    onlyActiveAirspace,
    reportingVisible,
    masterVisible,
    trainingAreasVisible,
    selectedBaseLayer,
  ]);

  if (!isMounted) return null;

  const polylinePositions = legs
    .filter(leg => leg.latitude !== undefined && leg.longitude !== undefined)
    .map(leg => [leg.latitude!, leg.longitude!] as [number, number]);

  const center: [number, number] = legs.length > 0
    ? [legs[legs.length - 1].latitude!, legs[legs.length - 1].longitude!]
    : [-25.9, 27.9];

  return (
    <div className="relative h-full w-full">
    <LeafletMapFrame
      center={center}
      zoom={8}
      minZoom={minVisibleZoom}
      maxZoom={maxVisibleZoom}
      preferCanvas
      className="h-full w-full outline-none"
      style={{ background: '#0f172a' }}
    >
      <LayersControl position="topleft" collapsed>
        <LayersControl.BaseLayer checked={selectedBaseLayer === 'light'} name="Light (Standard)">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked={selectedBaseLayer === 'satellite'} name="Satellite (Hybrid)">
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution="&copy; MapLibre / OpenStreetMap"
          />
        </LayersControl.BaseLayer>

        <LayersControl.Overlay checked={masterVisible} name="OpenAIP Master Chart">
          <TileLayer
            url="/api/openaip/tiles/openaip/{z}/{x}/{y}"
            attribution="&copy; OpenAIP"
            opacity={1}
            minZoom={8}
            minNativeZoom={8}
            maxNativeZoom={16}
            maxZoom={20}
          />
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={airportsVisible} name="OpenAIP Airports">
          <FeatureGroup>
            {mapZoom >= 8 && airportFeatures.map((feature) => {
              const coords = feature.geometry?.coordinates;
              if (!coords) return null;
              const [lon, lat] = coords;
              const identifier = feature.icaoCode || feature.identifier || feature.name;
              return (
                <Marker
                  key={feature._id}
                  position={[lat, lon]}
                  icon={airportPointIcon}
                  eventHandlers={{
                    mousedown: stopMarkerPress,
                    click: (event) => {
                      L.DomEvent.stop(event.originalEvent);
                      setPendingClickLabel(identifier);
                      onAddWaypoint(
                        lat,
                        lon,
                        identifier,
                        formatWaypointFrequencies(feature.frequencies),
                        buildWaypointContext(buildLayerInfo(lat, lon))
                      );
                    },
                  }}
                >
                  {labelsVisible && mapZoom >= 9 && (
                    <Tooltip
                      permanent
                      direction="top"
                      offset={[0, -6]}
                      opacity={0.95}
                      className={labelClassName}
                    >
                      {identifier}
                    </Tooltip>
                  )}
                </Marker>
              );
            })}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={navaidsVisible} name="OpenAIP Navaids">
          <FeatureGroup>
            {mapZoom >= 9 && navaidFeatures.map((feature) => {
              const coords = feature.geometry?.coordinates;
              if (!coords) return null;
              const [lon, lat] = coords;
              const identifier = feature.icaoCode || feature.identifier || feature.name;
              return (
                <Marker
                  key={feature._id}
                  position={[lat, lon]}
                  icon={navaidPointIcon}
                  eventHandlers={{
                    mousedown: stopMarkerPress,
                    click: (event) => {
                      L.DomEvent.stop(event.originalEvent);
                      setPendingClickLabel(identifier);
                      onAddWaypoint(
                        lat,
                        lon,
                        identifier,
                        formatWaypointFrequencies(feature.frequencies),
                        buildWaypointContext(buildLayerInfo(lat, lon))
                      );
                    },
                  }}
                >
                  {labelsVisible && mapZoom >= 10 && (
                    <Tooltip
                      permanent
                      direction="top"
                      offset={[0, -6]}
                      opacity={0.95}
                      className={labelClassName}
                    >
                      {identifier}
                    </Tooltip>
                  )}
                </Marker>
              );
            })}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={reportingVisible} name="OpenAIP Reporting Points">
          <FeatureGroup>
            {mapZoom >= 10 && reportingPointFeatures.map((feature) => {
              const coords = feature.geometry?.coordinates;
              if (!coords) return null;
              const [lon, lat] = coords;
              const identifier = feature.icaoCode || feature.identifier || feature.name;
              return (
                <Marker
                  key={feature._id}
                  position={[lat, lon]}
                  icon={reportingPointIcon}
                  eventHandlers={{
                    mousedown: stopMarkerPress,
                    click: (event) => {
                      L.DomEvent.stop(event.originalEvent);
                      setPendingClickLabel(identifier);
                      onAddWaypoint(
                        lat,
                        lon,
                        identifier,
                        formatWaypointFrequencies(feature.frequencies),
                        buildWaypointContext(buildLayerInfo(lat, lon))
                      );
                    },
                  }}
                >
                  {labelsVisible && mapZoom >= 11 && (
                    <Tooltip
                      permanent
                      direction="top"
                      offset={[0, -6]}
                      opacity={0.95}
                      className={labelClassName}
                    >
                      {identifier}
                    </Tooltip>
                  )}
                </Marker>
              );
            })}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={classEVisible} name="Class E">
          <FeatureGroup>
            {airspaceCollections.classE.features.length > 0 && (
                <GeoJSON
                  key={`airspace-class-e-${airspaceCollections.classE.features.length}-${onlyActiveAirspace}`}
                  data={airspaceCollections.classE as any}
                  style={airspaceStyle as any}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as any;
                    const limits = props?.limits as string | undefined;
                    layer.bindTooltip(
                      limits ? `${props?.name || 'Airspace'} • ${limits}` : `${props?.name || 'Airspace'}`,
                      { permanent: labelsVisible && mapZoom >= 8, direction: 'center', className: airspaceLabelClassName, opacity: 0.9 }
                    );
                    layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Airspace'}</div>`);
                  }}
                />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={classFVisible} name="Class F">
          <FeatureGroup>
            {airspaceCollections.classF.features.length > 0 && (
                <GeoJSON
                  key={`airspace-class-f-${airspaceCollections.classF.features.length}-${onlyActiveAirspace}`}
                  data={airspaceCollections.classF as any}
                  style={airspaceStyle as any}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as any;
                    const limits = props?.limits as string | undefined;
                    layer.bindTooltip(
                      limits ? `${props?.name || 'Airspace'} • ${limits}` : `${props?.name || 'Airspace'}`,
                      { permanent: labelsVisible && mapZoom >= 8, direction: 'center', className: airspaceLabelClassName, opacity: 0.9 }
                    );
                    layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Airspace'}</div>`);
                  }}
                />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={classGVisible} name="Class G">
          <FeatureGroup>
            {airspaceCollections.classG.features.length > 0 && (
                <GeoJSON
                  key={`airspace-class-g-${airspaceCollections.classG.features.length}-${onlyActiveAirspace}`}
                  data={airspaceCollections.classG as any}
                  style={airspaceStyle as any}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as any;
                    const limits = props?.limits as string | undefined;
                    layer.bindTooltip(
                      limits ? `${props?.name || 'Airspace'} • ${limits}` : `${props?.name || 'Airspace'}`,
                      { permanent: labelsVisible && mapZoom >= 8, direction: 'center', className: airspaceLabelClassName, opacity: 0.9 }
                    );
                    layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Airspace'}</div>`);
                  }}
                />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={militaryAreasVisible} name="Military Operations Areas">
          <FeatureGroup>
            {airspaceCollections.military.features.length > 0 && (
                <GeoJSON
                  key={`airspace-military-${airspaceCollections.military.features.length}-${onlyActiveAirspace}`}
                  data={airspaceCollections.military as any}
                  style={airspaceStyle as any}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as any;
                    const limits = props?.limits as string | undefined;
                    layer.bindTooltip(
                      limits ? `${props?.name || 'Airspace'} • ${limits}` : `${props?.name || 'Airspace'}`,
                      { permanent: labelsVisible && mapZoom >= 9, direction: 'center', className: airspaceLabelClassName, opacity: 0.9 }
                    );
                    layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Airspace'}</div>`);
                  }}
                />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={trainingAreasVisible} name="Training Areas">
          <FeatureGroup>
            {airspaceCollections.training.features.length > 0 && (
                <GeoJSON
                  key={`airspace-training-${airspaceCollections.training.features.length}-${onlyActiveAirspace}`}
                  data={airspaceCollections.training as any}
                  style={airspaceStyle as any}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as any;
                    const limits = props?.limits as string | undefined;
                    layer.bindTooltip(
                      limits ? `${props?.name || 'Airspace'} • ${limits}` : `${props?.name || 'Airspace'}`,
                      { permanent: labelsVisible && mapZoom >= 9, direction: 'center', className: airspaceLabelClassName, opacity: 0.9 }
                    );
                    layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Airspace'}</div>`);
                  }}
                />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={glidingSectorsVisible} name="Gliding Sectors">
          <FeatureGroup>
            {airspaceCollections.gliding.features.length > 0 && (
                <GeoJSON
                  key={`airspace-gliding-${airspaceCollections.gliding.features.length}-${onlyActiveAirspace}`}
                  data={airspaceCollections.gliding as any}
                  style={airspaceStyle as any}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as any;
                    const limits = props?.limits as string | undefined;
                    layer.bindTooltip(
                      limits ? `${props?.name || 'Airspace'} • ${limits}` : `${props?.name || 'Airspace'}`,
                      { permanent: labelsVisible && mapZoom >= 9, direction: 'center', className: airspaceLabelClassName, opacity: 0.9 }
                    );
                    layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Airspace'}</div>`);
                  }}
                />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={hangGlidingVisible} name="Hang Glidings">
          <FeatureGroup>
            {airspaceCollections.hangGliding.features.length > 0 && (
                <GeoJSON
                  key={`airspace-hang-${airspaceCollections.hangGliding.features.length}-${onlyActiveAirspace}`}
                  data={airspaceCollections.hangGliding as any}
                  style={airspaceStyle as any}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as any;
                    const limits = props?.limits as string | undefined;
                    layer.bindTooltip(
                      limits ? `${props?.name || 'Airspace'} • ${limits}` : `${props?.name || 'Airspace'}`,
                      { permanent: labelsVisible && mapZoom >= 9, direction: 'center', className: airspaceLabelClassName, opacity: 0.9 }
                    );
                    layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Airspace'}</div>`);
                  }}
                />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={airspacesVisible} name="OpenAIP Airspaces">
          <FeatureGroup>
            {airspaceCollections.general.features.length > 0 && (
                <GeoJSON
                  key={`airspace-general-${airspaceCollections.general.features.length}-${onlyActiveAirspace}`}
                  data={airspaceCollections.general as any}
                  style={airspaceStyle as any}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as any;
                    const limits = formatAirspaceVerticalLimits(props as any);
                    layer.bindTooltip(
                      limits ? `${props?.name || 'Airspace'}${limits ? ` • ${limits}` : ''}` : `${props?.name || 'Airspace'}`,
                      { permanent: labelsVisible && mapZoom >= 9, direction: 'center', className: airspaceLabelClassName, opacity: 0.9 }
                    );
                    layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Airspace'}</div>`);
                  }}
                />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked={obstaclesVisible} name="OpenAIP Obstacles">
          <FeatureGroup>
            {mapZoom >= 11 && obstacleGeoJson.features.length > 0 && (
              <GeoJSON
                key={`obstacles-${obstacleGeoJson.features.length}-${obstaclesVisible}-${mapZoom}`}
                data={obstacleGeoJson as any}
                pointToLayer={obstaclePointToLayer as any}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties as any;
                  layer.bindPopup(`<div style="font-size:12px;font-weight:700;text-transform:uppercase">${props?.name || 'Obstacle'}</div>`);
                }}
              />
            )}
          </FeatureGroup>
        </LayersControl.Overlay>
      </LayersControl>

      <LayerStateSync
        onBaseLayerChange={setSelectedBaseLayer}
        onOverlayChange={(name, active) => {
          if (name === 'OpenAIP Master Chart') setMasterVisible(active);
          if (name === 'OpenAIP Airports') setAirportsVisible(active);
          if (name === 'OpenAIP Navaids') setNavaidsVisible(active);
          if (name === 'OpenAIP Reporting Points') setReportingVisible(active);
          if (name === 'OpenAIP Airspaces') setAirspacesVisible(active);
          if (name === 'Class E') setClassEVisible(active);
          if (name === 'Class F') setClassFVisible(active);
          if (name === 'Class G') setClassGVisible(active);
          if (name === 'Military Operations Areas') setMilitaryAreasVisible(active);
          if (name === 'Training Areas') setTrainingAreasVisible(active);
          if (name === 'Gliding Sectors') setGlidingSectorsVisible(active);
          if (name === 'Hang Glidings') setHangGlidingVisible(active);
          if (name === 'OpenAIP Obstacles') setObstaclesVisible(active);
        }}
      />

      <MapEvents onShortPress={handleMapClick} onLongPress={handleLongPress} />
      <MapZoomState onZoomChange={setMapZoom} />
      <MapZoomLimits minZoom={minVisibleZoom} maxZoom={maxVisibleZoom} />
      <MapDragLock enabled={Boolean(draggingWaypointId)} />
      <VisiblePointLoader
        airportsEnabled={airportsVisible}
        navaidsEnabled={navaidsVisible}
        reportingEnabled={reportingVisible}
        onFeaturesLoaded={setViewportFeatures}
      />
      <VisibleAirspaceLoader
        enabled={
          airspacesVisible ||
          classEVisible ||
          classFVisible ||
          classGVisible ||
          militaryAreasVisible ||
          trainingAreasVisible ||
          glidingSectorsVisible ||
          hangGlidingVisible
        }
        onFeaturesLoaded={setAirspaceFeatures}
      />
      <VisibleObstacleLoader
        enabled={obstaclesVisible}
        onFeaturesLoaded={setObstacleFeatures}
      />
      <SearchControl
        onAddWaypoint={onAddWaypoint}
        onResultsChange={(results) => {
          setSearchFeatures(results);
        }}
      />

      {pendingClickLabel && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border bg-background/95 px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur">
          Last click: {pendingClickLabel}
        </div>
      )}

      {layerInfo && (
        <Popup
          position={[layerInfo.lat, layerInfo.lon]}
          eventHandlers={{
            remove: () => setLayerInfo(null),
          }}
        >
          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Layer Information</p>
              <p className="font-black uppercase">{layerInfo.title}</p>
              {layerInfo.subtitle && (
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">{layerInfo.subtitle}</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                {layerInfo.lat.toFixed(4)}, {layerInfo.lon.toFixed(4)}
              </p>
            </div>

            {layerInfo.items.length > 0 ? (
              <div className="space-y-2">
                {layerInfo.items.map((item) => (
                  <div key={`${item.layer}-${item.label}-${item.distanceNm?.toFixed(2)}`} className="rounded-md border bg-muted/30 px-2 py-1">
                    <p className="font-black uppercase">{item.label}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {item.layer}
                      {typeof item.distanceNm === 'number' ? ` • ${item.distanceNm.toFixed(1)} NM` : ''}
                    </p>
                    {item.detail && (
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.detail}</p>
                    )}
                    {item.frequencies && (
                      <p className="text-[10px] text-muted-foreground">{item.frequencies}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No nearby cached feature found.</p>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t mt-4">
              <Button 
                className="h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase text-[10px] w-full"
                onClick={() => {
                  onAddWaypoint(layerInfo.lat, layerInfo.lon, layerInfo.title);
                }}
              >
                Add to Route
              </Button>
              {onAddHazard && (
                <Button 
                  variant="outline"
                  className="h-8 border-destructive/20 text-destructive hover:bg-destructive/10 font-black uppercase text-[10px] w-full"
                  onClick={() => {
                    onAddHazard(layerInfo.lat, layerInfo.lon);
                  }}
                >
                  Mark Hazard
                </Button>
              )}
            </div>

          </div>
        </Popup>
      )}

      {hazards && hazards.map((h) => (
        <Marker key={h.id} position={[h.lat, h.lng]} icon={HazardIcon}>
          <Popup className="hazard-popup">
            <div className="p-2 space-y-2 min-w-[150px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-[10px] font-black uppercase tracking-widest">Safety Hazard</span>
              </div>
              <p className="text-xs font-bold leading-relaxed">{h.note || 'No description provided.'}</p>
              <div className="pt-1 flex items-center justify-between border-t border-muted">
                 <span className="text-[8px] text-muted-foreground uppercase font-black">Coordinates</span>
                 <span className="text-[8px] font-mono font-bold text-muted-foreground">{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          color={ROUTE_LINE_COLOR}
          weight={ROUTE_LINE_WIDTH}
          dashArray="10, 10"
          opacity={ROUTE_LINE_OPACITY}
        />
      )}

      {legs.map((leg, index) => (
      <Marker
          key={leg.id}
          position={[leg.latitude!, leg.longitude!]}
          icon={createNumberedWaypointIcon(index + 1)}
          draggable={isEditing}
          eventHandlers={{
            dragstart: () => {
              setDraggingWaypointId(leg.id);
            },
            dragend: (event) => {
              const marker = event.target as L.Marker;
              const nextPosition = marker.getLatLng();
              setDraggingWaypointId(null);
              onMoveWaypoint?.(leg.id, nextPosition.lat, nextPosition.lng);
            },
          }}
        >
          <Popup>
            <div className="text-xs font-black uppercase space-y-1">
              <p className="text-primary font-bold">{leg.waypoint}</p>
              <p className="text-[10px] text-muted-foreground">Waypoint {index + 1}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      </LeafletMapFrame>

      {isZoomPanelOpen ? (
        <div className="pointer-events-auto absolute left-2 right-2 top-4 z-[1000] w-auto rounded-xl border border-slate-200 bg-white/95 p-3 text-[10px] shadow-xl backdrop-blur sm:left-auto sm:right-4 sm:w-[280px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Map Zoom</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
              Zoom {mapZoom} • decide what to load
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
            onClick={() => onZoomPanelOpenChange?.(false)}
          >
            Hide card
          </button>
        </div>

        <div className="mt-3 space-y-3">
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
      </div>
      ) : null}

      {isLayersPanelOpen ? (
        <div className="pointer-events-auto absolute left-1/2 top-2 z-[1200] flex max-h-[calc(100vh-1rem)] w-[min(340px,calc(100%-0.75rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 text-[10px] shadow-xl backdrop-blur">
          <div className="border-b border-slate-100 px-2 py-2 sm:px-3 sm:py-3">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                aria-label="Close layer panel"
                className="shrink-0 rounded-full border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50"
                onClick={() => onLayersPanelOpenChange?.(false)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="text-right leading-none">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Map Layers</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 sm:px-3 sm:py-3">
            <div className="mb-2 grid grid-cols-3 gap-1">
              {[
                { key: 'layers', label: 'Layers' },
                { key: 'labels', label: 'Labels' },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  variant="outline"
                  aria-pressed={layerPanelTab === tab.key}
                  className={`h-7 px-2 text-[8px] font-black uppercase sm:h-8 sm:text-[9px] ${
                    layerPanelTab === tab.key
                      ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setLayerPanelTab(tab.key as typeof layerPanelTab)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {layerPanelTab === 'layers' ? (
              <div className="space-y-1.5">
                {[
                  ['Labels', labelsVisible, setLabelsVisible],
                  ['Master Chart', masterVisible, setMasterVisible],
                  ['Airports', airportsVisible, setAirportsVisible],
                  ['Navaids', navaidsVisible, setNavaidsVisible],
                  ['Reporting Points', reportingVisible, setReportingVisible],
                  ['Airspaces', airspacesVisible, setAirspacesVisible],
                  ['Class E', classEVisible, setClassEVisible],
                  ['Class F', classFVisible, setClassFVisible],
                  ['Class G', classGVisible, setClassGVisible],
                  ['Military Areas', militaryAreasVisible, setMilitaryAreasVisible],
                  ['Training Areas', trainingAreasVisible, setTrainingAreasVisible],
                  ['Gliding Sectors', glidingSectorsVisible, setGlidingSectorsVisible],
                  ['Hang Glidings', hangGlidingVisible, setHangGlidingVisible],
                  ['Obstacles', obstaclesVisible, setObstaclesVisible],
                  ['Active Only', onlyActiveAirspace, setOnlyActiveAirspace],
                ].map(([label, checked, setter]) => (
                  <Button
                    key={label as string}
                    type="button"
                    variant="outline"
                    aria-pressed={checked as boolean}
                    className={`h-7 w-full justify-start gap-1.5 px-2 text-[8px] font-black uppercase sm:h-9 sm:px-3 sm:text-[10px] ${
                      checked
                        ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => (setter as (value: boolean) => void)(!(checked as boolean))}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full border-2 ${
                        checked ? 'border-white bg-white' : 'border-slate-300 bg-transparent'
                      }`}
                    />
                    <span className="text-[8px] font-semibold sm:text-[10px]">{label as string}</span>
                  </Button>
                ))}
              </div>
            ) : null}

            {layerPanelTab === 'labels' ? (
              <div className="space-y-1.5">
                {[
                  ['Airport Labels', labelsVisible, setLabelsVisible],
                  ['Navaid Labels', navaidsVisible, setNavaidsVisible],
                  ['Reporting Labels', reportingVisible, setReportingVisible],
                  ['Airspace Labels', airspacesVisible, setAirspacesVisible],
                  ['Class E Labels', classEVisible, setClassEVisible],
                  ['Class F Labels', classFVisible, setClassFVisible],
                  ['Class G Labels', classGVisible, setClassGVisible],
                  ['Military Labels', militaryAreasVisible, setMilitaryAreasVisible],
                  ['Training Labels', trainingAreasVisible, setTrainingAreasVisible],
                  ['Gliding Labels', glidingSectorsVisible, setGlidingSectorsVisible],
                  ['Hang Gliding Labels', hangGlidingVisible, setHangGlidingVisible],
                  ['Obstacle Labels', obstaclesVisible, setObstaclesVisible],
                ].map(([label, checked, setter]) => (
                  <Button
                    key={label as string}
                    type="button"
                    variant="outline"
                    aria-pressed={checked as boolean}
                    className={`h-7 w-full justify-start gap-1.5 px-2 text-[8px] font-black uppercase sm:h-9 sm:px-3 sm:text-[10px] ${
                      checked
                        ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => (setter as (value: boolean) => void)(!(checked as boolean))}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full border-2 ${
                        checked ? 'border-white bg-white' : 'border-slate-300 bg-transparent'
                      }`}
                    />
                    <span className="text-[8px] font-semibold sm:text-[10px]">{label as string}</span>
                  </Button>
                ))}
              </div>
            ) : null}

          </div>
        </div>
      ) : null}
      <style jsx global>{`
        .active-flight-map-label,
        .active-flight-map-airspace-label {
          margin: 0 !important;
          padding: 0 !important;
        }

        .active-flight-map-label .leaflet-tooltip-content,
        .active-flight-map-airspace-label .leaflet-tooltip-content {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1 !important;
        }

        .active-flight-map-label:before,
        .active-flight-map-airspace-label:before {
          display: none !important;
        }

        .leaflet-control-layers {
          display: none !important;
        }
      `}</style>
    </div>
  );
}





