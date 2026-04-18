'use client';

import { type CSSProperties, type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Pane, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers3, Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FullScreenFlightLayout } from '@/components/active-flight/full-screen-flight-layout';
import { LeafletMapFrame } from '@/components/maps/leaflet-map-frame';
import { useMapZoomPreferences } from '@/hooks/use-map-zoom-preferences';
import { useMapZoomDraft } from '@/hooks/use-map-zoom-draft';
import type { Booking, NavlogLeg } from '@/types/booking';
import type { ActiveLegState, FlightPosition } from '@/types/flight-session';
import { cn } from '@/lib/utils';

const WaypointIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#10b981;border:2px solid #fff;box-shadow:0 0 0 2px rgba(16,185,129,0.28);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const OPENAIP_PANE_STYLE = { zIndex: 325 } as const;
const OPENAIP_POINT_PANE_STYLE = { zIndex: 560 } as const;
const OPENAIP_LABEL_PANE_STYLE = { zIndex: 650 } as const;

type OpenAipPointFeature = {
  _id: string;
  name: string;
  icaoCode?: string;
  identifier?: string;
  geometry?: {
    coordinates?: [number, number];
  };
  sourceLayer: 'airports' | 'navaids' | 'reporting-points';
};

const airportPointIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;border-radius:9999px;background:#2563eb;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(37,99,235,0.22);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const navaidPointIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;clip-path:polygon(25% 6%,75% 6%,100% 50%,75% 94%,25% 94%,0 50%);background:#7c3aed;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(124,58,237,0.18);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const reportingPointIcon = L.divIcon({
  className: '',
  html: '<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid #f59e0b;filter:drop-shadow(0 0 2px rgba(245,158,11,0.35));"></div>',
  iconSize: [14, 12],
  iconAnchor: [7, 10],
});

const openAipLabelClassName = 'openaip-layer-label';

async function fetchOpenAipJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

const createAircraftMarkerIcon = (label: string, headingTrue?: number | null) =>
  L.divIcon({
    className: '',
    html: `
      <div style="display:flex;align-items:center;gap:8px;transform:translate(-8px,-8px);">
        <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:18px solid #0ea5e9;transform:rotate(${headingTrue ?? 0}deg);transform-origin:center 70%;filter:drop-shadow(0 0 6px rgba(14,165,233,0.35));"></div>
        </div>
        <div style="padding:4px 8px;border-radius:9999px;background:rgba(15,23,42,0.92);color:#f8fafc;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;border:1px solid rgba(148,163,184,0.35);white-space:nowrap;">
          ${label}
        </div>
      </div>
    `,
    iconSize: [128, 36],
    iconAnchor: [20, 20],
  });

function FitFlightBounds({
  routePoints,
  position,
  followOwnship,
}: {
  routePoints: [number, number][];
  position: FlightPosition | null;
  followOwnship: boolean;
}) {
  const map = useMap();
  const lastFrameSignatureRef = useRef('');

  useEffect(() => {
    if (routePoints.length > 0) {
      const routeSignature = routePoints.map(([latitude, longitude]) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`).join('|');
      if (routeSignature === lastFrameSignatureRef.current) return;
      lastFrameSignatureRef.current = routeSignature;

      if (routePoints.length === 1) {
        map.setView(routePoints[0], 11, { animate: false });
        return;
      }

      map.fitBounds(L.latLngBounds(routePoints).pad(0.25), { animate: false });
      return;
    }

    if (!position || !followOwnship) return;

    const nextSignature = `${position.latitude.toFixed(6)},${position.longitude.toFixed(6)}`;
    if (lastFrameSignatureRef.current === nextSignature) return;
    lastFrameSignatureRef.current = nextSignature;
    map.setView([position.latitude, position.longitude], map.getZoom(), { animate: false });
  }, [followOwnship, map, position, routePoints]);

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
  centreMapNonce,
}: {
  position: FlightPosition | null;
  centreMapNonce: number;
}) {
  const map = useMap();
  const lastHandledNonceRef = useRef(0);

  useEffect(() => {
    if (centreMapNonce === 0 || centreMapNonce === lastHandledNonceRef.current) return;

    lastHandledNonceRef.current = centreMapNonce;

    if (position) {
      map.setView([position.latitude, position.longitude], map.getZoom(), { animate: false });
    }
  }, [centreMapNonce, map, position]);

  return null;
}

function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frameId = 0;
    let timeoutId: number | null = null;
    let lastWidth = container.clientWidth;
    let lastHeight = container.clientHeight;

    const invalidateIfSizeChanged = () => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;

      if (nextWidth === 0 || nextHeight === 0) return;
      if (nextWidth === lastWidth && nextHeight === lastHeight) return;

      lastWidth = nextWidth;
      lastHeight = nextHeight;
      map.invalidateSize(false);
    };

    const scheduleRefresh = () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        frameId = window.requestAnimationFrame(() => {
          invalidateIfSizeChanged();
        });
      }, 80);
    };

    frameId = window.requestAnimationFrame(() => {
      lastWidth = 0;
      lastHeight = 0;
      invalidateIfSizeChanged();
    });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleRefresh();
          })
        : null;
    resizeObserver?.observe(container);

    window.addEventListener('resize', scheduleRefresh);
    window.addEventListener('orientationchange', scheduleRefresh);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleRefresh);
      window.removeEventListener('orientationchange', scheduleRefresh);
    };
  }, [map]);

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

function VisiblePointLoader({
  airportsEnabled,
  navaidsEnabled,
  reportingEnabled,
  onFeaturesLoaded,
}: {
  airportsEnabled: boolean;
  navaidsEnabled: boolean;
  reportingEnabled: boolean;
  onFeaturesLoaded: (features: OpenAipPointFeature[]) => void;
}) {
  const map = useMap();
  const requestSeq = useRef(0);
  const lastRequestKeyRef = useRef('');

  const activeResources = useMemo(() => {
    const resources: OpenAipPointFeature['sourceLayer'][] = [];
    if (airportsEnabled) resources.push('airports');
    if (navaidsEnabled) resources.push('navaids');
    if (reportingEnabled) resources.push('reporting-points');
    return resources;
  }, [airportsEnabled, navaidsEnabled, reportingEnabled]);

  const loadVisiblePoints = useCallback(async () => {
    if (activeResources.length === 0) {
      onFeaturesLoaded([]);
      return;
    }

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

    const responses = await Promise.all(
      activeResources.map(async (resource) => {
        const data = await fetchOpenAipJson<{ items?: unknown[] }>(`/api/openaip?resource=${resource}&bbox=${bbox}`);
        return (data?.items || []).map((item: any) => ({ ...item, sourceLayer: resource })) as OpenAipPointFeature[];
      })
    );

    if (nextSeq !== requestSeq.current) return;
    onFeaturesLoaded(responses.flat());
  }, [activeResources, map, onFeaturesLoaded]);

  useEffect(() => {
    void loadVisiblePoints();
  }, [loadVisiblePoints]);

  useMapEvents({
    moveend() {
      void loadVisiblePoints();
    },
    zoomend() {
      void loadVisiblePoints();
    },
  });

  return null;
}

function ActiveFlightOpenAipLayers({
  mapMinZoom,
  mapMaxZoom,
  showOpenAipChart,
  airportsVisible,
  airportLabelsVisible,
  navaidsVisible,
  navaidLabelsVisible,
  reportingVisible,
  reportingLabelsVisible,
  mapZoom,
  onMapZoomChange,
  viewportFeatures,
  onViewportFeaturesLoaded,
}: {
  mapMinZoom: number;
  mapMaxZoom: number;
  showOpenAipChart: boolean;
  airportsVisible: boolean;
  airportLabelsVisible: boolean;
  navaidsVisible: boolean;
  navaidLabelsVisible: boolean;
  reportingVisible: boolean;
  reportingLabelsVisible: boolean;
  mapZoom: number;
  onMapZoomChange: (zoom: number) => void;
  viewportFeatures: OpenAipPointFeature[];
  onViewportFeaturesLoaded: (features: OpenAipPointFeature[]) => void;
}) {
  const airportFeatures = useMemo(
    () => viewportFeatures.filter((feature) => feature.sourceLayer === 'airports'),
    [viewportFeatures]
  );
  const navaidFeatures = useMemo(
    () => viewportFeatures.filter((feature) => feature.sourceLayer === 'navaids'),
    [viewportFeatures]
  );
  const reportingPointFeatures = useMemo(
    () => viewportFeatures.filter((feature) => feature.sourceLayer === 'reporting-points'),
    [viewportFeatures]
  );

  return (
    <>
      <MapZoomState onZoomChange={onMapZoomChange} />
      <VisiblePointLoader
        airportsEnabled={airportsVisible}
        navaidsEnabled={navaidsVisible}
        reportingEnabled={reportingVisible}
        onFeaturesLoaded={onViewportFeaturesLoaded}
      />
      {showOpenAipChart ? (
        <Pane name="active-flight-openaip" style={OPENAIP_PANE_STYLE}>
          <TileLayer
            pane="active-flight-openaip"
            url="/api/openaip/tiles/openaip/{z}/{x}/{y}"
            attribution="&copy; OpenAIP"
            opacity={1}
            minZoom={Math.max(mapMinZoom, 8)}
            minNativeZoom={8}
            maxNativeZoom={16}
            maxZoom={Math.min(mapMaxZoom, 20)}
          />
        </Pane>
      ) : null}
      <Pane name="active-flight-openaip-points" style={OPENAIP_POINT_PANE_STYLE} />
      <Pane name="active-flight-openaip-labels" style={OPENAIP_LABEL_PANE_STYLE} />

      {airportsVisible && mapZoom >= 8
        ? airportFeatures.map((feature) => {
            const coords = feature.geometry?.coordinates;
            if (!coords) return null;
            const [lon, lat] = coords;
            const identifier = feature.icaoCode || feature.identifier || feature.name;
            return (
              <Marker key={feature._id} position={[lat, lon]} icon={airportPointIcon} pane="active-flight-openaip-points">
                {airportLabelsVisible && mapZoom >= 9 ? (
                  <Tooltip
                    permanent
                    pane="active-flight-openaip-labels"
                    direction="top"
                    offset={[0, -6]}
                    opacity={0.95}
                    className={openAipLabelClassName}
                  >
                    {identifier}
                  </Tooltip>
                ) : null}
              </Marker>
            );
          })
        : null}

      {navaidsVisible && mapZoom >= 9
        ? navaidFeatures.map((feature) => {
            const coords = feature.geometry?.coordinates;
            if (!coords) return null;
            const [lon, lat] = coords;
            const identifier = feature.icaoCode || feature.identifier || feature.name;
            return (
              <Marker key={feature._id} position={[lat, lon]} icon={navaidPointIcon} pane="active-flight-openaip-points">
                {navaidLabelsVisible && mapZoom >= 10 ? (
                  <Tooltip
                    permanent
                    pane="active-flight-openaip-labels"
                    direction="top"
                    offset={[0, -6]}
                    opacity={0.95}
                    className={openAipLabelClassName}
                  >
                    {identifier}
                  </Tooltip>
                ) : null}
              </Marker>
            );
          })
        : null}

      {reportingVisible && mapZoom >= 10
        ? reportingPointFeatures.map((feature) => {
            const coords = feature.geometry?.coordinates;
            if (!coords) return null;
            const [lon, lat] = coords;
            const identifier = feature.icaoCode || feature.identifier || feature.name;
            return (
              <Marker key={feature._id} position={[lat, lon]} icon={reportingPointIcon} pane="active-flight-openaip-points">
                {reportingLabelsVisible && mapZoom >= 11 ? (
                  <Tooltip
                    permanent
                    pane="active-flight-openaip-labels"
                    direction="top"
                    offset={[0, -6]}
                    opacity={0.95}
                    className={openAipLabelClassName}
                  >
                    {identifier}
                  </Tooltip>
                ) : null}
              </Marker>
            );
          })
        : null}
    </>
  );
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
    const knownTiles = readOfflineTileManifest();
    const nextTileUrls = tileUrls.filter((url) => !knownTiles.has(url));
    if (!nextTileUrls.length) return 0;

    const warmedTileUrls: string[] = [];
    const batchSize = 12;

    for (let index = 0; index < nextTileUrls.length; index += batchSize) {
      const batch = nextTileUrls.slice(index, index + batchSize);
      const results = await Promise.allSettled(
        batch.map((url) =>
          fetch(url, { mode: 'no-cors' })
            .then(() => url)
            .catch(() => null)
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          warmedTileUrls.push(result.value);
        }
      }
    }

    if (warmedTileUrls.length) {
      writeOfflineTileManifest([...knownTiles, ...warmedTileUrls]);
    }

    return warmedTileUrls.length;
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

        onStatus(`Checking ${tileUrls.length} tiles for local reuse...`);
        const warmedTileCount = await warmTileUrls(tileUrls);

        onStatus(
          warmedTileCount > 0
            ? `Cached ${warmedTileCount} new tiles for offline reuse.`
            : 'Current view already warmed on this device.'
        );
        onComplete(warmedTileCount > 0 ? warmedTileCount : tileUrls.length);
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

        onAreaDownloadStatus(`Checking ${tileUrls.length} area tiles for local reuse...`);
        const warmedTileCount = await warmTileUrls(tileUrls);
        onAreaDownloadStatus(
          warmedTileCount > 0
            ? `Area warmed with ${warmedTileCount} new tiles on this device.`
            : 'Area tiles already warmed on this device.'
        );
        onAreaDownloadComplete(warmedTileCount > 0 ? warmedTileCount : tileUrls.length);
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

        onRouteDownloadStatus(`Checking ${tileUrls.length} route tiles for local reuse...`);
        const warmedTileCount = await warmTileUrls(tileUrls);
        onRouteDownloadStatus(
          warmedTileCount > 0
            ? `Route corridor warmed with ${warmedTileCount} new tiles on this device.`
            : 'Route corridor tiles already warmed on this device.'
        );
        onRouteDownloadComplete(warmedTileCount > 0 ? warmedTileCount : tileUrls.length);
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
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Track</p>
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
const OFFLINE_TILE_MANIFEST_KEY = 'safeviate-tile-manifest-v1';
const FALLBACK_MAP_MIN_ZOOM = 6;
const FALLBACK_MAP_MAX_ZOOM = 14;
const MAP_MIN_ZOOM = FALLBACK_MAP_MIN_ZOOM;
const MAP_MAX_ZOOM = FALLBACK_MAP_MAX_ZOOM;

function readOfflineTileManifest() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(OFFLINE_TILE_MANIFEST_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set<string>();
  }
}

function writeOfflineTileManifest(tileUrls: Iterable<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_TILE_MANIFEST_KEY, JSON.stringify(Array.from(new Set(tileUrls))));
  } catch {
    // Ignore browser storage failures and keep warmed browser cache behavior.
  }
}

async function readOfflineTileSummary() {
  if (typeof window === 'undefined') {
    return {
      cacheCount: 0,
      tileCount: 0,
      usageLabel: 'Browser cache details unavailable on this device.',
    };
  }

  const tileManifest = readOfflineTileManifest();
  const tileCount = tileManifest.size;
  const cacheCount = tileCount > 0 ? 1 : 0;

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
    cacheCount,
    tileCount,
    usageLabel: tileCount > 0 ? `${usageLabel} Tile manifest tracks ${tileCount} warmed tiles for this browser.` : usageLabel,
  };
}

async function clearOfflineTileCaches() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(OFFLINE_TILE_MANIFEST_KEY);
    } catch {
      // Ignore browser storage failures and still attempt any cache cleanup below.
    }
  }
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
  compactLayout = false,
  followOwnship,
  onFollowOwnshipChange,
  centreMapNonce,
  layerSelectorOpen,
  layerLevelsOpen,
  onLayerSelectorOpenChange,
  onLayerLevelsOpenChange,
  airportsVisible: airportsVisibleProp,
  onAirportsVisibleChange,
  airportLabelsVisible: airportLabelsVisibleProp,
  onAirportLabelsVisibleChange,
  navaidsVisible: navaidsVisibleProp,
  onNavaidsVisibleChange,
  navaidLabelsVisible: navaidLabelsVisibleProp,
  onNavaidLabelsVisibleChange,
}: {
  booking: Booking | null;
  legs: NavlogLeg[];
  position: FlightPosition | null;
  aircraftRegistration?: string;
  activeLegIndex?: number;
  activeLegState?: ActiveLegState | null;
  fullscreen?: boolean;
  compactLayout?: boolean;
  followOwnship: boolean;
  onFollowOwnshipChange: (followOwnship: boolean) => void;
  centreMapNonce: number;
  layerSelectorOpen?: boolean;
  layerLevelsOpen?: boolean;
  onLayerSelectorOpenChange?: (open: boolean) => void;
  onLayerLevelsOpenChange?: (open: boolean) => void;
  airportsVisible?: boolean;
  onAirportsVisibleChange?: (open: boolean) => void;
  airportLabelsVisible?: boolean;
  onAirportLabelsVisibleChange?: (open: boolean) => void;
  navaidsVisible?: boolean;
  onNavaidsVisibleChange?: (open: boolean) => void;
  navaidLabelsVisible?: boolean;
  onNavaidLabelsVisibleChange?: (open: boolean) => void;
}) {
  const { preferences: zoomPreferences, setZoomRange, saveZoomRange, resetZoomRange } = useMapZoomPreferences({
    storageKey: 'safeviate.active-flight-map-zoom',
    defaultMinZoom: FALLBACK_MAP_MIN_ZOOM,
    defaultMaxZoom: FALLBACK_MAP_MAX_ZOOM,
  });
  const mapMinZoom = zoomPreferences.minZoom;
  const mapMaxZoom = zoomPreferences.maxZoom;
  const {
    draftMin: zoomDraftMin,
    draftMax: zoomDraftMax,
    setDraftMin: setZoomDraftMin,
    setDraftMax: setZoomDraftMax,
    saveDrafts: saveZoomDrafts,
  } = useMapZoomDraft({
    minZoom: mapMinZoom,
    maxZoom: mapMaxZoom,
    setZoomRange,
    saveZoomRange,
  });

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
  const [cacheNonce, setCacheNonce] = useState(0);
  const [cacheStatus, setCacheStatus] = useState('Ready to cache current view.');
  const [cacheState, setCacheState] = useState<'idle' | 'caching' | 'complete'>('idle');
  const [isCachingArea, setIsCachingArea] = useState(false);
  const [areaDownloadNonce, setAreaDownloadNonce] = useState(0);
  const [areaDownloadStatus, setAreaDownloadStatus] = useState('Download a larger area on this device.');
  const [areaDownloadState, setAreaDownloadState] = useState<'idle' | 'downloading' | 'complete'>('idle');
  const [isDownloadingArea, setIsDownloadingArea] = useState(false);
  const [routeDownloadNonce, setRouteDownloadNonce] = useState(0);
  const flightCacheLabel = booking?.bookingNumber ? `flight #${booking.bookingNumber}` : 'selected flight';
  const [routeDownloadStatus, setRouteDownloadStatus] = useState(
    routePoints.length > 1 ? `Cache ${flightCacheLabel} route on this device.` : 'Load a flight route to cache it on this device.'
  );
  const [routeDownloadState, setRouteDownloadState] = useState<'idle' | 'downloading' | 'complete'>('idle');
  const [isDownloadingRoute, setIsDownloadingRoute] = useState(false);
  const [offlineManagerOpen, setOfflineManagerOpen] = useState(false);
  const [offlineTileCount, setOfflineTileCount] = useState(0);
  const [offlineCacheCount, setOfflineCacheCount] = useState(0);
  const [offlineUsageLabel, setOfflineUsageLabel] = useState('Checking browser storage on this device...');
  const [isRefreshingOfflineSummary, setIsRefreshingOfflineSummary] = useState(false);
  const [isClearingOfflineMaps, setIsClearingOfflineMaps] = useState(false);
  const [compactFullscreenOpen, setCompactFullscreenOpen] = useState(false);
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<'light' | 'satellite'>('light');
  const [showOpenAipChart, setShowOpenAipChart] = useState(true);
  const [internalAirportsVisible, setInternalAirportsVisible] = useState(true);
  const [internalAirportLabelsVisible, setInternalAirportLabelsVisible] = useState(true);
  const [internalNavaidsVisible, setInternalNavaidsVisible] = useState(true);
  const [internalNavaidLabelsVisible, setInternalNavaidLabelsVisible] = useState(true);
  const [reportingVisible, setReportingVisible] = useState(true);
  const [reportingLabelsVisible, setReportingLabelsVisible] = useState(true);
  const [airspacesVisible, setAirspacesVisible] = useState(true);
  const [airspaceLabelsVisible, setAirspaceLabelsVisible] = useState(false);
  const [classEVisible, setClassEVisible] = useState(false);
  const [classELabelsVisible, setClassELabelsVisible] = useState(false);
  const [classFVisible, setClassFVisible] = useState(false);
  const [classFLabelsVisible, setClassFLabelsVisible] = useState(false);
  const [classGVisible, setClassGVisible] = useState(true);
  const [classGLabelsVisible, setClassGLabelsVisible] = useState(false);
  const [militaryAreasVisible, setMilitaryAreasVisible] = useState(false);
  const [militaryLabelsVisible, setMilitaryLabelsVisible] = useState(false);
  const [trainingAreasVisible, setTrainingAreasVisible] = useState(false);
  const [trainingLabelsVisible, setTrainingLabelsVisible] = useState(false);
  const [glidingSectorsVisible, setGlidingSectorsVisible] = useState(false);
  const [glidingLabelsVisible, setGlidingLabelsVisible] = useState(false);
  const [hangGlidingVisible, setHangGlidingVisible] = useState(false);
  const [hangGlidingLabelsVisible, setHangGlidingLabelsVisible] = useState(false);
  const [obstaclesVisible, setObstaclesVisible] = useState(true);
  const [obstacleLabelsVisible, setObstacleLabelsVisible] = useState(false);
  const [mapZoom, setMapZoom] = useState(8);
  const [viewportFeatures, setViewportFeatures] = useState<OpenAipPointFeature[]>([]);
  const [showLayerSelectorPanel, setShowLayerSelectorPanel] = useState(false);
  const [showLayerLevelsPanel, setShowLayerLevelsPanel] = useState(false);
  const layerSelectorPanelOpen = layerSelectorOpen ?? showLayerSelectorPanel;
  const layerLevelsPanelOpen = layerLevelsOpen ?? showLayerLevelsPanel;
  const airportsVisible = airportsVisibleProp ?? internalAirportsVisible;
  const setAirportsVisible = onAirportsVisibleChange ?? setInternalAirportsVisible;
  const airportLabelsVisible = airportLabelsVisibleProp ?? internalAirportLabelsVisible;
  const setAirportLabelsVisible = onAirportLabelsVisibleChange ?? setInternalAirportLabelsVisible;
  const navaidsVisible = navaidsVisibleProp ?? internalNavaidsVisible;
  const setNavaidsVisible = onNavaidsVisibleChange ?? setInternalNavaidsVisible;
  const navaidLabelsVisible = navaidLabelsVisibleProp ?? internalNavaidLabelsVisible;
  const setNavaidLabelsVisible = onNavaidLabelsVisibleChange ?? setInternalNavaidLabelsVisible;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('safeviate.active-flight-map-layer');
      if (stored === 'light' || stored === 'satellite') {
        setSelectedBaseLayer(stored);
      }

      const storedOpenAip = window.localStorage.getItem('safeviate.active-flight-map-openaip-chart');
      if (storedOpenAip === 'true' || storedOpenAip === 'false') {
        setShowOpenAipChart(storedOpenAip === 'true');
      }

      const storedAirports = window.localStorage.getItem('safeviate.active-flight-map-airports');
      if (storedAirports === 'true' || storedAirports === 'false') {
        setAirportsVisible(storedAirports === 'true');
      }

      const storedAirportLabels = window.localStorage.getItem('safeviate.active-flight-map-airport-labels');
      if (storedAirportLabels === 'true' || storedAirportLabels === 'false') {
        setAirportLabelsVisible(storedAirportLabels === 'true');
      }

      const storedNavaids = window.localStorage.getItem('safeviate.active-flight-map-navaids');
      if (storedNavaids === 'true' || storedNavaids === 'false') {
        setNavaidsVisible(storedNavaids === 'true');
      }

      const storedNavaidLabels = window.localStorage.getItem('safeviate.active-flight-map-navaid-labels');
      if (storedNavaidLabels === 'true' || storedNavaidLabels === 'false') {
        setNavaidLabelsVisible(storedNavaidLabels === 'true');
      }

      const storedReporting = window.localStorage.getItem('safeviate.active-flight-map-reporting');
      if (storedReporting === 'true' || storedReporting === 'false') {
        setReportingVisible(storedReporting === 'true');
      }

      const storedReportingLabels = window.localStorage.getItem('safeviate.active-flight-map-reporting-labels');
      if (storedReportingLabels === 'true' || storedReportingLabels === 'false') {
        setReportingLabelsVisible(storedReportingLabels === 'true');
      }

      const booleanKeys: Array<[string, Dispatch<SetStateAction<boolean>>]> = [
        ['safeviate.active-flight-map-airspaces', setAirspacesVisible],
        ['safeviate.active-flight-map-airspace-labels', setAirspaceLabelsVisible],
        ['safeviate.active-flight-map-class-e', setClassEVisible],
        ['safeviate.active-flight-map-class-e-labels', setClassELabelsVisible],
        ['safeviate.active-flight-map-class-f', setClassFVisible],
        ['safeviate.active-flight-map-class-f-labels', setClassFLabelsVisible],
        ['safeviate.active-flight-map-class-g', setClassGVisible],
        ['safeviate.active-flight-map-class-g-labels', setClassGLabelsVisible],
        ['safeviate.active-flight-map-military', setMilitaryAreasVisible],
        ['safeviate.active-flight-map-military-labels', setMilitaryLabelsVisible],
        ['safeviate.active-flight-map-training', setTrainingAreasVisible],
        ['safeviate.active-flight-map-training-labels', setTrainingLabelsVisible],
        ['safeviate.active-flight-map-gliding', setGlidingSectorsVisible],
        ['safeviate.active-flight-map-gliding-labels', setGlidingLabelsVisible],
        ['safeviate.active-flight-map-hang-gliding', setHangGlidingVisible],
        ['safeviate.active-flight-map-hang-gliding-labels', setHangGlidingLabelsVisible],
        ['safeviate.active-flight-map-obstacles', setObstaclesVisible],
        ['safeviate.active-flight-map-obstacle-labels', setObstacleLabelsVisible],
      ];

      for (const [key, setter] of booleanKeys) {
        const stored = window.localStorage.getItem(key);
        if (stored === 'true' || stored === 'false') {
          setter(stored === 'true');
        }
      }
    } catch {
      // keep default
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('safeviate.active-flight-map-layer', selectedBaseLayer);
    } catch {
      // ignore storage failures
    }
  }, [selectedBaseLayer]);

  useEffect(() => {
    try {
      window.localStorage.setItem('safeviate.active-flight-map-openaip-chart', String(showOpenAipChart));
    } catch {
      // ignore storage failures
    }
  }, [showOpenAipChart]);

  useEffect(() => {
    try {
      window.localStorage.setItem('safeviate.active-flight-map-airports', String(airportsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-airport-labels', String(airportLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-navaids', String(navaidsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-navaid-labels', String(navaidLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-reporting', String(reportingVisible));
      window.localStorage.setItem('safeviate.active-flight-map-reporting-labels', String(reportingLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-airspaces', String(airspacesVisible));
      window.localStorage.setItem('safeviate.active-flight-map-airspace-labels', String(airspaceLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-class-e', String(classEVisible));
      window.localStorage.setItem('safeviate.active-flight-map-class-e-labels', String(classELabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-class-f', String(classFVisible));
      window.localStorage.setItem('safeviate.active-flight-map-class-f-labels', String(classFLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-class-g', String(classGVisible));
      window.localStorage.setItem('safeviate.active-flight-map-class-g-labels', String(classGLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-military', String(militaryAreasVisible));
      window.localStorage.setItem('safeviate.active-flight-map-military-labels', String(militaryLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-training', String(trainingAreasVisible));
      window.localStorage.setItem('safeviate.active-flight-map-training-labels', String(trainingLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-gliding', String(glidingSectorsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-gliding-labels', String(glidingLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-hang-gliding', String(hangGlidingVisible));
      window.localStorage.setItem('safeviate.active-flight-map-hang-gliding-labels', String(hangGlidingLabelsVisible));
      window.localStorage.setItem('safeviate.active-flight-map-obstacles', String(obstaclesVisible));
      window.localStorage.setItem('safeviate.active-flight-map-obstacle-labels', String(obstacleLabelsVisible));
    } catch {
      // ignore storage failures
    }
  }, [
    airportsVisible,
    airportLabelsVisible,
    navaidsVisible,
    navaidLabelsVisible,
    reportingVisible,
    reportingLabelsVisible,
    airspacesVisible,
    airspaceLabelsVisible,
    classEVisible,
    classELabelsVisible,
    classFVisible,
    classFLabelsVisible,
    classGVisible,
    classGLabelsVisible,
    militaryAreasVisible,
    militaryLabelsVisible,
    trainingAreasVisible,
    trainingLabelsVisible,
    glidingSectorsVisible,
    glidingLabelsVisible,
    hangGlidingVisible,
    hangGlidingLabelsVisible,
    obstaclesVisible,
    obstacleLabelsVisible,
  ]);

  useEffect(() => {
    setRouteDownloadStatus(
      routePoints.length > 1 ? `Cache ${flightCacheLabel} route on this device.` : 'Load a flight route to cache it on this device.'
    );
    if (routePoints.length <= 1 && routeDownloadState !== 'downloading') {
      setRouteDownloadState('idle');
    }
  }, [flightCacheLabel, routeDownloadState, routePoints.length]);

  useEffect(() => {
    setTrackHistory(position ? [[position.latitude, position.longitude]] : []);
  }, [aircraftRegistration, booking?.id, routeSignature]);

  useEffect(() => {
    if (!position) return;

    setTrackHistory((current) => {
      const nextPoint: [number, number] = [position.latitude, position.longitude];
      const lastPoint = current[current.length - 1];

      if (lastPoint && lastPoint[0] === nextPoint[0] && lastPoint[1] === nextPoint[1]) {
        return current;
      }

      const nextHistory = [...current, nextPoint];
      return nextHistory.slice(-40);
    });
  }, [position]);

  const center = position
    ? ([position.latitude, position.longitude] as [number, number])
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
  const mapRotationDegrees = followOwnship && normalizedHeading != null ? -normalizedHeading : 0;
  const mapShellStyle = {
    '--map-rotation': `${mapRotationDegrees}deg`,
    '--map-counter-rotation': `${-mapRotationDegrees}deg`,
  } as CSSProperties;
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

  const handleClearOpenAipCache = () => {
    setCacheStatus('Cache cleared.');
  };

  if (fullscreen) {
    return (
      <div
        className="fullscreen-map-shell relative h-[100dvh] w-full min-h-0 overflow-hidden bg-black pointer-events-none"
        style={{ ...mapShellStyle, overscrollBehavior: 'none' }}
      >
        <div className="pointer-events-auto absolute inset-x-3 top-3 z-[1000] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-[0_16px_36px_rgba(15,23,42,0.18)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Full Flight Tracking View</p>
            <MenuCloseButton />
          </div>
          <table className="w-full table-fixed border-collapse text-left">
            <tbody>
              <tr className="border-b border-slate-200">
                <th className="w-1/3 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">TRK</th>
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
            Mode: {followOwnship ? 'Nose Up' : 'North Up'}
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
                  setCacheStatus('Warming cache for current view...');
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
                  setRouteDownloadStatus(`Caching ${flightCacheLabel} route on this device...`);
                  setRouteDownloadNonce((current) => current + 1);
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('inline-flex h-3 w-3 shrink-0 items-center justify-center', isDownloadingRoute ? 'opacity-100' : 'opacity-0')}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </span>
                  <span>Cache Flight</span>
                </span>
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
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Offline cache: {cacheStatus}
                  </p>
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
                      Use <span className="font-black text-slate-900">Cache View</span> for a quick nearby area, <span className="font-black text-slate-900">Download Area</span> for a broader region, and <span className="font-black text-slate-900">Cache Flight</span> for the selected flight corridor on this same device.
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
                              setCacheStatus('Ready to cache current view.');
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

        <div className="pointer-events-auto absolute inset-0 overflow-hidden">
          <div className="nose-up-map pointer-events-auto absolute inset-[-24%]">
          <LeafletMapFrame
            center={center}
            zoom={8}
            minZoom={mapMinZoom}
            maxZoom={mapMaxZoom}
            zoomAnimation={false}
            className="h-full w-full rounded-none"
            style={{ background: '#000000', touchAction: 'none', overscrollBehavior: 'none' }}
          >
            {selectedBaseLayer === 'satellite' ? (
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
              />
            ) : (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
            )}
            <ActiveFlightOpenAipLayers
              mapMinZoom={mapMinZoom}
              mapMaxZoom={mapMaxZoom}
              showOpenAipChart={showOpenAipChart}
              airportsVisible={airportsVisible}
              airportLabelsVisible={airportLabelsVisible}
              navaidsVisible={navaidsVisible}
              navaidLabelsVisible={navaidLabelsVisible}
              reportingVisible={reportingVisible}
              reportingLabelsVisible={reportingLabelsVisible}
              mapZoom={mapZoom}
              onMapZoomChange={setMapZoom}
              viewportFeatures={viewportFeatures}
              onViewportFeaturesLoaded={setViewportFeatures}
            />
            <MapInteractionWatcher onUserInteracted={() => onFollowOwnshipChange(false)} />
            <MapResizeController />
            <MapRecenterController position={position} centreMapNonce={centreMapNonce} />
            <MapAreaCacheController
              cacheNonce={cacheNonce}
              areaDownloadNonce={areaDownloadNonce}
              routeDownloadNonce={routeDownloadNonce}
              routePoints={routePoints}
              onDone={() => setIsCachingArea(false)}
              onAreaDownloadDone={() => setIsDownloadingArea(false)}
              onRouteDownloadDone={() => setIsDownloadingRoute(false)}
              onStatus={setCacheStatus}
              onComplete={(tileCount) => {
                setCacheState('complete');
                setCacheStatus(tileCount > 0 ? 'Cache ready for current view.' : 'Nothing to cache in current view.');
              }}
              onAreaDownloadStatus={setAreaDownloadStatus}
              onAreaDownloadComplete={(tileCount) => {
                setAreaDownloadState(tileCount > 0 ? 'complete' : 'idle');
                setAreaDownloadStatus(
                  tileCount > 0 ? 'Area saved on this device for offline use.' : 'No area tiles available to download.'
                );
              }}
              onRouteDownloadStatus={setRouteDownloadStatus}
              onRouteDownloadComplete={(tileCount) => {
                setRouteDownloadState(tileCount > 0 ? 'complete' : 'idle');
                setRouteDownloadStatus(
                  tileCount > 0
                    ? `${flightCacheLabel} route cached on this device.`
                    : routePoints.length > 1
                      ? 'No flight route tiles available to cache.'
                      : 'Load a flight route to cache it on this device.'
                );
              }}
            />
            <FitFlightBounds routePoints={routePoints} position={position} followOwnship={followOwnship} />

            {routePoints.length > 1 && (
              <Polyline positions={routePoints} color="#10b981" weight={4} dashArray="10 10" opacity={0.85} />
            )}

            {trackHistory.length > 1 && (
              <Polyline positions={trackHistory} color="#38bdf8" weight={3} opacity={0.7} />
            )}

            {activeLegIndex !== undefined &&
              validRouteLegs[activeLegIndex]?.latitude !== undefined &&
              validRouteLegs[activeLegIndex]?.longitude !== undefined &&
              validRouteLegs[activeLegIndex + 1]?.latitude !== undefined &&
              validRouteLegs[activeLegIndex + 1]?.longitude !== undefined && (
                <Polyline
                  positions={[
                    [validRouteLegs[activeLegIndex]!.latitude!, validRouteLegs[activeLegIndex]!.longitude!],
                    [validRouteLegs[activeLegIndex + 1]!.latitude!, validRouteLegs[activeLegIndex + 1]!.longitude!],
                  ]}
                  color="#0ea5e9"
                  weight={6}
                  opacity={0.95}
                />
              )}

            {legs.map((leg, index) => {
              if (leg.latitude === undefined || leg.longitude === undefined) return null;

              return (
                <Marker key={leg.id} position={[leg.latitude, leg.longitude]} icon={WaypointIcon}>
                  <Popup>
                    <div className="space-y-1 text-xs">
                      <p className="font-black uppercase">{leg.waypoint}</p>
                      <p className="text-muted-foreground">Waypoint {index + 1}</p>
                      {leg.frequencies && <p>{leg.frequencies}</p>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {position && (
              <Marker
                position={[position.latitude, position.longitude]}
                icon={createAircraftMarkerIcon(aircraftRegistration || 'Ownship', normalizedHeading)}
              >
                <Popup>
                  <div className="space-y-1 text-xs">
                    <p className="font-black uppercase">{aircraftRegistration || 'Ownship'}</p>
                    {booking && <p>Booking #{booking.bookingNumber}</p>}
                    <p>
                      {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                    </p>
                    <p>Accuracy: {position.accuracy ? `${Math.round(position.accuracy)} m` : 'Unknown'}</p>
                    <p>Speed: {position.speedKt != null ? `${position.speedKt.toFixed(1)} kt` : 'Unavailable'}</p>
                    <p>Track: {position.headingTrue != null ? `${position.headingTrue.toFixed(0)} deg` : 'Unavailable'}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </LeafletMapFrame>
          </div>
        </div>

        <div className="pointer-events-auto absolute inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[1000] grid grid-cols-4 gap-2">
          <Dialog open={compactFullscreenOpen} onOpenChange={setCompactFullscreenOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 w-full rounded-full border-slate-200 bg-white px-2 text-[9px] font-black uppercase tracking-[0.10em] text-slate-800 shadow-sm transition-transform duration-150 hover:bg-white hover:text-slate-800 active:scale-95 active:translate-y-px active:bg-white active:text-slate-800 focus-visible:bg-white focus-visible:text-slate-800 sm:h-10 sm:px-4 sm:text-[11px]"
              >
                Full Screen
              </Button>
            </DialogTrigger>
            <DialogContent className="fixed inset-0 m-0 h-[100dvh] w-[100vw] max-w-none max-h-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black p-0 text-slate-100 shadow-none">
              <DialogHeader className="sr-only">
                <DialogTitle>Full Flight Tracking View</DialogTitle>
              </DialogHeader>
              <FullScreenFlightLayout
                booking={booking}
                legs={legs}
                position={position}
                aircraftRegistration={aircraftRegistration}
                activeLegIndex={activeLegIndex}
                activeLegState={activeLegState}
                followOwnship={followOwnship}
                onFollowOwnshipChange={onFollowOwnshipChange}
                centreMapNonce={centreMapNonce}
                airportsVisible={airportsVisible}
                onAirportsVisibleChange={setAirportsVisible}
                airportLabelsVisible={airportLabelsVisible}
                onAirportLabelsVisibleChange={setAirportLabelsVisible}
                navaidsVisible={navaidsVisible}
                onNavaidsVisibleChange={setNavaidsVisible}
                navaidLabelsVisible={navaidLabelsVisible}
                onNavaidLabelsVisibleChange={setNavaidLabelsVisible}
                heading={position?.headingTrue ?? null}
                speed={position?.speedKt ?? null}
                altitude={position?.altitude ?? null}
                trailPoints={trackHistory.length}
                syncStatusLabel={followOwnship ? 'Ownship Follow' : 'North Up'}
                syncStatusClassName="border-slate-200 bg-white text-slate-800 hover:bg-white"
                savedDeviceLabel="Embedded Map"
                permissionState="granted"
                isWatching
              />
            </DialogContent>
          </Dialog>
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

          @media (max-width: 639px) and (orientation: portrait) {
            .fullscreen-map-shell .nose-up-map {
              left: 50%;
              top: 50%;
              width: 175vh;
              height: 175vh;
              inset: auto;
              transform: translate(-50%, -50%) rotate(var(--map-rotation)) scale(1.08);
            }
          }

          .fullscreen-map-shell .nose-up-map .leaflet-top,
          .fullscreen-map-shell .nose-up-map .leaflet-bottom {
            transform: rotate(var(--map-counter-rotation));
            transform-origin: center;
          }

          .fullscreen-map-shell .nose-up-map .${openAipLabelClassName} {
            display: inline-block;
            width: max-content;
            height: max-content;
            background: #ffffff;
            border: 0;
            border-radius: 2px;
            box-shadow: none;
            color: #1d4ed8;
            font-size: 7px;
            font-weight: 800;
            letter-spacing: 0.04em;
            line-height: 1;
            padding: 1px 4px;
            white-space: nowrap;
            text-transform: uppercase;
          }

          .fullscreen-map-shell .nose-up-map .${openAipLabelClassName}::before {
            display: none;
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

  if (compactLayout) {
      return (
        <div
          className="relative h-full min-h-[360px] overflow-hidden rounded-[1.1rem] border border-slate-200/80 bg-white shadow-sm pointer-events-none"
          style={{ ...mapShellStyle, overscrollBehavior: 'none' }}
        >
          <div className="pointer-events-auto absolute inset-0 overflow-hidden">
            <div className="nose-up-map pointer-events-auto absolute inset-[-22%] bg-slate-950/5">
            <LeafletMapFrame
              center={center}
              zoom={8}
              minZoom={mapMinZoom}
              maxZoom={mapMaxZoom}
              className="h-full min-h-[360px] w-full rounded-none"
              style={{ background: '#f8fafc', touchAction: 'none', overscrollBehavior: 'none' }}
            >
              {selectedBaseLayer === 'satellite' ? (
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  attribution="&copy; Google Maps"
                />
              ) : (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
              )}
              <ActiveFlightOpenAipLayers
                mapMinZoom={mapMinZoom}
                mapMaxZoom={mapMaxZoom}
                showOpenAipChart={showOpenAipChart}
                airportsVisible={airportsVisible}
                airportLabelsVisible={airportLabelsVisible}
                navaidsVisible={navaidsVisible}
                navaidLabelsVisible={navaidLabelsVisible}
                reportingVisible={reportingVisible}
                reportingLabelsVisible={reportingLabelsVisible}
                mapZoom={mapZoom}
                onMapZoomChange={setMapZoom}
                viewportFeatures={viewportFeatures}
                onViewportFeaturesLoaded={setViewportFeatures}
              />
              <MapInteractionWatcher onUserInteracted={() => onFollowOwnshipChange(false)} />
              <MapResizeController />
              <MapRecenterController position={position} centreMapNonce={centreMapNonce} />
              <FitFlightBounds routePoints={routePoints} position={position} followOwnship={followOwnship} />

              {routePoints.length > 1 && (
                <Polyline positions={routePoints} color="#10b981" weight={4} dashArray="10 10" opacity={0.85} />
              )}

              {trackHistory.length > 1 && (
                <Polyline positions={trackHistory} color="#38bdf8" weight={3} opacity={0.7} />
              )}

              {activeLegIndex !== undefined &&
                validRouteLegs[activeLegIndex]?.latitude !== undefined &&
                validRouteLegs[activeLegIndex]?.longitude !== undefined &&
                validRouteLegs[activeLegIndex + 1]?.latitude !== undefined &&
                validRouteLegs[activeLegIndex + 1]?.longitude !== undefined && (
                  <Polyline
                    positions={[
                      [validRouteLegs[activeLegIndex]!.latitude!, validRouteLegs[activeLegIndex]!.longitude!],
                      [validRouteLegs[activeLegIndex + 1]!.latitude!, validRouteLegs[activeLegIndex + 1]!.longitude!],
                    ]}
                    color="#0ea5e9"
                    weight={6}
                    opacity={0.95}
                  />
                )}

              {legs.map((leg, index) => {
                if (leg.latitude === undefined || leg.longitude === undefined) return null;

                return (
                  <Marker key={leg.id} position={[leg.latitude, leg.longitude]} icon={WaypointIcon}>
                    <Popup>
                      <div className="space-y-1 text-xs">
                        <p className="font-black uppercase">{leg.waypoint}</p>
                        <p className="text-muted-foreground">Waypoint {index + 1}</p>
                        {leg.frequencies && <p>{leg.frequencies}</p>}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {position && (
                <Marker
                  position={[position.latitude, position.longitude]}
                  icon={createAircraftMarkerIcon(aircraftRegistration || 'Ownship', normalizedHeading)}
                >
                  <Popup>
                    <div className="space-y-1 text-xs">
                      <p className="font-black uppercase">{aircraftRegistration || 'Ownship'}</p>
                      {booking && <p>Booking #{booking.bookingNumber}</p>}
                      <p>
                        {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                      </p>
                      <p>Accuracy: {position.accuracy ? `${Math.round(position.accuracy)} m` : 'Unknown'}</p>
                      <p>Speed: {position.speedKt != null ? `${position.speedKt.toFixed(1)} kt` : 'Unavailable'}</p>
                      <p>Track: {position.headingTrue != null ? `${position.headingTrue.toFixed(0)} deg` : 'Unavailable'}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </LeafletMapFrame>
            </div>
          </div>
          {layerSelectorPanelOpen ? (
            <div className="pointer-events-auto absolute bottom-4 left-4 z-[1200] flex max-h-[calc(100vh-2rem)] w-[340px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 text-[10px] shadow-xl backdrop-blur">
              <div className="border-b border-slate-100 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      onLayerSelectorOpenChange?.(false);
                      setShowLayerSelectorPanel(false);
                    }}
                  >
                    Close
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Layers</p>
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700">
                    Base Layer
                  </div>
                </div>
              </div>
              <div className="px-3 py-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <label className="flex min-w-[150px] items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                    <input type="radio" checked={selectedBaseLayer === 'light'} onChange={() => setSelectedBaseLayer('light')} />
                    <span className="text-[10px] font-semibold">Light (Standard)</span>
                  </label>
                  <label className="flex min-w-[150px] items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                    <input type="radio" checked={selectedBaseLayer === 'satellite'} onChange={() => setSelectedBaseLayer('satellite')} />
                    <span className="text-[10px] font-semibold">Satellite (Hybrid)</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 overflow-y-auto px-3 pb-3 pr-1">
                <div className="space-y-2">
                  {[
                    ['OpenAIP Master Chart', showOpenAipChart, setShowOpenAipChart],
                    ['OpenAIP Airports', airportsVisible, setAirportsVisible],
                    ['OpenAIP Navaids', navaidsVisible, setNavaidsVisible],
                    ['OpenAIP Reporting Points', reportingVisible, setReportingVisible],
                    ['Class E', classEVisible, setClassEVisible],
                    ['Class F', classFVisible, setClassFVisible],
                    ['Class G', classGVisible, setClassGVisible],
                    ['Military Operations Areas', militaryAreasVisible, setMilitaryAreasVisible],
                    ['Training Areas', trainingAreasVisible, setTrainingAreasVisible],
                    ['Gliding Sectors', glidingSectorsVisible, setGlidingSectorsVisible],
                    ['Hang Glidings', hangGlidingVisible, setHangGlidingVisible],
                    ['OpenAIP Airspaces', airspacesVisible, setAirspacesVisible],
                    ['OpenAIP Obstacles', obstaclesVisible, setObstaclesVisible],
                  ].map(([label, checked, setter]) => (
                    <label key={label as string} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={checked as boolean}
                        onChange={(event) => (setter as Dispatch<SetStateAction<boolean>>)(event.target.checked)}
                      />
                      <span className="text-[10px] font-semibold">{label as string}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Labels</p>
                  {[
                    ['Airport Labels', airportLabelsVisible, setAirportLabelsVisible],
                    ['Navaid Labels', navaidLabelsVisible, setNavaidLabelsVisible],
                    ['Reporting Labels', reportingLabelsVisible, setReportingLabelsVisible],
                    ['Airspace Labels', airspaceLabelsVisible, setAirspaceLabelsVisible],
                    ['Class E Labels', classELabelsVisible, setClassELabelsVisible],
                    ['Class F Labels', classFLabelsVisible, setClassFLabelsVisible],
                    ['Class G Labels', classGLabelsVisible, setClassGLabelsVisible],
                    ['Military Labels', militaryLabelsVisible, setMilitaryLabelsVisible],
                    ['Training Labels', trainingLabelsVisible, setTrainingLabelsVisible],
                    ['Gliding Labels', glidingLabelsVisible, setGlidingLabelsVisible],
                    ['Hang Gliding Labels', hangGlidingLabelsVisible, setHangGlidingLabelsVisible],
                    ['Obstacle Labels', obstacleLabelsVisible, setObstacleLabelsVisible],
                  ].map(([label, checked, setter]) => (
                    <label key={label as string} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={checked as boolean}
                        onChange={(event) => (setter as Dispatch<SetStateAction<boolean>>)(event.target.checked)}
                      />
                      <span className="text-[10px] font-semibold">{label as string}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {layerLevelsPanelOpen ? (
            <div className="pointer-events-auto absolute bottom-4 right-4 z-[1200] flex max-h-[calc(100vh-2rem)] w-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-[10px] shadow-xl backdrop-blur">
              <div className="border-b border-slate-100 px-3 py-3">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      onLayerLevelsOpenChange?.(false);
                      setShowLayerLevelsPanel(false);
                    }}
                  >
                    Close
                  </button>
                  <p className="min-w-0 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Map Zoom</p>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                    Zoom {mapZoom} • decide what to load
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Cache status: {cacheStatus}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Min Zoom</span>
                    <Input
                      type="number"
                      min={0}
                      max={mapMaxZoom}
                      value={zoomDraftMin}
                      onChange={(event) => setZoomDraftMin(event.target.value)}
                      className="h-8 w-full rounded-lg border-slate-200 bg-white px-2 text-xs font-black"
                      aria-label="Active Flight minimum zoom"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Max Zoom</span>
                    <Input
                      type="number"
                      min={mapMinZoom}
                      max={22}
                      value={zoomDraftMax}
                      onChange={(event) => setZoomDraftMax(event.target.value)}
                      className="h-8 w-full rounded-lg border-slate-200 bg-white px-2 text-xs font-black"
                      aria-label="Active Flight maximum zoom"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg border-slate-200 bg-white px-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-50"
                    onClick={() => resetZoomRange()}
                  >
                    Reset Zoom
                  </Button>
                  <Button
                    type="button"
                    className="h-8 rounded-lg px-3 text-[9px] font-black uppercase tracking-[0.16em]"
                    onClick={() => saveZoomDrafts()}
                  >
                    Save Zoom
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg border-slate-200 bg-white px-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-50"
                  onClick={handleClearOpenAipCache}
                >
                  Clear Cache
                </Button>
              </div>
            </div>
          ) : null}
          <style jsx>{`
          .nose-up-map {
            transform: rotate(var(--map-rotation)) scale(1.38);
            transform-origin: 50% 50%;
            transition: transform 180ms ease-out;
          }

          @media (max-width: 639px) and (orientation: portrait) {
            .nose-up-map {
              left: 50%;
              top: 50%;
              width: 175vh;
              height: 175vh;
              inset: auto;
              transform: translate(-50%, -50%) rotate(var(--map-rotation)) scale(1.08);
            }
          }

            .nose-up-map :global(.leaflet-top),
          .nose-up-map :global(.leaflet-bottom) {
            transform: rotate(var(--map-counter-rotation));
            transform-origin: center;
          }

          .nose-up-map :global(.${openAipLabelClassName}) {
            display: inline-block;
            width: max-content;
            height: max-content;
            background: #ffffff;
            border: 0;
            border-radius: 2px;
            box-shadow: none;
            color: #1d4ed8;
            font-size: 7px;
            font-weight: 800;
            letter-spacing: 0.04em;
            line-height: 1;
            padding: 1px 4px;
            white-space: nowrap;
            text-transform: uppercase;
          }

          .nose-up-map :global(.${openAipLabelClassName}::before) {
            display: none;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-3 pointer-events-auto" style={mapShellStyle}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <CompassDial headingTrue={position?.headingTrue} />
          <div className="h-8 w-px bg-slate-200" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Map Mode</p>
            <p className="text-sm font-semibold text-slate-900">
              {followOwnship ? 'Nose-up' : 'North-up'}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Zoom</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={mapMaxZoom}
                value={zoomDraftMin}
                onChange={(event) => setZoomDraftMin(event.target.value)}
                className="h-8 w-16 rounded-full border-slate-200 bg-white px-2 text-xs font-black"
                aria-label="Active Flight minimum zoom"
              />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">to</span>
              <Input
                type="number"
                min={mapMinZoom}
                max={22}
                value={zoomDraftMax}
                onChange={(event) => setZoomDraftMax(event.target.value)}
                className="h-8 w-16 rounded-full border-slate-200 bg-white px-2 text-xs font-black"
                aria-label="Active Flight maximum zoom"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={() => {
              resetZoomRange();
            }}
            >
              Reset Zoom
            </Button>
            <Button
              type="button"
              className="h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.12em]"
              onClick={() => saveZoomDrafts()}
            >
              Save Zoom
            </Button>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <div className="nose-up-map relative min-h-[360px]">
        <LeafletMapFrame
          center={center}
          zoom={8}
          minZoom={mapMinZoom}
          maxZoom={mapMaxZoom}
          className="h-full min-h-[360px] w-full rounded-2xl"
          style={{ background: '#020617' }}
        >
          {selectedBaseLayer === 'satellite' ? (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          )}
          <ActiveFlightOpenAipLayers
            mapMinZoom={mapMinZoom}
            mapMaxZoom={mapMaxZoom}
            showOpenAipChart={showOpenAipChart}
            airportsVisible={airportsVisible}
            airportLabelsVisible={airportLabelsVisible}
            navaidsVisible={navaidsVisible}
            navaidLabelsVisible={navaidLabelsVisible}
            reportingVisible={reportingVisible}
            reportingLabelsVisible={reportingLabelsVisible}
            mapZoom={mapZoom}
            onMapZoomChange={setMapZoom}
            viewportFeatures={viewportFeatures}
            onViewportFeaturesLoaded={setViewportFeatures}
          />
          <MapInteractionWatcher onUserInteracted={() => onFollowOwnshipChange(false)} />
          <MapResizeController />
          <MapRecenterController position={position} centreMapNonce={centreMapNonce} />
          <FitFlightBounds routePoints={routePoints} position={position} followOwnship={followOwnship} />

          {routePoints.length > 1 && (
            <Polyline positions={routePoints} color="#10b981" weight={4} dashArray="10 10" opacity={0.85} />
          )}

          {trackHistory.length > 1 && (
            <Polyline positions={trackHistory} color="#38bdf8" weight={3} opacity={0.7} />
          )}

          {activeLegIndex !== undefined &&
            validRouteLegs[activeLegIndex]?.latitude !== undefined &&
            validRouteLegs[activeLegIndex]?.longitude !== undefined &&
            validRouteLegs[activeLegIndex + 1]?.latitude !== undefined &&
            validRouteLegs[activeLegIndex + 1]?.longitude !== undefined && (
              <Polyline
                positions={[
                  [validRouteLegs[activeLegIndex]!.latitude!, validRouteLegs[activeLegIndex]!.longitude!],
                  [validRouteLegs[activeLegIndex + 1]!.latitude!, validRouteLegs[activeLegIndex + 1]!.longitude!],
                ]}
                color="#0ea5e9"
                weight={6}
                opacity={0.95}
              />
            )}

          {legs.map((leg, index) => {
            if (leg.latitude === undefined || leg.longitude === undefined) return null;

            return (
              <Marker key={leg.id} position={[leg.latitude, leg.longitude]} icon={WaypointIcon}>
                <Popup>
                  <div className="space-y-1 text-xs">
                    <p className="font-black uppercase">{leg.waypoint}</p>
                    <p className="text-muted-foreground">Waypoint {index + 1}</p>
                    {leg.frequencies && <p>{leg.frequencies}</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {position && (
            <Marker
              position={[position.latitude, position.longitude]}
              icon={createAircraftMarkerIcon(aircraftRegistration || 'Ownship', normalizedHeading)}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <p className="font-black uppercase">{aircraftRegistration || 'Ownship'}</p>
                  {booking && <p>Booking #{booking.bookingNumber}</p>}
                  <p>
                    {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                  </p>
                  <p>Accuracy: {position.accuracy ? `${Math.round(position.accuracy)} m` : 'Unknown'}</p>
                  <p>Speed: {position.speedKt != null ? `${position.speedKt.toFixed(1)} kt` : 'Unavailable'}</p>
                  <p>Track: {position.headingTrue != null ? `${position.headingTrue.toFixed(0)} deg` : 'Unavailable'}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </LeafletMapFrame>
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

          .nose-up-map :global(.${openAipLabelClassName}) {
            background: transparent;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            color: #1d4ed8;
            font-size: 7px;
            font-weight: 800;
            letter-spacing: 0.04em;
            padding: 0;
            text-transform: uppercase;
          }

          .nose-up-map :global(.${openAipLabelClassName}::before) {
            display: none;
          }
        `}</style>
          </div>
          {layerSelectorPanelOpen ? (
            <div className="pointer-events-auto absolute bottom-4 left-4 z-[1200] flex max-h-[calc(100vh-2rem)] w-[340px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 text-[10px] shadow-xl backdrop-blur">
              <div className="border-b border-slate-100 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      onLayerSelectorOpenChange?.(false);
                      setShowLayerSelectorPanel(false);
                    }}
                  >
                    Close
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Layers</p>
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700">
                    Base Layer
                  </div>
                </div>
              </div>
              <div className="px-3 py-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <label className="flex min-w-[150px] items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                    <input type="radio" checked={selectedBaseLayer === 'light'} onChange={() => setSelectedBaseLayer('light')} />
                    <span className="text-[10px] font-semibold">Light (Standard)</span>
                  </label>
                  <label className="flex min-w-[150px] items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                    <input type="radio" checked={selectedBaseLayer === 'satellite'} onChange={() => setSelectedBaseLayer('satellite')} />
                    <span className="text-[10px] font-semibold">Satellite (Hybrid)</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 overflow-y-auto px-3 pb-3 pr-1">
                <div className="space-y-2">
                  {[
                    ['OpenAIP Master Chart', showOpenAipChart, setShowOpenAipChart],
                    ['OpenAIP Airports', airportsVisible, setAirportsVisible],
                    ['OpenAIP Navaids', navaidsVisible, setNavaidsVisible],
                    ['OpenAIP Reporting Points', reportingVisible, setReportingVisible],
                    ['Class E', classEVisible, setClassEVisible],
                    ['Class F', classFVisible, setClassFVisible],
                    ['Class G', classGVisible, setClassGVisible],
                    ['Military Operations Areas', militaryAreasVisible, setMilitaryAreasVisible],
                    ['Training Areas', trainingAreasVisible, setTrainingAreasVisible],
                    ['Gliding Sectors', glidingSectorsVisible, setGlidingSectorsVisible],
                    ['Hang Glidings', hangGlidingVisible, setHangGlidingVisible],
                    ['OpenAIP Airspaces', airspacesVisible, setAirspacesVisible],
                    ['OpenAIP Obstacles', obstaclesVisible, setObstaclesVisible],
                  ].map(([label, checked, setter]) => (
                    <label key={label as string} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={checked as boolean}
                        onChange={(event) => (setter as Dispatch<SetStateAction<boolean>>)(event.target.checked)}
                      />
                      <span className="text-[10px] font-semibold">{label as string}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Labels</p>
                  {[
                    ['Airport Labels', airportLabelsVisible, setAirportLabelsVisible],
                    ['Navaid Labels', navaidLabelsVisible, setNavaidLabelsVisible],
                    ['Reporting Labels', reportingLabelsVisible, setReportingLabelsVisible],
                    ['Airspace Labels', airspaceLabelsVisible, setAirspaceLabelsVisible],
                    ['Class E Labels', classELabelsVisible, setClassELabelsVisible],
                    ['Class F Labels', classFLabelsVisible, setClassFLabelsVisible],
                    ['Class G Labels', classGLabelsVisible, setClassGLabelsVisible],
                    ['Military Labels', militaryLabelsVisible, setMilitaryLabelsVisible],
                    ['Training Labels', trainingLabelsVisible, setTrainingLabelsVisible],
                    ['Gliding Labels', glidingLabelsVisible, setGlidingLabelsVisible],
                    ['Hang Gliding Labels', hangGlidingLabelsVisible, setHangGlidingLabelsVisible],
                    ['Obstacle Labels', obstacleLabelsVisible, setObstacleLabelsVisible],
                  ].map(([label, checked, setter]) => (
                    <label key={label as string} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={checked as boolean}
                        onChange={(event) => (setter as Dispatch<SetStateAction<boolean>>)(event.target.checked)}
                      />
                      <span className="text-[10px] font-semibold">{label as string}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {layerLevelsPanelOpen ? (
            <div className="pointer-events-auto absolute left-3 bottom-3 z-[1200] w-[260px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
              <div className="mb-3 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Map Zoom</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={mapMaxZoom}
                    value={zoomDraftMin}
                    onChange={(event) => setZoomDraftMin(event.target.value)}
                    className="h-9 text-xs font-black"
                    aria-label="Active Flight minimum zoom"
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">to</span>
                  <Input
                    type="number"
                    min={mapMinZoom}
                    max={22}
                    value={zoomDraftMax}
                    onChange={(event) => setZoomDraftMax(event.target.value)}
                    className="h-9 text-xs font-black"
                    aria-label="Active Flight maximum zoom"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => resetZoomRange()}>
                    Reset
                  </Button>
                  <Button type="button" onClick={() => saveZoomDrafts()}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
      </div>
    );
  }
