'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { FeatureGroup, Marker, Polyline, Popup, TileLayer, LayersControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

function FleetTrackerLayerSync({
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
}: {
  sessions: FlightSession[];
  navlogRoutesByBookingId?: Record<string, NavlogLeg[]>;
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

  const referenceSession = useMemo(
    () =>
      [...positionedSessions]
        .filter((session) => session.lastPosition?.headingTrue != null && !Number.isNaN(session.lastPosition.headingTrue))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null,
    [positionedSessions]
  );

  const normalizedHeading =
    referenceSession?.lastPosition?.headingTrue != null && !Number.isNaN(referenceSession.lastPosition.headingTrue)
      ? ((referenceSession.lastPosition.headingTrue % 360) + 360) % 360
      : null;

  const center = positionedSessions[0]
    ? ([positionedSessions[0].lastPosition!.latitude, positionedSessions[0].lastPosition!.longitude] as [number, number])
    : ([-25.9, 27.9] as [number, number]);
  const mapMinZoom = zoomPreferences.minZoom;
  const mapMaxZoom = zoomPreferences.maxZoom;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Heading</p>
            <p className="text-sm font-black text-slate-900">
              {normalizedHeading != null ? `${Math.round(normalizedHeading)}°` : '---'}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Map Mode</p>
            <p className="text-sm font-semibold text-slate-900">North-up · {selectedBaseLayer === 'light' ? 'Light' : 'Satellite'}</p>
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
                aria-label="Fleet Tracker minimum zoom"
              />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">to</span>
              <Input
                type="number"
                min={mapMinZoom}
                max={22}
                value={zoomDraftMax}
                onChange={(event) => setZoomDraftMax(event.target.value)}
                className="h-8 w-16 rounded-full border-slate-200 bg-white px-2 text-xs font-black"
                aria-label="Fleet Tracker maximum zoom"
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
          {referenceSession && (
            <>
              <div className="h-8 w-px bg-slate-200" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Reference</p>
                <p className="text-sm font-semibold text-slate-900">{referenceSession.aircraftRegistration}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <LeafletMapFrame
          center={center}
          zoom={6}
          minZoom={mapMinZoom}
          maxZoom={mapMaxZoom}
          className="h-[640px] w-full rounded-2xl xl:h-[700px]"
          style={{ background: '#020617' }}
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
                attribution="&copy; Google Maps"
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay checked={showAircraftNames} name="Aircraft Names">
              <FeatureGroup />
            </LayersControl.Overlay>
            <LayersControl.Overlay checked={showAircraftTrails} name="Aircraft Trails">
              <FeatureGroup />
            </LayersControl.Overlay>
            <LayersControl.Overlay checked={showNavlogRoutes} name="Navlog Routes">
              <FeatureGroup />
            </LayersControl.Overlay>
          </LayersControl>
          <FleetTrackerLayerSync
            onBaseLayerChange={setSelectedBaseLayer}
            onOverlayChange={(name, active) => {
              if (name === 'Aircraft Names') setShowAircraftNames(active);
              if (name === 'Aircraft Trails') setShowAircraftTrails(active);
              if (name === 'Navlog Routes') setShowNavlogRoutes(active);
            }}
          />
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
      </div>
    </div>
  );
}
