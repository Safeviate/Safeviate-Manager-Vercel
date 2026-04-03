'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

  return (
    <MapContainer center={center} zoom={6} className="h-full min-h-[420px] w-full rounded-2xl" style={{ background: '#020617' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <FitBounds sessions={positionedSessions} />
      {positionedSessions.map((session) => {
        const position = session.lastPosition!;
        const stale = isFlightSessionStale(session);

        return (
          <Marker
            key={session.id}
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
                <p>Heading: {position.headingTrue != null ? `${position.headingTrue.toFixed(0)}°` : 'Unavailable'}</p>
                <p>Status: {stale ? 'Stale' : 'Live'}</p>
                <p>Course: {session.onCourse === undefined || session.onCourse === null ? 'Unavailable' : session.onCourse ? 'On Course' : 'Off Course'}</p>
                <p>XTK: {session.crossTrackErrorNm != null ? `${session.crossTrackErrorNm.toFixed(2)} NM` : 'Unavailable'}</p>
                <p>Updated: {session.updatedAt}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
