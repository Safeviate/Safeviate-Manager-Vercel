'use client';

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LeafletMapFrame } from '@/components/maps/leaflet-map-frame';
import type { Booking, NavlogLeg } from '@/types/booking';
import type { ActiveLegState, FlightPosition } from '@/types/flight-session';
import { cn } from '@/lib/utils';

const WaypointIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#10b981;border:2px solid #fff;box-shadow:0 0 0 2px rgba(16,185,129,0.28);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

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
  routePoints,
  position,
  recenterNonce,
  onDone,
}: {
  routePoints: [number, number][];
  position: FlightPosition | null;
  recenterNonce: number;
  onDone: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (recenterNonce === 0) return;

    if (routePoints.length > 1) {
      map.fitBounds(L.latLngBounds(routePoints).pad(0.25), { animate: false });
      onDone();
      return;
    }

    if (routePoints.length === 1) {
      map.setView(routePoints[0], map.getZoom(), { animate: false });
      onDone();
      return;
    }

    if (position) {
      map.setView([position.latitude, position.longitude], map.getZoom(), { animate: false });
      onDone();
    }
  }, [map, onDone, position, recenterNonce, routePoints]);

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
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 14;

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
}: {
  booking: Booking | null;
  legs: NavlogLeg[];
  position: FlightPosition | null;
  aircraftRegistration?: string;
  activeLegIndex?: number;
  activeLegState?: ActiveLegState | null;
  fullscreen?: boolean;
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
  const [followOwnship, setFollowOwnship] = useState(true);
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

  useEffect(() => {
    setFollowOwnship(true);
  }, [routeSignature]);

  useEffect(() => {
    setRouteDownloadStatus(
      routePoints.length > 1 ? 'Download the loaded route corridor on this device.' : 'Load a route to download it on this device.'
    );
    if (routePoints.length <= 1 && routeDownloadState !== 'downloading') {
      setRouteDownloadState('idle');
    }
  }, [routeDownloadState, routePoints.length]);

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

  const handleFollowOwnship = () => {
    setFollowOwnship(true);
    setRecenterNonce((current) => current + 1);
  };
  const handleNorthUp = () => {
    setFollowOwnship(false);
    setRecenterNonce((current) => current + 1);
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
          <LeafletMapFrame
            center={center}
            zoom={8}
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            zoomAnimation={false}
            className="h-full w-full rounded-none"
            style={{ background: '#000000' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <MapInteractionWatcher onUserInteracted={() => setFollowOwnship(false)} />
            <MapResizeController />
            <MapRecenterController
              routePoints={routePoints}
              position={position}
              recenterNonce={recenterNonce}
              onDone={() => setRecenterNonce(0)}
            />
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
                setCacheStatus(
                  tileCount > 0 ? 'Cached current view for offline use.' : 'No tiles available to cache.'
                );
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
                    ? 'Route corridor saved on this device for offline use.'
                    : routePoints.length > 1
                      ? 'No route tiles available to download.'
                      : 'Load a route to download it on this device.'
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
                    <p>Heading: {position.headingTrue != null ? `${position.headingTrue.toFixed(0)} deg` : 'Unavailable'}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </LeafletMapFrame>
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[1000] grid grid-cols-3 gap-2">
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
    <div className="space-y-3" style={mapShellStyle}>
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
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <div className="nose-up-map relative min-h-[360px]">
        <LeafletMapFrame
          center={center}
          zoom={8}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          className="h-full min-h-[360px] w-full rounded-2xl"
          style={{ background: '#020617' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapInteractionWatcher onUserInteracted={() => setFollowOwnship(false)} />
          <MapResizeController />
          <MapRecenterController
            routePoints={routePoints}
            position={position}
            recenterNonce={recenterNonce}
            onDone={() => setRecenterNonce(0)}
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
                  <p>Heading: {position.headingTrue != null ? `${position.headingTrue.toFixed(0)} deg` : 'Unavailable'}</p>
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
        `}</style>
      </div>
    </div>
  );
}
