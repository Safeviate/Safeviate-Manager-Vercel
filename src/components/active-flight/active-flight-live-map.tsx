'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Booking, NavlogLeg } from '@/types/booking';
import type { FlightPosition } from '@/types/flight-session';

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
}: {
  routePoints: [number, number][];
  position: FlightPosition | null;
}) {
  const map = useMap();

  useEffect(() => {
    const boundsPoints = [...routePoints];
    if (position) {
      boundsPoints.push([position.latitude, position.longitude]);
    }

    if (boundsPoints.length === 0) return;

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 11);
      return;
    }

    map.fitBounds(L.latLngBounds(boundsPoints).pad(0.25));
  }, [map, position, routePoints]);

  return null;
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
    <MapContainer center={center} zoom={8} className="h-full min-h-[360px] w-full rounded-2xl" style={{ background: '#020617' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <FitFlightBounds routePoints={routePoints} position={position} />

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
              <p>Heading: {position.headingTrue != null ? `${position.headingTrue.toFixed(0)}°` : 'Unavailable'}</p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
