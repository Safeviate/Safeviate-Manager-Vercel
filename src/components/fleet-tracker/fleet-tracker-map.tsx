'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers3, SlidersHorizontal } from 'lucide-react';
import type { FlightSession } from '@/types/flight-session';
import type { NavlogLeg } from '@/types/booking';
import { isFlightSessionStale } from '@/lib/flight-session-status';
import { LeafletMapFrame } from '@/components/maps/leaflet-map-frame';
import { useMapZoomPreferences } from '@/hooks/use-map-zoom-preferences';
import { useMapZoomDraft } from '@/hooks/use-map-zoom-draft';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const createAircraftIcon = (
  label: string,
  headingTrue?: number | null,
  onCourse?: boolean | null,
  isStale?: boolean,
  showLabel: boolean = true
) =>
  L.divIcon({
    className: '',
    html: `
      <div style="display:flex;align-items:center;gap:${showLabel ? '8px' : '0'};transform:translate(-8px,-8px);">
        <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:18px solid ${
            isStale ? '#f59e0b' : onCourse === false ? '#ef4444' : '#10b981'
          };transform:rotate(${headingTrue ?? 0}deg);transform-origin:center 70%;filter:drop-shadow(0 0 6px ${
            isStale
              ? 'rgba(245,158,11,0.35)'
              : onCourse === false
                ? 'rgba(239,68,68,0.35)'
                : 'rgba(16,185,129,0.35)'
          });"></div>
        </div>
        ${
          showLabel
            ? `<div style="padding:4px 8px;border-radius:9999px;background:${
                isStale ? 'rgba(120,53,15,0.92)' : onCourse === false ? 'rgba(127,29,29,0.92)' : 'rgba(15,23,42,0.9)'
              };color:#f8fafc;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;border:1px solid ${
                isStale ? 'rgba(253,186,116,0.45)' : onCourse === false ? 'rgba(252,165,165,0.45)' : 'rgba(148,163,184,0.35)'
              };white-space:nowrap;">
              ${label}
            </div>`
            : ''
        }
      </div>
    `,
    iconSize: showLabel ? [128, 36] : [28, 28],
    iconAnchor: showLabel ? [20, 20] : [14, 14],
  });

const getTrailStyle = (session: FlightSession, isStale: boolean) => {
  if (isStale) {
    return {
      color: '#f59e0b',
      weight: 3,
      opacity: 0.75,
      dashArray: '8 8',
    };
  }

  if (session.onCourse === false) {
    return {
      color: '#ef4444',
      weight: 4,
      opacity: 0.85,
    };
  }

  return {
    color: '#10b981',
    weight: 4,
    opacity: 0.8,
  };
};

const getNavlogRouteStyle = () => ({
  color: '#2563eb',
  weight: 3,
  opacity: 0.7,
  dashArray: '10 8',
});

function FitBounds({ sessions }: { sessions: FlightSession[] }) {
  const map = useMap();

  useEffect(() => {
    const positionedSessions = sessions.filter(
      (session) => session.lastPosition?.latitude !== undefined && session.lastPosition?.longitude !== undefined
    );

    if (positionedSessions.length === 0) return;

    if (positionedSessions.length === 1) {
      const session = positionedSessions[0];
      map.setView([session.lastPosition!.latitude, session.lastPosition!.longitude], 10);
      return;
    }

    const bounds = L.latLngBounds(
      positionedSessions.map((session) => [session.lastPosition!.latitude, session.lastPosition!.longitude] as [number, number])
    );
    map.fitBounds(bounds.pad(0.3));
  }, [map, sessions]);

  return null;
}

export function FleetTrackerMap({
  sessions,
  navlogRoutesByBookingId = {},
  layerSelectorOpen = false,
  layerLevelsOpen = false,
}: {
  sessions: FlightSession[];
  navlogRoutesByBookingId?: Record<string, NavlogLeg[]>;
  layerSelectorOpen?: boolean;
  layerLevelsOpen?: boolean;
}) {
  const { preferences: zoomPreferences, setZoomRange, saveZoomRange, resetZoomRange } = useMapZoomPreferences({
    storageKey: 'safeviate.fleet-tracker-map-zoom',
    defaultMinZoom: 3,
    defaultMaxZoom: 18,
  });
  const {
    draftMin: zoomDraftMin,
    draftMax: zoomDraftMax,
    setDraftMin: setZoomDraftMin,
    setDraftMax: setZoomDraftMax,
    saveDrafts: saveZoomDrafts,
  } = useMapZoomDraft({
    minZoom: zoomPreferences.minZoom,
    maxZoom: zoomPreferences.maxZoom,
    setZoomRange,
    saveZoomRange,
  });
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<'light' | 'satellite'>('light');
  const [showAircraftNames, setShowAircraftNames] = useState(true);
  const [showAircraftTrails, setShowAircraftTrails] = useState(true);
  const [showNavlogRoutes, setShowNavlogRoutes] = useState(true);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('safeviate.fleet-tracker-map-settings');
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<{
          baseLayer: 'light' | 'satellite';
          showAircraftNames: boolean;
          showAircraftTrails: boolean;
          showNavlogRoutes: boolean;
        }>;

        if (parsed.baseLayer === 'light' || parsed.baseLayer === 'satellite') {
          setSelectedBaseLayer(parsed.baseLayer);
        }
        if (typeof parsed.showAircraftNames === 'boolean') setShowAircraftNames(parsed.showAircraftNames);
        if (typeof parsed.showAircraftTrails === 'boolean') setShowAircraftTrails(parsed.showAircraftTrails);
        if (typeof parsed.showNavlogRoutes === 'boolean') setShowNavlogRoutes(parsed.showNavlogRoutes);
      }
    } catch {
      // Keep defaults if storage is missing or malformed.
    } finally {
      setSettingsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!settingsHydrated) return;
    window.localStorage.setItem(
      'safeviate.fleet-tracker-map-settings',
      JSON.stringify({
        baseLayer: selectedBaseLayer,
        showAircraftNames,
        showAircraftTrails,
        showNavlogRoutes,
      })
    );
  }, [settingsHydrated, selectedBaseLayer, showAircraftNames, showAircraftTrails, showNavlogRoutes]);

  const positionedSessions = useMemo(
    () =>
      sessions.filter(
        (session) => session.lastPosition?.latitude !== undefined && session.lastPosition?.longitude !== undefined
      ),
    [sessions]
  );

  const center = positionedSessions[0]
    ? ([positionedSessions[0].lastPosition!.latitude, positionedSessions[0].lastPosition!.longitude] as [number, number])
    : ([-25.9, 27.9] as [number, number]);
  const mapMinZoom = zoomPreferences.minZoom;
  const mapMaxZoom = zoomPreferences.maxZoom;

  return (
      <div className="relative h-full overflow-hidden rounded-2xl">
        <LeafletMapFrame
          center={center}
          zoom={6}
          minZoom={mapMinZoom}
          maxZoom={mapMaxZoom}
          className="h-[640px] w-full rounded-2xl xl:h-[700px]"
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
            <FitBounds sessions={positionedSessions} />
            {positionedSessions.map((session) => {
              const position = session.lastPosition!;
              const stale = isFlightSessionStale(session);
              const breadcrumbPoints = (session.breadcrumb || [])
                .filter((point) => point?.latitude !== undefined && point?.longitude !== undefined)
                .map((point) => [point.latitude, point.longitude] as [number, number]);
              const navlogRoutePoints = (session.bookingId ? navlogRoutesByBookingId[session.bookingId] || [] : [])
                .filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined)
                .map((leg) => [leg.latitude, leg.longitude] as [number, number]);

              return (
                <Fragment key={session.id}>
                  {showNavlogRoutes && navlogRoutePoints.length > 1 && (
                    <Polyline positions={navlogRoutePoints} pathOptions={getNavlogRouteStyle()} />
                  )}
                  {showAircraftTrails && breadcrumbPoints.length > 1 && <Polyline positions={breadcrumbPoints} pathOptions={getTrailStyle(session, stale)} />}
                  <Marker
                    position={[position.latitude, position.longitude]}
                    icon={
                      createAircraftIcon(
                        session.aircraftRegistration,
                        position.headingTrue,
                        session.onCourse,
                        stale,
                        showAircraftNames
                      ) || DefaultIcon
                    }
                  >
                    <Popup>
                      <div className="space-y-1 text-xs">
                        <p className="font-black uppercase">{session.aircraftRegistration}</p>
                        <p className="font-medium text-muted-foreground">{session.pilotName}</p>
                        <p>
                          {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                        </p>
                        <p>Accuracy: {position.accuracy ? `${Math.round(position.accuracy)} m` : 'Unknown'}</p>
                        <p>Altitude: {position.altitude != null ? `${Math.round(position.altitude)} m` : 'Unavailable'}</p>
                        <p>Speed: {session.groundSpeedKt != null ? `${session.groundSpeedKt.toFixed(0)} kt` : position.speedKt != null ? `${position.speedKt.toFixed(0)} kt` : 'Unavailable'}</p>
                        <p>Heading: {position.headingTrue != null ? `${position.headingTrue.toFixed(0)}°` : 'Unavailable'}</p>
                        <p>Trail points: {breadcrumbPoints.length}</p>
                        <p>Status: {stale ? 'Stale' : 'Live'}</p>
                        <p>Course: {session.onCourse === undefined || session.onCourse === null ? 'Unavailable' : session.onCourse ? 'On Course' : 'Off Course'}</p>
                        <p>XTK: {session.crossTrackErrorNm != null ? `${session.crossTrackErrorNm.toFixed(2)} NM` : 'Unavailable'}</p>
                        <p>Updated: {session.updatedAt}</p>
                      </div>
                    </Popup>
                  </Marker>
                </Fragment>
              );
            })}
        </LeafletMapFrame>
        {layerSelectorOpen ? (
          <div className="absolute right-3 top-3 z-[1200] w-[240px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-slate-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Layers</p>
            </div>
            <div className="space-y-2">
              <Button type="button" variant={selectedBaseLayer === 'light' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => setSelectedBaseLayer('light')}>
                Light
              </Button>
              <Button type="button" variant={selectedBaseLayer === 'satellite' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => setSelectedBaseLayer('satellite')}>
                Satellite
              </Button>
              <Button type="button" variant={showAircraftNames ? 'default' : 'outline'} className="w-full justify-start" onClick={() => setShowAircraftNames((current) => !current)}>
                Aircraft Names
              </Button>
              <Button type="button" variant={showAircraftTrails ? 'default' : 'outline'} className="w-full justify-start" onClick={() => setShowAircraftTrails((current) => !current)}>
                Aircraft Trails
              </Button>
              <Button type="button" variant={showNavlogRoutes ? 'default' : 'outline'} className="w-full justify-start" onClick={() => setShowNavlogRoutes((current) => !current)}>
                Navlog Routes
              </Button>
            </div>
          </div>
        ) : null}
        {layerLevelsOpen ? (
          <div className="absolute left-3 bottom-3 z-[1200] w-[260px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Map Zoom</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input type="number" min={0} max={mapMaxZoom} value={zoomDraftMin} onChange={(event) => setZoomDraftMin(event.target.value)} className="h-9 text-xs font-black" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">to</span>
                <Input type="number" min={mapMinZoom} max={22} value={zoomDraftMax} onChange={(event) => setZoomDraftMax(event.target.value)} className="h-9 text-xs font-black" />
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
