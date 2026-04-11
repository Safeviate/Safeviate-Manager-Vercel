'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import type { Booking, NavlogLeg } from '@/types/booking';
import type { FlightPosition } from '@/types/flight-session';
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
        map.setView(routePoints[0], 11);
        return;
      }

      map.fitBounds(L.latLngBounds(routePoints).pad(0.25));
      return;
    }

    if (!position || !followOwnship) return;

    if (lastFrameSignatureRef.current === 'ownship') return;
    lastFrameSignatureRef.current = 'ownship';
    map.setView([position.latitude, position.longitude], 11);
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

function MapPaneRotation({
  headingTrue,
  enabled,
}: {
  headingTrue: number | null | undefined;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const mapPane = map.getContainer().querySelector('.leaflet-map-pane') as HTMLElement | null;
    if (!mapPane) return;

    const applyRotation = () => {
      const transformWithoutRotation = (mapPane.style.transform || '').replace(/\srotate\([-0-9.]+deg\)/g, '').trim();
      mapPane.style.transformOrigin = '50% 50%';

      if (!enabled || headingTrue == null || Number.isNaN(headingTrue)) {
        mapPane.style.transform = transformWithoutRotation;
        return;
      }

      mapPane.style.transform = `${transformWithoutRotation} rotate(${-headingTrue}deg)`.trim();
    };

    const syncRotation = () => {
      window.requestAnimationFrame(applyRotation);
    };

    applyRotation();
    const events: Array<'move' | 'zoom' | 'zoomanim' | 'resize' | 'viewreset'> = ['move', 'zoom', 'zoomanim', 'resize', 'viewreset'];
    events.forEach((event) => map.on(event, syncRotation));

    return () => {
      events.forEach((event) => map.off(event, syncRotation));
    };
  }, [enabled, headingTrue, map]);

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
      map.fitBounds(L.latLngBounds(routePoints).pad(0.25));
      onDone();
      return;
    }

    if (routePoints.length === 1) {
      map.setView(routePoints[0], 11);
      onDone();
      return;
    }

    if (position) {
      map.setView([position.latitude, position.longitude], 11);
      onDone();
    }
  }, [map, onDone, position, recenterNonce, routePoints]);

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

export function ActiveFlightLiveMap({
  booking,
  legs,
  position,
  aircraftRegistration,
  activeLegIndex,
}: {
  booking: Booking | null;
  legs: NavlogLeg[];
  position: FlightPosition | null;
  aircraftRegistration?: string;
  activeLegIndex?: number;
}) {
  const routePoints = useMemo(
    () =>
      legs
        .filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined)
        .map((leg) => [leg.latitude!, leg.longitude!] as [number, number]),
    [legs]
  );
  const [trackHistory, setTrackHistory] = useState<[number, number][]>([]);
  const [followOwnship, setFollowOwnship] = useState(true);
  const [isHeadingUp, setIsHeadingUp] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);

  useEffect(() => {
    setFollowOwnship(true);
  }, [routePoints]);

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <CompassDial headingTrue={position?.headingTrue} />
          <div className="h-8 w-px bg-slate-200" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Map Mode</p>
            <p className="text-sm font-semibold text-slate-900">
              {isHeadingUp ? 'Heading-up' : 'North-up'} {followOwnship ? '• follow on' : '• follow off'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              'h-9 rounded-full border-slate-200 bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm hover:bg-slate-50',
              isHeadingUp && 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
            )}
            onClick={() => setIsHeadingUp((current) => !current)}
          >
            {isHeadingUp ? 'Heading Up' : 'North Up'}
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

      <div className="relative">
        <MapContainer center={center} zoom={8} className="h-full min-h-[360px] w-full rounded-2xl" style={{ background: '#020617' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapInteractionWatcher onUserInteracted={() => setFollowOwnship(false)} />
          <MapPaneRotation headingTrue={position?.headingTrue} enabled={isHeadingUp} />
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
            legs[activeLegIndex]?.latitude !== undefined &&
            legs[activeLegIndex]?.longitude !== undefined &&
            legs[activeLegIndex + 1]?.latitude !== undefined &&
            legs[activeLegIndex + 1]?.longitude !== undefined && (
              <Polyline
                positions={[
                  [legs[activeLegIndex]!.latitude!, legs[activeLegIndex]!.longitude!],
                  [legs[activeLegIndex + 1]!.latitude!, legs[activeLegIndex + 1]!.longitude!],
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
              icon={createAircraftMarkerIcon(aircraftRegistration || 'Ownship', position.headingTrue)}
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
        </MapContainer>
      </div>
    </div>
  );
}
