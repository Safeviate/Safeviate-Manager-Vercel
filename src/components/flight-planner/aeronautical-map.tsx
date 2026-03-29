
'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, LayersControl, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NavlogLeg } from '@/types/booking';
import { useEffect, useState } from 'react';

// Fix for default Leaflet icon assets in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface AeronauticalMapProps {
    legs: NavlogLeg[];
    onAddWaypoint: (lat: number, lon: number, identifier?: string) => void;
}

function MapEvents({ onAddWaypoint }: { onAddWaypoint: (lat: number, lon: number) => void }) {
    useMapEvents({
        click(e) {
            onAddWaypoint(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function AeronauticalMap({ legs, onAddWaypoint }: AeronauticalMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const polylinePositions = legs
        .filter(leg => leg.latitude !== undefined && leg.longitude !== undefined)
        .map(leg => [leg.latitude!, leg.longitude!] as [number, number]);

    const center: [number, number] = legs.length > 0 
        ? [legs[0].latitude!, legs[0].longitude!]
        : [-25.9, 27.9]; // Default: Johannesburg/FALA region

    return (
        <MapContainer 
            center={center} 
            zoom={8} 
            className="h-full w-full outline-none"
            style={{ background: '#0f172a' }}
        >
            <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Satellite (Hybrid)">
                    <TileLayer
                        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                        attribution="&copy; Google Maps"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Light (Standard)">
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.Overlay checked name="OpenAIP Aeronautical">
                    <TileLayer
                        url="https://api.core.openaip.net/api/tiles/{z}/{x}/{y}.png?apiKey=1cbf7bdd18e52e7fa977c6d106847397"
                        attribution="&copy; OpenAIP"
                        opacity={0.8}
                    />
                </LayersControl.Overlay>
            </LayersControl>

            <MapEvents onAddWaypoint={onAddWaypoint} />

            {legs.map((leg, index) => (
                <Marker 
                    key={leg.id} 
                    position={[leg.latitude!, leg.longitude!]}
                >
                    <Popup>
                        <div className="text-xs font-black uppercase space-y-1">
                            <p className="text-primary">{leg.waypoint}</p>
                            <p className="text-[10px] text-muted-foreground">Leg {index + 1}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {polylinePositions.length > 1 && (
                <Polyline 
                    positions={polylinePositions} 
                    color="#10b981" 
                    weight={4} 
                    dashArray="10, 10"
                    opacity={0.8}
                />
            )}
        </MapContainer>
    );
}
