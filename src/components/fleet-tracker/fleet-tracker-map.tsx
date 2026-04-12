'use client';

import { type CSSProperties, Fragment, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import type { FlightSession } from '@/types/flight-session';
import { isFlightSessionStale } from '@/lib/flight-session-status';

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
  isStale?: boolean
) =>
  L.divIcon({
    className: '',
    html: `
      <div style="display:flex;align-items:center;gap:8px;transform:translate(-8px,-8px);">
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
        <div style="padding:4px 8px;border-radius:9999px;background:${
          isStale ? 'rgba(120,53,15,0.92)' : onCourse === false ? 'rgba(127,29,29,0.92)' : 'rgba(15,23,42,0.9)'
        };color:#f8fafc;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;border:1px solid ${
          isStale ? 'rgba(253,186,116,0.45)' : onCourse === false ? 'rgba(252,165,165,0.45)' : 'rgba(148,163,184,0.35)'
        };white-space:nowrap;">
          ${label}
        </div>
      </div>
    `,
    iconSize: [128, 36],
    iconAnchor: [20, 20],
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

export function FleetTrackerMap({ sessions }: { sessions: FlightSession[] }) {
  const [noseUp, setNoseUp] = useState(false);

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

  const mapRotationDegrees = noseUp && normalizedHeading != null ? -normalizedHeading : 0;
  const mapShellStyle = {
    '--map-rotation': `${mapRotationDegrees}deg`,
    '--map-counter-rotation': `${-mapRotationDegrees}deg`,
  } as CSSProperties;

  const center = positionedSessions[0]
    ? ([positionedSessions[0].lastPosition!.latitude, positionedSessions[0].lastPosition!.longitude] as [number, number])
    : ([-25.9, 27.9] as [number, number]);

  return (
    <div className="space-y-3" style={mapShellStyle}>
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
            <p className="text-sm font-semibold text-slate-900">{noseUp ? 'Nose-up' : 'North-up'}</p>
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-slate-200 bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={() => setNoseUp(true)}
          >
            Nose Up
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-slate-200 bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={() => setNoseUp(false)}
          >
            North Up
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <div className="fleet-nose-up-map relative">
          <MapContainer center={center} zoom={6} className="h-[640px] w-full rounded-2xl xl:h-[700px]" style={{ background: '#020617' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <FitBounds sessions={positionedSessions} />
            {positionedSessions.map((session) => {
              const position = session.lastPosition!;
              const stale = isFlightSessionStale(session);
              const breadcrumbPoints = (session.breadcrumb || [])
                .filter((point) => point?.latitude !== undefined && point?.longitude !== undefined)
                .map((point) => [point.latitude, point.longitude] as [number, number]);

              return (
                <Fragment key={session.id}>
                  {breadcrumbPoints.length > 1 && <Polyline positions={breadcrumbPoints} pathOptions={getTrailStyle(session, stale)} />}
                  <Marker
                    position={[position.latitude, position.longitude]}
                    icon={createAircraftIcon(session.aircraftRegistration, position.headingTrue, session.onCourse, stale) || DefaultIcon}
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
          </MapContainer>
        </div>
        <style jsx>{`
          .fleet-nose-up-map {
            transform: rotate(var(--map-rotation));
            transform-origin: 50% 50%;
            transition: transform 180ms ease-out;
          }

          .fleet-nose-up-map :global(.leaflet-top),
          .fleet-nose-up-map :global(.leaflet-bottom) {
            transform: rotate(var(--map-counter-rotation));
            transform-origin: center;
          }
        `}</style>
      </div>
    </div>
  );
}
