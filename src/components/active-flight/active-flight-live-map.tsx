'use client';

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeatureGroup, GeoJSON, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ActiveFlightMapLibreShell } from '@/components/active-flight/active-flight-maplibre-shell';
import { OPENAIP_VECTOR_TILE_URL } from '@/lib/maplibre-map-config';
import type { Booking, NavlogLeg } from '@/types/booking';
import type { ActiveLegState, FlightPosition } from '@/types/flight-session';
import { cn } from '@/lib/utils';
import { parseJsonResponse } from '@/lib/safe-json';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WaypointIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#10b981;border:2px solid #fff;box-shadow:0 0 0 2px rgba(16,185,129,0.28);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const createAircraftMarkerIcon = (headingTrue?: number | null) =>
  L.divIcon({
    className: '',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;">
        <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
          <div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;transform:rotate(${headingTrue ?? 0}deg);transform-origin:center;filter:drop-shadow(0 0 6px rgba(14,165,233,0.35));">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M11 1L13.1 7.4L18.6 9.2V11.4L13.1 10.7L12.4 14.1L15.2 16.2V18.1L11 16.6L6.8 18.1V16.2L9.6 14.1L8.9 10.7L3.4 11.4V9.2L8.9 7.4L11 1Z" fill="#0ea5e9" stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round"/>
              <path d="M11 6.2V16.2" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

type OpenAipFeature = {
  _id: string;
  name: string;
  type?: string;
  icaoCode?: string;
  identifier?: string;
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
  lowerLimit?: unknown;
  upperLimit?: unknown;
  verticalLimits?: unknown;
  limits?: unknown;
  floor?: unknown;
  ceiling?: unknown;
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

const OPENAIP_POINT_RESOURCES = ['airports', 'navaids', 'reporting-points'] as const;
const AIRSPACE_CLASS_E = 6;
const AIRSPACE_CLASS_F = 7;
const AIRSPACE_CLASS_G = 8;
const LOCATION_CALIBRATION_STORAGE_KEY = 'safeviate:active-flight-location-calibration';
type Point = [number, number];

type LocationCalibration = {
  latitude: number;
  longitude: number;
  savedAt: string;
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const readLocationCalibration = () => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(LOCATION_CALIBRATION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocationCalibration;
  } catch {
    window.localStorage.removeItem(LOCATION_CALIBRATION_STORAGE_KEY);
    return null;
  }
};

const saveLocationCalibration = (calibration: LocationCalibration) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCATION_CALIBRATION_STORAGE_KEY, JSON.stringify(calibration));
};

const clearLocationCalibration = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCATION_CALIBRATION_STORAGE_KEY);
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

const mergeOpenAipFeatures = (current: OpenAipFeature[], next: OpenAipFeature[]) => {
  const merged = [...current];
  for (const item of next) {
    if (!merged.some((existing) => existing._id === item._id)) {
      merged.push(item);
    }
  }
  return merged;
};

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
  const lower =
    formatLimitValue(rawVertical?.lower ?? rawVertical?.lowerLimit ?? rawVertical?.floor ?? airspace.lowerLimit ?? airspace.floor);
  const upper =
    formatLimitValue(rawVertical?.upper ?? rawVertical?.upperLimit ?? rawVertical?.ceiling ?? airspace.upperLimit ?? airspace.ceiling);
  const fallback = formatLimitValue(airspace.limits) || formatLimitValue(rawVertical?.text) || formatLimitValue(rawVertical?.display) || '';
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
  airspace.type === 1 || airspace.type === 33 || /MILITARY|SHOOTING|WEAPONS|RANGE|MOA|M\.O\.A|OPERATIONS AREA/i.test(airspace.name);

const isTrainingAirspace = (airspace: OpenAipAirspace) =>
  airspace.type === 2 || /TRAINING|GENERAL FLYING|FLYING TNG|PJE/i.test(airspace.name);

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

function FitFlightBounds({
  position,
}: {
  position: FlightPosition | null;
}) {
  const map = useMap();
  const lastFrameSignatureRef = useRef('');

  useEffect(() => {
    if (!position) return;
    const nextSignature = `${position.latitude.toFixed(6)},${position.longitude.toFixed(6)}`;
    if (lastFrameSignatureRef.current === nextSignature) return;
    lastFrameSignatureRef.current = nextSignature;
    map.setView([position.latitude, position.longitude], map.getZoom(), { animate: false });
  }, [map, position]);

  return null;
}

function MapInteractionWatcher({
  onUserInteracted,
}: {
  onUserInteracted: () => void;
}) {
  useMapEvents({
    dragstart: onUserInteracted,
    zoomstart: onUserInteracted,
  });

  return null;
}

function MapRecenterController({
  position,
  recenterNonce,
  onDone,
}: {
  position: FlightPosition | null;
  recenterNonce: number;
  onDone: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (recenterNonce === 0) return;

    if (position) {
      map.setView([position.latitude, position.longitude], map.getZoom(), { animate: false });
      onDone();
    }
  }, [map, onDone, position, recenterNonce]);

  return null;
}

function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    let frameId = 0;

    const refreshMapSize = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        map.invalidateSize(false);
      });
    };

    refreshMapSize();

    const container = map.getContainer();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refreshMapSize) : null;
    resizeObserver?.observe(container);
    resizeObserver?.observe(container.parentElement || container);

    window.addEventListener('resize', refreshMapSize);
    window.addEventListener('orientationchange', refreshMapSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', refreshMapSize);
      window.removeEventListener('orientationchange', refreshMapSize);
    };
  }, [map]);

  return null;
}

function MapZoomBridge({
  zoomInNonce,
  zoomOutNonce,
  onZoomChange,
}: {
  zoomInNonce: number;
  zoomOutNonce: number;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const publishZoom = () => {
      onZoomChange(map.getZoom());
    };

    publishZoom();
    map.on('zoomend', publishZoom);

    return () => {
      map.off('zoomend', publishZoom);
    };
  }, [map, onZoomChange]);

  useEffect(() => {
    if (zoomInNonce === 0) return;
    map.zoomIn();
  }, [map, zoomInNonce]);

  useEffect(() => {
    if (zoomOutNonce === 0) return;
    map.zoomOut();
  }, [map, zoomOutNonce]);

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
    const bbox = [bounds.getWest().toFixed(6), bounds.getSouth().toFixed(6), bounds.getEast().toFixed(6), bounds.getNorth().toFixed(6)].join(',');
    const requestKey = `${activeResources.join(',')}|${bbox}`;
    if (lastRequestKeyRef.current === requestKey) return;
    lastRequestKeyRef.current = requestKey;
    const nextSeq = ++requestSeq.current;

    try {
      const responses = await Promise.all(
        activeResources.map(async (resource) => {
          const data = (await fetchOpenAipJson<{ items?: unknown[] }>(`/api/openaip?resource=${resource}&bbox=${bbox}`)) ?? { items: [] };
          return { resource, data };
        })
      );

      if (nextSeq !== requestSeq.current) return;
      const combined = responses.flatMap(({ resource, data }) => (data.items || []).map((item: any) => ({ ...item, sourceLayer: resource })));
      onFeaturesLoaded(combined);
    } catch (error) {
      console.error('Viewport OpenAIP load failed', error);
    }
  }, [activeResources, map, onFeaturesLoaded]);

  useEffect(() => {
    void loadVisiblePoints();
  }, [loadVisiblePoints]);

  useMapEvents({
    moveend: () => {
      void loadVisiblePoints();
    },
    zoomend: () => {
      void loadVisiblePoints();
    },
  });

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
    const bbox = [bounds.getWest().toFixed(6), bounds.getSouth().toFixed(6), bounds.getEast().toFixed(6), bounds.getNorth().toFixed(6)].join(',');
    if (lastRequestKeyRef.current === bbox) return;
    lastRequestKeyRef.current = bbox;
    const nextSeq = ++requestSeq.current;

    try {
      const data = (await fetchOpenAipJson<{ items?: unknown[] }>(`/api/openaip?resource=airspaces&bbox=${bbox}`)) ?? { items: [] };
      if (nextSeq !== requestSeq.current) return;
      onFeaturesLoaded((data.items || []) as OpenAipAirspace[]);
    } catch (error) {
      console.error('Viewport OpenAIP airspace load failed', error);
    }
  }, [enabled, map, onFeaturesLoaded]);

  useEffect(() => {
    void loadVisibleAirspaces();
  }, [loadVisibleAirspaces]);

  useMapEvents({
    moveend: () => {
      void loadVisibleAirspaces();
    },
    zoomend: () => {
      void loadVisibleAirspaces();
    },
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
    const bbox = [bounds.getWest().toFixed(6), bounds.getSouth().toFixed(6), bounds.getEast().toFixed(6), bounds.getNorth().toFixed(6)].join(',');
    if (lastRequestKeyRef.current === bbox) return;
    lastRequestKeyRef.current = bbox;
    const nextSeq = ++requestSeq.current;

    try {
      const data = (await fetchOpenAipJson<{ items?: unknown[] }>(`/api/openaip?resource=obstacles&bbox=${bbox}`)) ?? { items: [] };
      if (nextSeq !== requestSeq.current) return;
      onFeaturesLoaded((data.items || []) as OpenAipObstacle[]);
    } catch (error) {
      console.error('Viewport OpenAIP obstacle load failed', error);
    }
  }, [enabled, map, onFeaturesLoaded]);

  useEffect(() => {
    void loadVisibleObstacles();
  }, [loadVisibleObstacles]);

  useMapEvents({
    moveend: () => {
      void loadVisibleObstacles();
    },
    zoomend: () => {
      void loadVisibleObstacles();
    },
  });

  return null;
}

function MapAreaCacheController({
  cacheNonce,
  areaDownloadNonce,
  routeDownloadNonce,
  routePoints,
  onDone,
  onAreaDownloadDone,
  onRouteDownloadDone,
  onStatus,
  onComplete,
  onAreaDownloadStatus,
  onAreaDownloadComplete,
  onRouteDownloadStatus,
  onRouteDownloadComplete,
}: {
  cacheNonce: number;
  areaDownloadNonce: number;
  routeDownloadNonce: number;
  routePoints: [number, number][];
  onDone: () => void;
  onAreaDownloadDone: () => void;
  onRouteDownloadDone: () => void;
  onStatus: (status: string) => void;
  onComplete: (tileCount: number) => void;
  onAreaDownloadStatus: (status: string) => void;
  onAreaDownloadComplete: (tileCount: number) => void;
  onRouteDownloadStatus: (status: string) => void;
  onRouteDownloadComplete: (tileCount: number) => void;
}) {
  const map = useMap();

  const collectVisibleTileUrls = useCallback(
    (targetZoom: number, padding: number) => {
      const paddedBounds = map.getBounds().pad(padding);
      const worldSize = 2 ** targetZoom;
      const northWest = map.project(paddedBounds.getNorthWest(), targetZoom).divideBy(256);
      const southEast = map.project(paddedBounds.getSouthEast(), targetZoom).divideBy(256);

      const minX = Math.max(0, Math.floor(Math.min(northWest.x, southEast.x)));
      const maxX = Math.min(worldSize - 1, Math.ceil(Math.max(northWest.x, southEast.x)));
      const minY = Math.max(0, Math.floor(Math.min(northWest.y, southEast.y)));
      const maxY = Math.min(worldSize - 1, Math.ceil(Math.max(northWest.y, southEast.y)));

      const urls: string[] = [];
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          urls.push(`https://tile.openstreetmap.org/${targetZoom}/${x}/${y}.png`);
        }
      }
      return urls;
    },
    [map]
  );

  const collectBoundsTileUrls = useCallback((bounds: L.LatLngBounds, targetZoom: number, padding: number) => {
    const paddedBounds = bounds.pad(padding);
    const worldSize = 2 ** targetZoom;
    const northWest = map.project(paddedBounds.getNorthWest(), targetZoom).divideBy(256);
    const southEast = map.project(paddedBounds.getSouthEast(), targetZoom).divideBy(256);

    const minX = Math.max(0, Math.floor(Math.min(northWest.x, southEast.x)));
    const maxX = Math.min(worldSize - 1, Math.ceil(Math.max(northWest.x, southEast.x)));
    const minY = Math.max(0, Math.floor(Math.min(northWest.y, southEast.y)));
    const maxY = Math.min(worldSize - 1, Math.ceil(Math.max(northWest.y, southEast.y)));

    const urls: string[] = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        urls.push(`https://tile.openstreetmap.org/${targetZoom}/${x}/${y}.png`);
      }
    }
    return urls;
  }, [map]);

  const warmTileUrls = useCallback(async (tileUrls: string[]) => {
    await Promise.allSettled(
      tileUrls.map(
        (url) =>
          fetch(url, { mode: 'no-cors' })
            .then(() => undefined)
            .catch(() => undefined)
      )
    );
  }, []);

  useEffect(() => {
    if (cacheNonce === 0) return;

    const run = async () => {
      try {
        const zoom = map.getZoom();
        const tileUrls = Array.from(
          new Set([
            ...collectVisibleTileUrls(zoom, 0.3),
            ...(zoom > MAP_MIN_ZOOM ? collectVisibleTileUrls(zoom - 1, 0.2) : []),
          ])
        );

        if (!tileUrls.length) {
          onStatus('No tiles to cache.');
          onComplete(0);
          onDone();
          return;
        }

        onStatus(`Caching ${tileUrls.length} tiles...`);
        await warmTileUrls(tileUrls);

        onStatus('Cached current view for offline use.');
        onComplete(tileUrls.length);
      } finally {
        onDone();
      }
    };

    void run();
  }, [cacheNonce, collectVisibleTileUrls, map, onComplete, onDone, onStatus, warmTileUrls]);

  useEffect(() => {
    if (areaDownloadNonce === 0) return;

    const run = async () => {
      try {
        const zoom = map.getZoom();
        const tileUrls = Array.from(
          new Set([
            ...collectVisibleTileUrls(zoom, 0.75),
            ...collectVisibleTileUrls(Math.max(zoom - 1, MAP_MIN_ZOOM), 0.6),
            ...collectVisibleTileUrls(Math.min(zoom + 1, MAP_MAX_ZOOM), 0.45),
          ])
        );

        if (!tileUrls.length) {
          onAreaDownloadStatus('No area tiles available to download.');
          onAreaDownloadComplete(0);
          onAreaDownloadDone();
          return;
        }

        onAreaDownloadStatus(`Saving ${tileUrls.length} area tiles on this device...`);
        await warmTileUrls(tileUrls);
        onAreaDownloadStatus('Area saved on this device for offline use.');
        onAreaDownloadComplete(tileUrls.length);
      } finally {
        onAreaDownloadDone();
      }
    };

    void run();
  }, [
    areaDownloadNonce,
    collectVisibleTileUrls,
    map,
    onAreaDownloadComplete,
    onAreaDownloadDone,
    onAreaDownloadStatus,
    warmTileUrls,
  ]);

  useEffect(() => {
    if (routeDownloadNonce === 0) return;

    const run = async () => {
      try {
        if (routePoints.length < 2) {
          onRouteDownloadStatus('Load a route before downloading the route corridor.');
          onRouteDownloadComplete(0);
          onRouteDownloadDone();
          return;
        }

        const routeBounds = L.latLngBounds(routePoints);
        const baseZoom = Math.max(Math.min(map.getBoundsZoom(routeBounds), 12), MAP_MIN_ZOOM);
        const tileUrls = Array.from(
          new Set([
            ...collectBoundsTileUrls(routeBounds, baseZoom, 0.35),
            ...collectBoundsTileUrls(routeBounds, Math.max(baseZoom - 1, MAP_MIN_ZOOM), 0.3),
          ])
        );

        if (!tileUrls.length) {
          onRouteDownloadStatus('No route tiles available to download.');
          onRouteDownloadComplete(0);
          onRouteDownloadDone();
          return;
        }

        onRouteDownloadStatus(`Saving ${tileUrls.length} route tiles on this device...`);
        await warmTileUrls(tileUrls);
        onRouteDownloadStatus('Route corridor saved on this device for offline use.');
        onRouteDownloadComplete(tileUrls.length);
      } finally {
        onRouteDownloadDone();
      }
    };

    void run();
  }, [
    collectBoundsTileUrls,
    map,
    onRouteDownloadComplete,
    onRouteDownloadDone,
    onRouteDownloadStatus,
    routeDownloadNonce,
    routePoints,
    warmTileUrls,
  ]);

  return null;
}

function CompassDial({
  headingTrue,
}: {
  headingTrue: number | null | undefined;
}) {
  const rotation = headingTrue != null && !Number.isNaN(headingTrue) ? `${headingTrue}deg` : '0deg';

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 rounded-full border border-slate-300 bg-slate-950 shadow-inner shadow-black/25">
        <div
          className="absolute left-1/2 top-1/2 h-[72%] w-[2px] -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `translate(-50%, -50%) rotate(${rotation})` }}
        >
          <div className="absolute left-1/2 top-0 h-1/2 w-[2px] -translate-x-1/2 rounded-full bg-sky-300 shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
          <div className="absolute left-1/2 top-1/2 h-1/2 w-[2px] -translate-x-1/2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]" />
        </div>
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.65)]" />
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Heading</p>
        <p className="text-sm font-black tracking-wide text-slate-900">
          {headingTrue != null && !Number.isNaN(headingTrue) ? `${Math.round(((headingTrue % 360) + 360) % 360)} deg` : '---'}
        </p>
      </div>
    </div>
  );
}

function MenuCloseButton({ onClose }: { onClose?: () => void }) {
  return (
    <DialogClose asChild>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        className="h-9 rounded-full border-slate-200 bg-white px-4 text-[9px] font-black uppercase tracking-[0.10em] text-slate-800 shadow-sm transition-transform duration-150 hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px focus-visible:bg-white focus-visible:text-slate-800 sm:h-10 sm:px-4 sm:text-[11px]"
      >
        Menu
      </Button>
    </DialogClose>
  );
}

const OFFLINE_TILE_CACHE_PREFIX = 'safeviate-tiles-';
const ACTIVE_FLIGHT_MAP_LAYER_SETTINGS_KEY = 'safeviate.active-flight-map-layer-settings';
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 14;
const AVAILABLE_ZOOM_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

type ActiveFlightMapLayerSettings = {
  showLabels: boolean;
  showMasterChart: boolean;
  showAirports: boolean;
  showNavaids: boolean;
  showReportingPoints: boolean;
  showAirspaces: boolean;
  showClassE: boolean;
  showClassF: boolean;
  showClassG: boolean;
  showMilitaryAreas: boolean;
  showTrainingAreas: boolean;
  showGlidingSectors: boolean;
  showHangGlidings: boolean;
  showObstacles: boolean;
  showOnlyActiveAirspace: boolean;
  showRouteLine: boolean;
  showWaypointMarkers: boolean;
  showTrackLine: boolean;
};

const DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS: ActiveFlightMapLayerSettings = {
  showLabels: true,
  showMasterChart: true,
  showAirports: true,
  showNavaids: true,
  showReportingPoints: false,
  showAirspaces: false,
  showClassE: false,
  showClassF: false,
  showClassG: false,
  showMilitaryAreas: false,
  showTrainingAreas: true,
  showGlidingSectors: false,
  showHangGlidings: false,
  showObstacles: false,
  showOnlyActiveAirspace: false,
  showRouteLine: true,
  showWaypointMarkers: true,
  showTrackLine: true,
};

const readStoredActiveFlightMapLayerSettings = (): ActiveFlightMapLayerSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS;
  }

  const stored = window.localStorage.getItem(ACTIVE_FLIGHT_MAP_LAYER_SETTINGS_KEY);
  if (!stored) {
    return DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS;
  }

  try {
    return {
      ...DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS,
      ...(JSON.parse(stored) as Partial<ActiveFlightMapLayerSettings>),
    };
  } catch {
    return DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS;
  }
};

async function readOfflineTileSummary() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      cacheCount: 0,
      tileCount: 0,
      usageLabel: 'Browser cache details unavailable on this device.',
    };
  }

  const cacheNames = (await caches.keys()).filter((cacheName) => cacheName.startsWith(OFFLINE_TILE_CACHE_PREFIX));
  let tileCount = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    tileCount += keys.length;
  }

  let usageLabel = 'Storage estimate unavailable on this device.';
  if ('storage' in navigator && typeof navigator.storage?.estimate === 'function') {
    const estimate = await navigator.storage.estimate();
    if (estimate.usage != null && estimate.quota != null && estimate.quota > 0) {
      const usedMb = (estimate.usage / (1024 * 1024)).toFixed(1);
      const quotaGb = (estimate.quota / (1024 * 1024 * 1024)).toFixed(1);
      usageLabel = `${usedMb} MB used of ${quotaGb} GB available in browser storage.`;
    }
  }

  return {
    cacheCount: cacheNames.length,
    tileCount,
    usageLabel,
  };
}

async function clearOfflineTileCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith(OFFLINE_TILE_CACHE_PREFIX))
      .map((cacheName) => caches.delete(cacheName))
  );
}

export function ActiveFlightLiveMap({
  booking,
  legs,
  position,
  aircraftRegistration,
  activeLegIndex,
  activeLegState,
  fullscreen = false,
  showControls = true,
  followOwnship: followOwnshipProp,
  onFollowOwnshipChange,
  recenterSignal = 0,
  isLayersCardOpen = false,
  isMapZoomCardOpen = false,
  onLayersCardOpenChange,
  onMapZoomCardOpenChange,
}: {
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
}) {
  const routePoints = useMemo(
    () =>
      legs
        .filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined)
        .map((leg) => [leg.latitude!, leg.longitude!] as [number, number]),
    [legs]
  );
  const validRouteLegs = useMemo(
    () => legs.filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined),
    [legs]
  );
  const routeSignature = useMemo(
    () => routePoints.map(([latitude, longitude]) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`).join('|'),
    [routePoints]
  );
  const [trackHistory, setTrackHistory] = useState<[number, number][]>([]);
  const [internalFollowOwnship, setInternalFollowOwnship] = useState(true);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [cacheNonce, setCacheNonce] = useState(0);
  const [cacheStatus, setCacheStatus] = useState('Cache current view for offline use.');
  const [cacheState, setCacheState] = useState<'idle' | 'caching' | 'complete'>('idle');
  const [isCachingArea, setIsCachingArea] = useState(false);
  const [areaDownloadNonce, setAreaDownloadNonce] = useState(0);
  const [areaDownloadStatus, setAreaDownloadStatus] = useState('Download a larger area on this device.');
  const [areaDownloadState, setAreaDownloadState] = useState<'idle' | 'downloading' | 'complete'>('idle');
  const [isDownloadingArea, setIsDownloadingArea] = useState(false);
  const [routeDownloadNonce, setRouteDownloadNonce] = useState(0);
  const [routeDownloadStatus, setRouteDownloadStatus] = useState(
    routePoints.length > 1 ? 'Download the loaded route corridor on this device.' : 'Load a route to download it on this device.'
  );
  const [routeDownloadState, setRouteDownloadState] = useState<'idle' | 'downloading' | 'complete'>('idle');
  const [isDownloadingRoute, setIsDownloadingRoute] = useState(false);
  const [offlineManagerOpen, setOfflineManagerOpen] = useState(false);
  const [offlineTileCount, setOfflineTileCount] = useState(0);
  const [offlineCacheCount, setOfflineCacheCount] = useState(0);
  const [offlineUsageLabel, setOfflineUsageLabel] = useState('Checking browser storage on this device...');
  const [isRefreshingOfflineSummary, setIsRefreshingOfflineSummary] = useState(false);
  const [isClearingOfflineMaps, setIsClearingOfflineMaps] = useState(false);
  const [viewportFeatures, setViewportFeatures] = useState<OpenAipFeature[]>([]);
  const [airspaceFeatures, setAirspaceFeatures] = useState<OpenAipAirspace[]>([]);
  const [obstacleFeatures, setObstacleFeatures] = useState<OpenAipObstacle[]>([]);
  const [locationCalibration, setLocationCalibration] = useState<LocationCalibration | null>(null);
  const [mapCenter, setMapCenter] = useState<Point | null>(null);
  const manualLatitudeInputRef = useRef<HTMLInputElement | null>(null);
  const manualLongitudeInputRef = useRef<HTMLInputElement | null>(null);
  const [showRouteLine, setShowRouteLine] = useState(() => readStoredActiveFlightMapLayerSettings().showRouteLine);
  const [showWaypointMarkers, setShowWaypointMarkers] = useState(() => readStoredActiveFlightMapLayerSettings().showWaypointMarkers);
  const [showTrackLine, setShowTrackLine] = useState(() => readStoredActiveFlightMapLayerSettings().showTrackLine);
  const [showLabels, setShowLabels] = useState(() => readStoredActiveFlightMapLayerSettings().showLabels);
  const [showMasterChart, setShowMasterChart] = useState(() => readStoredActiveFlightMapLayerSettings().showMasterChart);
  const [showAirports, setShowAirports] = useState(() => readStoredActiveFlightMapLayerSettings().showAirports);
  const [showNavaids, setShowNavaids] = useState(() => readStoredActiveFlightMapLayerSettings().showNavaids);
  const [showReportingPoints, setShowReportingPoints] = useState(() => readStoredActiveFlightMapLayerSettings().showReportingPoints);
  const [showAirspaces, setShowAirspaces] = useState(() => readStoredActiveFlightMapLayerSettings().showAirspaces);
  const [showClassE, setShowClassE] = useState(() => readStoredActiveFlightMapLayerSettings().showClassE);
  const [showClassF, setShowClassF] = useState(() => readStoredActiveFlightMapLayerSettings().showClassF);
  const [showClassG, setShowClassG] = useState(() => readStoredActiveFlightMapLayerSettings().showClassG);
  const [showMilitaryAreas, setShowMilitaryAreas] = useState(() => readStoredActiveFlightMapLayerSettings().showMilitaryAreas);
  const [showTrainingAreas, setShowTrainingAreas] = useState(() => readStoredActiveFlightMapLayerSettings().showTrainingAreas);
  const [showGlidingSectors, setShowGlidingSectors] = useState(() => readStoredActiveFlightMapLayerSettings().showGlidingSectors);
  const [showHangGlidings, setShowHangGlidings] = useState(() => readStoredActiveFlightMapLayerSettings().showHangGlidings);
  const [showObstacles, setShowObstacles] = useState(() => readStoredActiveFlightMapLayerSettings().showObstacles);
  const [showOnlyActiveAirspace, setShowOnlyActiveAirspace] = useState(() => readStoredActiveFlightMapLayerSettings().showOnlyActiveAirspace);
  const [currentZoom, setCurrentZoom] = useState(8);
  const [minVisibleZoom, setMinVisibleZoom] = useState(8);
  const [maxVisibleZoom, setMaxVisibleZoom] = useState(14);
  const useVectorOpenAipLayers = Boolean(OPENAIP_VECTOR_TILE_URL);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const settings: ActiveFlightMapLayerSettings = {
      showLabels,
      showMasterChart,
      showAirports,
      showNavaids,
      showReportingPoints,
      showAirspaces,
      showClassE,
      showClassF,
      showClassG,
      showMilitaryAreas,
      showTrainingAreas,
      showGlidingSectors,
      showHangGlidings,
      showObstacles,
      showOnlyActiveAirspace,
      showRouteLine,
      showWaypointMarkers,
      showTrackLine,
    };

    window.localStorage.setItem(ACTIVE_FLIGHT_MAP_LAYER_SETTINGS_KEY, JSON.stringify(settings));
  }, [
    showLabels,
    showMasterChart,
    showAirports,
    showNavaids,
    showReportingPoints,
    showAirspaces,
    showClassE,
    showClassF,
    showClassG,
    showMilitaryAreas,
    showTrainingAreas,
    showGlidingSectors,
    showHangGlidings,
    showObstacles,
    showOnlyActiveAirspace,
    showRouteLine,
    showWaypointMarkers,
    showTrackLine,
  ]);

  useEffect(() => {
    setLocationCalibration(readLocationCalibration());
  }, []);

  useEffect(() => {
    setRouteDownloadStatus(
      routePoints.length > 1 ? 'Download the loaded route corridor on this device.' : 'Load a route to download it on this device.'
    );
    if (routePoints.length <= 1 && routeDownloadState !== 'downloading') {
      setRouteDownloadState('idle');
    }
  }, [routeDownloadState, routePoints.length]);

  const followOwnship = followOwnshipProp ?? internalFollowOwnship;
  const displayPosition = useMemo<FlightPosition | null>(() => {
    if (!position && !locationCalibration) return null;

    if (position && !locationCalibration) {
      return position;
    }

    if (position && locationCalibration) {
      return {
        ...position,
        latitude: locationCalibration.latitude,
        longitude: locationCalibration.longitude,
      };
    }

    return {
      latitude: locationCalibration!.latitude,
      longitude: locationCalibration!.longitude,
      accuracy: undefined,
      altitude: null,
      speedKt: null,
      headingTrue: null,
      timestamp: locationCalibration!.savedAt,
    };
  }, [locationCalibration, position]);
  const airportFeatures = useMemo(() => viewportFeatures.filter((item) => item.sourceLayer === 'airports' && item.geometry?.coordinates), [viewportFeatures]);
  const navaidFeatures = useMemo(() => viewportFeatures.filter((item) => item.sourceLayer === 'navaids' && item.geometry?.coordinates), [viewportFeatures]);
  const reportingPointFeatures = useMemo(() => viewportFeatures.filter((item) => item.sourceLayer === 'reporting-points' && item.geometry?.coordinates), [viewportFeatures]);
  const airspaceCollections = useMemo(() => {
    const filterItems = (predicate: (item: OpenAipAirspace) => boolean) =>
      airspaceFeatureCollection(airspaceFeatures.filter((item) => item.geometry?.coordinates && (!showOnlyActiveAirspace || isAirspaceActiveNow(item)) && predicate(item)));

    return {
      classE: filterItems((item) => getAirspaceClassCategory(item) === 'class-e'),
      classF: filterItems((item) => getAirspaceClassCategory(item) === 'class-f'),
      classG: filterItems((item) => getAirspaceClassCategory(item) === 'class-g'),
      military: filterItems((item) => isMilitaryAirspace(item)),
      training: filterItems((item) => isTrainingAirspace(item)),
      gliding: filterItems((item) => isGlidingAirspace(item)),
      hangGliding: filterItems((item) => isHangGlidingAirspace(item)),
      general: filterItems((item) => getAirspaceCategory(item) === 'other' || getAirspaceCategory(item) === 'ctr'),
    };
  }, [airspaceFeatures, showOnlyActiveAirspace]);
  const obstacleGeoJson = useMemo(() => obstacleFeatureCollection(obstacleFeatures), [obstacleFeatures]);
  const featurePointIcon = useCallback((color: string) => L.divIcon({
    className: '',
    html: `<div style="width:8px;height:8px;border-radius:9999px;background:${color};border:1.5px solid #ffffff;box-shadow:0 0 0 1px rgba(15,23,42,0.2);"></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  }), []);
  const airportPointIcon = useMemo(() => featurePointIcon('#2563eb'), [featurePointIcon]);
  const navaidPointIcon = useMemo(() => featurePointIcon('#7c3aed'), [featurePointIcon]);
  const reportingPointIcon = useMemo(() => featurePointIcon('#d97706'), [featurePointIcon]);
  const labelClassName = 'active-flight-map-label rounded-sm border border-slate-200 bg-white/95 px-[1px] py-0 text-[8px] leading-[1] font-black uppercase tracking-[0.02em] text-slate-900 shadow-sm';
  const airspaceLabelClassName = 'active-flight-map-airspace-label rounded-sm border border-slate-300 bg-white/90 px-[1px] py-0 text-[8px] leading-[1] font-black uppercase tracking-[0.02em] text-slate-900 shadow-sm';
  const airspaceStyle = useCallback((feature: any) => {
    const category = feature?.properties?.category;
    let palette = { color: '#38bdf8', fillColor: '#38bdf8' };
    if (category === 'ctr') palette = { color: '#dc2626', fillColor: '#fca5a5' };
    else if (category === 'military') palette = { color: '#ef4444', fillColor: '#ef4444' };
    else if (category === 'training') palette = { color: '#f59e0b', fillColor: '#f59e0b' };
    else if (category === 'gliding') palette = { color: '#22c55e', fillColor: '#22c55e' };
    else if (category === 'hang') palette = { color: '#a855f7', fillColor: '#a855f7' };
    else if (category === 'class-e') palette = { color: '#3b82f6', fillColor: '#3b82f6' };
    else if (category === 'class-f') palette = { color: '#f97316', fillColor: '#f97316' };
    else if (category === 'class-g') palette = { color: '#14b8a6', fillColor: '#14b8a6' };

    return { ...palette, weight: 2, fillOpacity: 0.12, opacity: 0.85 };
  }, []);
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
  const setFollowOwnship = useCallback((value: boolean | ((current: boolean) => boolean)) => {
    const nextValue = typeof value === 'function' ? value(followOwnship) : value;
    onFollowOwnshipChange?.(nextValue);
    if (followOwnshipProp === undefined) {
      setInternalFollowOwnship(nextValue);
    }
  }, [followOwnship, followOwnshipProp, onFollowOwnshipChange]);

  useEffect(() => {
    setTrackHistory(displayPosition ? [[displayPosition.latitude, displayPosition.longitude]] : []);
  }, [aircraftRegistration, booking?.id, displayPosition, routeSignature]);

  useEffect(() => {
    if (recenterSignal === 0) return;
    setRecenterNonce((current) => current + 1);
  }, [recenterSignal]);

  useEffect(() => {
    if (!displayPosition) return;

    setTrackHistory((current) => {
      const nextPoint: [number, number] = [displayPosition.latitude, displayPosition.longitude];
      const lastPoint = current[current.length - 1];

      if (lastPoint && lastPoint[0] === nextPoint[0] && lastPoint[1] === nextPoint[1]) {
        return current;
      }

      const nextHistory = [...current, nextPoint];
      return nextHistory.slice(-40);
    });
  }, [displayPosition]);

  const center = displayPosition
    ? ([displayPosition.latitude, displayPosition.longitude] as [number, number])
    : routePoints[0] || ([-25.9, 27.9] as [number, number]);
  const currentLeg = activeLegIndex != null ? validRouteLegs[activeLegIndex] || null : null;
  const nextLeg = activeLegIndex != null ? validRouteLegs[activeLegIndex + 1] || null : null;
  const currentLegLabel =
    activeLegState?.fromWaypoint && activeLegState?.toWaypoint
      ? `${activeLegState.fromWaypoint} → ${activeLegState.toWaypoint}`
      : currentLeg?.waypoint || 'N/A';
  const currentFrequency = currentLeg?.frequencies || currentLeg?.layerInfo || 'N/A';
  const nextFrequency = nextLeg?.frequencies || nextLeg?.layerInfo || 'N/A';
  const normalizedHeading =
    position?.headingTrue != null && !Number.isNaN(position.headingTrue)
      ? ((position.headingTrue % 360) + 360) % 360
      : null;
  const mapRotationDegrees = normalizedHeading != null ? -normalizedHeading : 0;
  const mapShellStyle = {
    '--map-rotation': `${mapRotationDegrees}deg`,
    '--map-counter-rotation': `${-mapRotationDegrees}deg`,
  } as CSSProperties;
  const rawAccuracyMeters = position?.accuracy != null && !Number.isNaN(position.accuracy) ? Math.round(position.accuracy) : null;
  const isCoarseFix = rawAccuracyMeters != null && rawAccuracyMeters > 500;
  const locationStatusLabel = locationCalibration
    ? 'Calibrated'
    : isCoarseFix
      ? 'Coarse GPS'
      : position
        ? 'GPS Fix'
        : 'Waiting for GPS';
  const refreshOfflineSummary = useCallback(async () => {
    setIsRefreshingOfflineSummary(true);
    try {
      const summary = await readOfflineTileSummary();
      setOfflineCacheCount(summary.cacheCount);
      setOfflineTileCount(summary.tileCount);
      setOfflineUsageLabel(summary.usageLabel);
    } finally {
      setIsRefreshingOfflineSummary(false);
    }
  }, []);

  useEffect(() => {
    if (!offlineManagerOpen) return;
    void refreshOfflineSummary();
  }, [offlineManagerOpen, refreshOfflineSummary]);

  useEffect(() => {
    void refreshOfflineSummary();
  }, [refreshOfflineSummary]);

  useEffect(() => {
    if (cacheState === 'complete' || areaDownloadState === 'complete' || routeDownloadState === 'complete') {
      void refreshOfflineSummary();
    }
  }, [areaDownloadState, cacheState, refreshOfflineSummary, routeDownloadState]);

  const handleFollowOwnship = () => {
    setFollowOwnship(true);
    setRecenterNonce((current) => current + 1);
  };
  const handleNorthUp = () => {
    setFollowOwnship(false);
    setRecenterNonce((current) => current + 1);
  };
  const handleCalibrateLocation = () => {
    if (!mapCenter) return;

    const calibration: LocationCalibration = {
      latitude: mapCenter[0],
      longitude: mapCenter[1],
      savedAt: new Date().toISOString(),
    };

    setLocationCalibration(calibration);
    saveLocationCalibration(calibration);
  };
  const handleClearCalibration = () => {
    clearLocationCalibration();
    setLocationCalibration(null);
  };
  const handleApplyManualCalibration = () => {
    const latitude = Number(manualLatitudeInputRef.current?.value);
    const longitude = Number(manualLongitudeInputRef.current?.value);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;

    const calibration: LocationCalibration = {
      latitude,
      longitude,
      savedAt: new Date().toISOString(),
    };

    setLocationCalibration(calibration);
    saveLocationCalibration(calibration);
  };

  if (fullscreen) {
    return (
      <div className="fullscreen-map-shell relative h-[100dvh] w-full min-h-0 overflow-hidden bg-black" style={mapShellStyle}>
        <div className="absolute inset-x-3 top-3 z-[1000] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-[0_16px_36px_rgba(15,23,42,0.18)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Full Flight Tracking View</p>
            <MenuCloseButton />
          </div>
          <table className="w-full table-fixed border-collapse text-left">
            <tbody>
              <tr className="border-b border-slate-200">
                <th className="w-1/3 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">HDG</th>
                <th className="w-1/3 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">ALT</th>
                <th className="w-1/3 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">GS</th>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-sm font-black text-slate-900">{position?.headingTrue != null ? `${Math.round(((position.headingTrue % 360) + 360) % 360)}°` : 'N/A'}</td>
                <td className="px-3 py-1.5 text-sm font-black text-slate-900">{position?.altitude != null ? `${Math.round(position.altitude)} m` : 'N/A'}</td>
                <td className="px-3 py-1.5 text-sm font-black text-slate-900">{position?.speedKt != null ? `${position.speedKt.toFixed(0)} kt` : 'N/A'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <th className="w-1/3 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">LEG</th>
                <th className="w-1/3 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">CUR FREQ</th>
                <th className="w-1/3 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">NX FREQ</th>
              </tr>
              <tr>
                <td className="px-3 py-1.5 text-sm font-black text-slate-900">{currentLegLabel}</td>
                <td className="px-3 py-1.5 text-sm font-black text-slate-900">{currentFrequency}</td>
                <td className="px-3 py-1.5 text-sm font-black text-slate-900">{nextFrequency}</td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Mode: {followOwnship ? 'Nose Up' : 'North Up'} · {locationStatusLabel}{rawAccuracyMeters != null ? ` · ${rawAccuracyMeters} m` : ''}
          </div>
          <div className="flex min-h-14 items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    cacheState === 'complete'
                      ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
                      : cacheState === 'caching'
                        ? 'animate-pulse bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.14)]'
                        : 'bg-slate-400 shadow-[0_0_0_3px_rgba(148,163,184,0.12)]'
                  )}
                />
                <p className="min-w-0 flex-1 truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {cacheStatus}
                </p>
                {cacheState === 'complete' && (
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Cached
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-[6.75rem] rounded-full border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-800 shadow-sm hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800"
                disabled={isCachingArea}
                onClick={() => {
                  setIsCachingArea(true);
                  setCacheState('caching');
                  setCacheStatus('Caching current view...');
                  setCacheNonce((current) => current + 1);
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('inline-flex h-3 w-3 shrink-0 items-center justify-center', isCachingArea ? 'opacity-100' : 'opacity-0')}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </span>
                  <span>Cache View</span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-[7.25rem] rounded-full border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-800 shadow-sm hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800"
                disabled={isDownloadingArea}
                onClick={() => {
                  setIsDownloadingArea(true);
                  setAreaDownloadState('downloading');
                  setAreaDownloadStatus('Saving area on this device...');
                  setAreaDownloadNonce((current) => current + 1);
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('inline-flex h-3 w-3 shrink-0 items-center justify-center', isDownloadingArea ? 'opacity-100' : 'opacity-0')}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </span>
                  <span>Download Area</span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-[7.25rem] rounded-full border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-800 shadow-sm hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800 disabled:opacity-60"
                disabled={isDownloadingRoute || routePoints.length < 2}
                onClick={() => {
                  setIsDownloadingRoute(true);
                  setRouteDownloadState('downloading');
                  setRouteDownloadStatus('Saving route corridor on this device...');
                  setRouteDownloadNonce((current) => current + 1);
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('inline-flex h-3 w-3 shrink-0 items-center justify-center', isDownloadingRoute ? 'opacity-100' : 'opacity-0')}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </span>
                  <span>Download Route</span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-[7.25rem] rounded-full border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-800 shadow-sm hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800"
                onClick={locationCalibration ? handleClearCalibration : handleCalibrateLocation}
                disabled={!locationCalibration && !mapCenter}
              >
                {locationCalibration ? 'Use GPS' : 'Calibrate Here'}
              </Button>
              <Dialog open={offlineManagerOpen} onOpenChange={setOfflineManagerOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 min-w-[7rem] rounded-full border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-800 shadow-sm hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span>Offline Maps</span>
                      {offlineTileCount > 0 && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black tracking-normal text-emerald-700">
                          Saved
                        </span>
                      )}
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-slate-200 bg-white p-5 text-slate-900">
                  <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="text-base font-black uppercase tracking-[0.12em] text-slate-900">
                      Offline Maps on This Device
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-slate-600">
                      These maps are saved in this browser on this phone, tablet, or laptop. The browser manages the storage location automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Saved Tile Packs</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{offlineCacheCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Saved Tiles</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{offlineTileCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Browser Storage</p>
                      <p className="mt-1 font-semibold text-slate-700">{offlineUsageLabel}</p>
                    </div>
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs font-medium leading-5 text-slate-600">
                      Use <span className="font-black text-slate-900">Cache View</span> for a quick nearby area, <span className="font-black text-slate-900">Download Area</span> for a broader region, and <span className="font-black text-slate-900">Download Route</span> for the loaded corridor on this same device.
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full border-slate-200 bg-white px-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800"
                      disabled={isRefreshingOfflineSummary || isClearingOfflineMaps}
                      onClick={() => {
                        void refreshOfflineSummary();
                      }}
                    >
                      {isRefreshingOfflineSummary ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full border-rose-200 bg-white px-4 text-[11px] font-black uppercase tracking-[0.1em] text-rose-700 hover:bg-rose-50 hover:text-rose-700"
                        disabled={isClearingOfflineMaps}
                        onClick={() => {
                          void (async () => {
                            setIsClearingOfflineMaps(true);
                            try {
                              await clearOfflineTileCaches();
                              setCacheState('idle');
                              setAreaDownloadState('idle');
                              setRouteDownloadState('idle');
                              setCacheStatus('Cache current view for offline use.');
                              setAreaDownloadStatus('Download a larger area on this device.');
                              setRouteDownloadStatus(
                                routePoints.length > 1
                                  ? 'Download the loaded route corridor on this device.'
                                  : 'Load a route to download it on this device.'
                              );
                              await refreshOfflineSummary();
                            } finally {
                              setIsClearingOfflineMaps(false);
                            }
                          })();
                        }}
                      >
                        {isClearingOfflineMaps ? 'Clearing...' : 'Clear Offline Maps'}
                      </Button>
                      <DialogClose asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-full border-slate-200 bg-white px-4 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800"
                        >
                          Close
                        </Button>
                      </DialogClose>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="grid gap-2 border-t border-slate-200 px-3 py-2 sm:grid-cols-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  areaDownloadState === 'complete'
                    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
                    : areaDownloadState === 'downloading'
                      ? 'animate-pulse bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.14)]'
                      : 'bg-slate-400 shadow-[0_0_0_3px_rgba(148,163,184,0.12)]'
                )}
              />
              <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {areaDownloadStatus}
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  routeDownloadState === 'complete'
                    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
                    : routeDownloadState === 'downloading'
                      ? 'animate-pulse bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.14)]'
                      : 'bg-slate-400 shadow-[0_0_0_3px_rgba(148,163,184,0.12)]'
                )}
              />
              <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {routeDownloadStatus}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden">
          <div className="nose-up-map absolute inset-[-24%]">
            <ActiveFlightMapLibreShell
              className="h-full w-full rounded-none"
              center={center}
              position={displayPosition}
              routePoints={routePoints}
              trackHistory={trackHistory}
              legs={legs}
              followOwnship={followOwnship}
              recenterSignal={recenterNonce}
              minZoom={MAP_MIN_ZOOM}
              maxZoom={MAP_MAX_ZOOM}
              showRouteLine={showRouteLine}
              showWaypointMarkers={showWaypointMarkers}
              showTrackLine={showTrackLine}
              showLabels={showLabels}
              showMasterChart={showMasterChart}
              showAirports={showAirports}
              showNavaids={showNavaids}
              showReportingPoints={showReportingPoints}
              showAirspaces={showAirspaces}
              showClassE={showClassE}
              showClassF={showClassF}
              showClassG={showClassG}
              showMilitaryAreas={showMilitaryAreas}
              showTrainingAreas={showTrainingAreas}
              showGlidingSectors={showGlidingSectors}
              showHangGlidings={showHangGlidings}
              showObstacles={showObstacles}
              showOnlyActiveAirspace={showOnlyActiveAirspace}
              airportFeatures={airportFeatures}
              navaidFeatures={navaidFeatures}
              reportingPointFeatures={reportingPointFeatures}
              airspaceCollections={airspaceCollections}
              obstacleGeoJson={obstacleGeoJson}
              onZoomChange={setCurrentZoom}
              onCenterChange={(nextCenter) => setMapCenter(nextCenter)}
              onUserInteracted={() => {
                // Keep manual zoom/pan stable; recentering is handled explicitly by the Centre View button.
              }}
            />
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[1000] grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full rounded-full border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.10em] text-slate-800 shadow-sm transition-transform duration-150 hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800 sm:h-10 sm:px-4 sm:text-[11px]"
            onClick={handleFollowOwnship}
          >
            Nose Up
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full rounded-full border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.10em] text-slate-800 shadow-sm transition-transform duration-150 hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800 sm:h-10 sm:px-4 sm:text-[11px]"
            onClick={handleNorthUp}
          >
            North Up
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full rounded-full border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.10em] text-slate-800 shadow-sm transition-transform duration-150 hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800 sm:h-10 sm:px-4 sm:text-[11px]"
            onClick={() => {
              setRecenterNonce((current) => current + 1);
            }}
          >
            Center View
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-full rounded-full border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.10em] text-slate-800 shadow-sm transition-transform duration-150 hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800 sm:h-10 sm:px-4 sm:text-[11px]"
            onClick={locationCalibration ? handleClearCalibration : handleCalibrateLocation}
            disabled={!locationCalibration && !mapCenter}
          >
            {locationCalibration ? 'Use GPS' : 'Calibrate Here'}
          </Button>
        </div>
        <style jsx global>{`
          .fullscreen-map-shell .leaflet-top.leaflet-left {
            top: calc(10.5rem + env(safe-area-inset-top)) !important;
            left: 0.75rem !important;
          }

          .fullscreen-map-shell .nose-up-map {
            transform: rotate(var(--map-rotation)) scale(1.42);
            transform-origin: 50% 50%;
            transition: transform 180ms ease-out;
          }

          .fullscreen-map-shell .nose-up-map .leaflet-top,
          .fullscreen-map-shell .nose-up-map .leaflet-bottom {
            transform: rotate(var(--map-counter-rotation));
            transform-origin: center;
          }

          @media (min-width: 640px) {
            .fullscreen-map-shell .leaflet-top.leaflet-left {
              top: 11.75rem !important;
            }

            .fullscreen-map-shell .nose-up-map {
              inset: -20%;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
      <div className="flex h-full min-h-0 flex-col space-y-3" style={mapShellStyle}>
      {showControls ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <CompassDial headingTrue={position?.headingTrue} />
          <div className="h-8 w-px bg-slate-200" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Map Mode</p>
            <p className="text-sm font-semibold text-slate-900">
              {followOwnship ? 'Nose-up' : 'North-up'}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {locationStatusLabel}
              {rawAccuracyMeters != null ? ` • ${rawAccuracyMeters} m` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-slate-200 bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={() => setFollowOwnship((current) => !current)}
          >
            {followOwnship ? 'Nose Up' : 'North Up'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-slate-200 bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={() => {
              setFollowOwnship(true);
              setRecenterNonce((current) => current + 1);
            }}
          >
            Recenter
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-slate-200 bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={locationCalibration ? handleClearCalibration : handleCalibrateLocation}
            disabled={!locationCalibration && !mapCenter}
          >
            {locationCalibration ? 'Use GPS' : 'Calibrate Here'}
          </Button>
        </div>
        <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Latitude</p>
            <Input
              ref={manualLatitudeInputRef}
              inputMode="decimal"
              placeholder="e.g. -26.133"
              className="h-9 border-slate-200 bg-white text-sm font-semibold text-slate-900"
              defaultValue={locationCalibration?.latitude ?? displayPosition?.latitude ?? ''}
            />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Longitude</p>
            <Input
              ref={manualLongitudeInputRef}
              inputMode="decimal"
              placeholder="e.g. 27.921"
              className="h-9 border-slate-200 bg-white text-sm font-semibold text-slate-900"
              defaultValue={locationCalibration?.longitude ?? displayPosition?.longitude ?? ''}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 self-end rounded-full border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={handleApplyManualCalibration}
          >
            Apply
          </Button>
        </div>
      </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl">
        {isMapZoomCardOpen ? (
          <div className="pointer-events-auto absolute left-3 top-3 z-[1000] w-[320px] max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 bg-white/95 p-3 text-[10px] shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Map Zoom</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
                  Zoom {currentZoom} • decide what to load
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                onClick={() => onMapZoomCardOpenChange?.(false)}
              >
                Hide card
              </button>
            </div>
            <div className="mt-3 grid gap-3">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">Min Zoom Level</p>
                <Select
                  value={`${minVisibleZoom}`}
                  onValueChange={(value) => {
                    const nextMin = Number(value);
                    setMinVisibleZoom(nextMin);
                    if (nextMin > maxVisibleZoom) {
                      setMaxVisibleZoom(nextMin);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-[10px] font-black uppercase">
                    <SelectValue placeholder="Select min zoom" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ZOOM_LEVELS.map((zoomLevel) => (
                      <SelectItem key={`active-flight-min-${zoomLevel}`} value={`${zoomLevel}`}>
                        {zoomLevel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">Max Zoom Level</p>
                <Select
                  value={`${maxVisibleZoom}`}
                  onValueChange={(value) => {
                    const nextMax = Number(value);
                    setMaxVisibleZoom(nextMax);
                    if (nextMax < minVisibleZoom) {
                      setMinVisibleZoom(nextMax);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-[10px] font-black uppercase">
                    <SelectValue placeholder="Select max zoom" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ZOOM_LEVELS.map((zoomLevel) => (
                      <SelectItem key={`active-flight-max-${zoomLevel}`} value={`${zoomLevel}`}>
                        {zoomLevel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : null}

        {isLayersCardOpen ? (
          <div className="pointer-events-auto absolute right-3 top-3 z-[1000] w-[320px] max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 bg-white/95 p-3 text-[10px] shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Map Layers</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
                  Show and hide visible map layers
                </p>
                <p className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-700">
                  OpenAIP {useVectorOpenAipLayers ? 'Vector' : 'Fallback'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                onClick={() => onLayersCardOpenChange?.(false)}
              >
                Hide card
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Labels', active: showLabels, setActive: setShowLabels },
                { label: 'Master Chart', active: showMasterChart, setActive: setShowMasterChart },
                { label: 'Airports', active: showAirports, setActive: setShowAirports },
                { label: 'Navaids', active: showNavaids, setActive: setShowNavaids },
                { label: 'Reporting Points', active: showReportingPoints, setActive: setShowReportingPoints },
                { label: 'Airspaces', active: showAirspaces, setActive: setShowAirspaces },
                { label: 'Class E', active: showClassE, setActive: setShowClassE },
                { label: 'Class F', active: showClassF, setActive: setShowClassF },
                { label: 'Class G', active: showClassG, setActive: setShowClassG },
                { label: 'Military Areas', active: showMilitaryAreas, setActive: setShowMilitaryAreas },
                { label: 'Training Areas', active: showTrainingAreas, setActive: setShowTrainingAreas },
                { label: 'Gliding Sectors', active: showGlidingSectors, setActive: setShowGlidingSectors },
                { label: 'Hang Glidings', active: showHangGlidings, setActive: setShowHangGlidings },
                { label: 'Obstacles', active: showObstacles, setActive: setShowObstacles },
                { label: 'Active Only', active: showOnlyActiveAirspace, setActive: setShowOnlyActiveAirspace },
                { label: 'Route', active: showRouteLine, setActive: setShowRouteLine },
                { label: 'Waypoints', active: showWaypointMarkers, setActive: setShowWaypointMarkers },
                { label: 'Track', active: showTrackLine, setActive: setShowTrackLine },
              ].map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="outline"
                  className={`h-9 justify-start px-3 text-[10px] font-black uppercase ${
                    item.active
                      ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => item.setActive(!item.active)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="nose-up-map relative h-full min-h-[360px] flex-1">
          <ActiveFlightMapLibreShell
            className="h-full w-full rounded-2xl"
            center={center}
            position={displayPosition}
            routePoints={routePoints}
            trackHistory={trackHistory}
            legs={legs}
            followOwnship={followOwnship}
            recenterSignal={recenterNonce}
            minZoom={minVisibleZoom}
            maxZoom={maxVisibleZoom}
            showRouteLine={showRouteLine}
            showWaypointMarkers={showWaypointMarkers}
            showTrackLine={showTrackLine}
            showLabels={showLabels}
            showMasterChart={showMasterChart}
            showAirports={showAirports}
            showNavaids={showNavaids}
            showReportingPoints={showReportingPoints}
            showAirspaces={showAirspaces}
            showClassE={showClassE}
            showClassF={showClassF}
            showClassG={showClassG}
            showMilitaryAreas={showMilitaryAreas}
            showTrainingAreas={showTrainingAreas}
            showGlidingSectors={showGlidingSectors}
            showHangGlidings={showHangGlidings}
            showObstacles={showObstacles}
            showOnlyActiveAirspace={showOnlyActiveAirspace}
            airportFeatures={airportFeatures}
            navaidFeatures={navaidFeatures}
            reportingPointFeatures={reportingPointFeatures}
            airspaceCollections={airspaceCollections}
            obstacleGeoJson={obstacleGeoJson}
            onZoomChange={setCurrentZoom}
            onCenterChange={(nextCenter) => setMapCenter(nextCenter)}
            onUserInteracted={() => setFollowOwnship(false)}
          />
        </div>
        <style jsx>{`
          .nose-up-map {
            transform: rotate(var(--map-rotation)) scale(1.38);
            transform-origin: 50% 50%;
            transition: transform 180ms ease-out;
          }

          .nose-up-map :global(.leaflet-top),
          .nose-up-map :global(.leaflet-bottom) {
            transform: rotate(var(--map-counter-rotation));
            transform-origin: center;
          }

          .nose-up-map :global(.active-flight-map-label),
          .nose-up-map :global(.active-flight-map-airspace-label) {
            margin: 0 !important;
            padding: 0 !important;
          }

          .nose-up-map :global(.active-flight-map-label .leaflet-tooltip-content),
          .nose-up-map :global(.active-flight-map-airspace-label .leaflet-tooltip-content) {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1 !important;
          }

          .nose-up-map :global(.active-flight-map-label:before),
          .nose-up-map :global(.active-flight-map-airspace-label:before) {
            display: none !important;
          }
        `}</style>
      </div>
    </div>
  );
}
