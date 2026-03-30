'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NavlogLeg } from '@/types/booking';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const SearchControl = ({ onAddWaypoint }: { onAddWaypoint: (lat: number, lon: number, identifier?: string) => void }) => {
    const map = useMap();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Prevent map click events when interacting with the search bar
        if (containerRef.current) {
            L.DomEvent.disableClickPropagation(containerRef.current);
        }
    }, []);

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 3) {
            setResults([]);
            return;
        }
        setLoading(true);

        const resources = ['airports', 'navaids', 'reporting-points'];
        try {
            const searchPromises = resources.map(resource =>
                fetch(`/api/openaip?resource=${resource}&search=${searchQuery}`).then(res => res.json())
            );
            const searchResults = await Promise.all(searchPromises);
            const combinedResults = searchResults.flatMap(result => result.items || []);
            setResults(combinedResults);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        handleSearch(debouncedQuery);
    }, [debouncedQuery, handleSearch]);

    const handleSelect = (item: any) => {
        if (item.geometry?.coordinates) {
            const [lon, lat] = item.geometry.coordinates;
            setSelected({ ...item, lat, lon });
            map.flyTo([lat, lon], 12);
            setResults([]);
            setQuery('');
        }
    };
    
    return (
        <div ref={containerRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search Airport, Navaid, or Point..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 h-10 shadow-lg"
                />
            </div>

            {results.length > 0 && (
                <div className="bg-background rounded-lg shadow-lg mt-2 border">
                    <ScrollArea className="h-[200px]">
                        {results.map(item => (
                            <div
                                key={item._id}
                                onClick={() => handleSelect(item)}
                                className="p-3 border-b text-sm hover:bg-muted cursor-pointer"
                            >
                                <p className="font-bold">{item.name} ({item.icaoCode || item.identifier})</p>
                                <p className="text-xs text-muted-foreground">{item.type}</p>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
            )}
            
            {selected && (
                <Popup position={[selected.lat, selected.lon]} onClose={() => setSelected(null)}>
                    <div className="text-sm space-y-2 w-48">
                        <p className="font-bold text-base">{selected.name}</p>
                        <p className="text-xs text-muted-foreground">{selected.type}</p>
                        <div className="flex gap-2 pt-2">
                             <Button size="sm" className="w-full" onClick={() => {
                                onAddWaypoint(selected.lat, selected.lon, selected.name);
                                setSelected(null);
                            }}>
                                <Plus className="h-4 w-4 mr-2" /> Add
                            </Button>
                            <Button size="sm" variant="ghost" className="w-full" onClick={() => setSelected(null)}>
                                <X className="h-4 w-4 mr-2" /> Close
                            </Button>
                        </div>
                    </div>
                </Popup>
            )}
        </div>
    );
};


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
        ? [legs[legs.length - 1].latitude!, legs[legs.length - 1].longitude!]
        : [-25.9, 27.9]; // Default: Lanseria Region

    return (
        <MapContainer 
            center={center} 
            zoom={8} 
            className="h-full w-full outline-none"
            style={{ background: '#0f172a' }}
        >
            <LayersControl position="topleft">
                <LayersControl.BaseLayer checked name="Light (Standard)">
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite (Hybrid)">
                    <TileLayer
                        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                        attribution="&copy; Google Maps"
                    />
                </LayersControl.BaseLayer>

                {/* --- OpenAIP Tactical Overlays via Proxy --- */}
                <LayersControl.Overlay checked name="OpenAIP Airspaces">
                    <TileLayer
                        url="/api/openaip/tiles/airspaces/{z}/{x}/{y}"
                        attribution="&copy; OpenAIP"
                        opacity={0.7}
                        zIndex={100}
                    />
                </LayersControl.Overlay>
                <LayersControl.Overlay checked name="OpenAIP Airports">
                    <TileLayer
                        url="/api/openaip/tiles/airports/{z}/{x}/{y}"
                        attribution="&copy; OpenAIP"
                        zIndex={101}
                    />
                </LayersControl.Overlay>
                <LayersControl.Overlay checked name="OpenAIP Navaids">
                    <TileLayer
                        url="/api/openaip/tiles/navaids/{z}/{x}/{y}"
                        attribution="&copy; OpenAIP"
                        zIndex={102}
                    />
                </LayersControl.Overlay>
                <LayersControl.Overlay name="OpenAIP Reporting Points">
                    <TileLayer
                        url="/api/openaip/tiles/reporting-points/{z}/{x}/{y}"
                        attribution="&copy; OpenAIP"
                        zIndex={103}
                    />
                </LayersControl.Overlay>
                <LayersControl.Overlay name="OpenAIP Obstacles">
                    <TileLayer
                        url="/api/openaip/tiles/obstacles/{z}/{x}/{y}"
                        attribution="&copy; OpenAIP"
                        zIndex={104}
                    />
                </LayersControl.Overlay>
                <LayersControl.Overlay name="OpenAIP Master Chart">
                    <TileLayer
                        url="/api/openaip/tiles/openaip/{z}/{x}/{y}"
                        attribution="&copy; OpenAIP"
                        opacity={0.8}
                        zIndex={99}
                    />
                </LayersControl.Overlay>
            </LayersControl>

            <MapEvents onAddWaypoint={onAddWaypoint} />
            <SearchControl onAddWaypoint={onAddWaypoint} />


            {legs.map((leg, index) => (
                <Marker 
                    key={leg.id} 
                    position={[leg.latitude!, leg.longitude!]}
                >
                    <Popup>
                        <div className="text-xs font-black uppercase space-y-1">
                            <p className="text-primary font-bold">{leg.waypoint}</p>
                            <p className="text-[10px] text-muted-foreground">Waypoint {index + 1}</p>
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
