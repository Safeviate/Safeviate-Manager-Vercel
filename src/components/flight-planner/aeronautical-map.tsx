'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NavlogLeg } from '@/types/booking';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Plus, Layers3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const RouteWaypointIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 2px rgba(239,68,68,0.35);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface AeronauticalMapProps {
  legs: NavlogLeg[];
  onAddWaypoint: (lat: number, lon: number, identifier?: string) => void;
}

type OpenAipFeature = {
  _id: string;
  name: string;
  type?: string;
  icaoCode?: string;
  identifier?: string;
  geometry?: {
    coordinates?: [number, number];
  };
  sourceLayer: 'airports' | 'navaids' | 'reporting-points';
};

type FlightPlannerMapSettings = {
  id?: string;
  showMasterChart?: boolean;
  showAirports?: boolean;
  showNavaids?: boolean;
  showReportingPoints?: boolean;
};

const OPENAIP_POINT_RESOURCES = ['airports', 'navaids', 'reporting-points'] as const;

const mergeOpenAipFeatures = (current: OpenAipFeature[], next: OpenAipFeature[]) => {
  const merged = [...current];
  for (const item of next) {
    if (!merged.some((existing) => existing._id === item._id)) {
      merged.push(item);
    }
  }
  return merged;
};

function MapEvents({ onAddWaypoint }: { onAddWaypoint: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onAddWaypoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function VisiblePointLoader({ onFeaturesLoaded }: { onFeaturesLoaded: (features: OpenAipFeature[]) => void }) {
  const map = useMap();
  const requestSeq = useRef(0);

  const loadVisiblePoints = useCallback(async () => {
    const bounds = map.getBounds().pad(0.25);
    const bbox = [
      bounds.getWest().toFixed(6),
      bounds.getSouth().toFixed(6),
      bounds.getEast().toFixed(6),
      bounds.getNorth().toFixed(6),
    ].join(',');
    const nextSeq = ++requestSeq.current;

    try {
      const responses = await Promise.all(
        OPENAIP_POINT_RESOURCES.map(async (resource) => {
          const response = await fetch(`/api/openaip?resource=${resource}&bbox=${bbox}`);
          const data = await response.json();
          return { resource, data };
        })
      );

      if (nextSeq !== requestSeq.current) return;

      const combined = responses.flatMap(({ resource, data }) =>
        (data.items || []).map((item: any) => ({ ...item, sourceLayer: resource }))
      );
      onFeaturesLoaded(combined);
    } catch (error) {
      console.error('Viewport OpenAIP load failed', error);
    }
  }, [map, onFeaturesLoaded]);

  useEffect(() => {
    loadVisiblePoints();
  }, [loadVisiblePoints]);

  useMapEvents({
    moveend: loadVisiblePoints,
    zoomend: loadVisiblePoints,
  });

  return null;
}

const CLICK_SNAP_THRESHOLD_NM = 8;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceNm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const earthRadiusNm = 3440.065;
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusNm * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
};

const stopPropagation = (event: React.SyntheticEvent) => {
  event.stopPropagation();
};

const blockMapInteraction = (event: React.SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const SearchControl = ({
  onAddWaypoint,
  onResultsChange,
}: {
  onAddWaypoint: (lat: number, lon: number, identifier?: string) => void;
  onResultsChange: (results: OpenAipFeature[]) => void;
}) => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenAipFeature[]>([]);
  const [selected, setSelected] = useState<OpenAipFeature | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const onResultsChangeRef = useRef(onResultsChange);

  useEffect(() => {
    onResultsChangeRef.current = onResultsChange;
  }, [onResultsChange]);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      onResultsChangeRef.current([]);
      return;
    }

    const resources = ['airports', 'navaids', 'reporting-points'] as const;
    try {
      const searchPromises = resources.map(resource =>
        fetch(`/api/openaip?resource=${resource}&search=${searchQuery}`).then(res => res.json())
      );
      const searchResults = await Promise.all(searchPromises);
      const combinedResults = searchResults.flatMap((result, index) => {
        const sourceLayer = resources[index];
        return (result.items || []).map((item: any) => ({ ...item, sourceLayer }));
      });
      setResults(combinedResults);
      onResultsChangeRef.current(combinedResults);
    } catch (error) {
      console.error('Search failed', error);
    }
  }, []);

  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery, handleSearch]);

  const handleSelect = (item: OpenAipFeature) => {
    if (item.geometry?.coordinates) {
      const [lon, lat] = item.geometry.coordinates;
      setSelected({ ...item, geometry: { coordinates: [lon, lat] } });
      map.flyTo([lat, lon], 12);
      setResults([]);
      setQuery('');
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm pointer-events-auto"
      onPointerDownCapture={stopPropagation}
      onMouseDownCapture={stopPropagation}
      onClickCapture={stopPropagation}
      onDoubleClickCapture={stopPropagation}
      onWheelCapture={stopPropagation}
    >
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
                onMouseDown={blockMapInteraction}
                onPointerDown={blockMapInteraction}
                onTouchStart={blockMapInteraction}
                className="p-3 border-b text-sm hover:bg-muted cursor-pointer"
              >
                <p className="font-bold">{item.name} ({item.icaoCode || item.identifier})</p>
                <p className="text-xs text-muted-foreground">{item.sourceLayer}</p>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}

      {selected && selected.geometry?.coordinates && (
        <Popup position={[selected.geometry.coordinates[1], selected.geometry.coordinates[0]]}>
          <div className="text-sm space-y-2 w-48">
            <p className="font-bold text-base">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.sourceLayer}</p>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="w-full" onMouseDown={blockMapInteraction} onPointerDown={blockMapInteraction} onTouchStart={blockMapInteraction} onClick={(event) => {
                blockMapInteraction(event);
                const [lon, lat] = selected.geometry!.coordinates!;
                onAddWaypoint(lat, lon, selected.name);
                setSelected(null);
              }}>
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
              <Button size="sm" variant="ghost" className="w-full" onMouseDown={blockMapInteraction} onPointerDown={blockMapInteraction} onTouchStart={blockMapInteraction} onClick={(event) => {
                blockMapInteraction(event);
                setSelected(null);
              }}>
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
  const [searchFeatures, setSearchFeatures] = useState<OpenAipFeature[]>([]);
  const [viewportFeatures, setViewportFeatures] = useState<OpenAipFeature[]>([]);
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const mapSettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'flight-planner-map') : null),
    [firestore, tenantId]
  );
  const { data: mapSettings } = useDoc<FlightPlannerMapSettings>(mapSettingsRef, {
    initialData: {
      id: 'flight-planner-map',
      showMasterChart: true,
      showAirports: true,
      showNavaids: true,
      showReportingPoints: true,
    },
  });

  const [masterVisible, setMasterVisible] = useState(true);
  const [airportsVisible, setAirportsVisible] = useState(true);
  const [navaidsVisible, setNavaidsVisible] = useState(true);
  const [reportingVisible, setReportingVisible] = useState(true);
  const [pendingClickLabel, setPendingClickLabel] = useState<string | null>(null);
  const layersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (layersRef.current) {
      L.DomEvent.disableClickPropagation(layersRef.current);
      L.DomEvent.disableScrollPropagation(layersRef.current);
    }
  }, []);

  const openAipFeatures = useMemo(() => mergeOpenAipFeatures(viewportFeatures, searchFeatures), [searchFeatures, viewportFeatures]);
  const handleMapClick = useCallback((lat: number, lon: number) => {
    const candidates = openAipFeatures.filter((item) => {
      if (item.sourceLayer === 'airports') return airportsVisible;
      if (item.sourceLayer === 'navaids') return navaidsVisible;
      if (item.sourceLayer === 'reporting-points') return reportingVisible;
      return false;
    });

    let nearest: OpenAipFeature | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const feature of candidates) {
      const coords = feature.geometry?.coordinates;
      if (!coords) continue;
      const [featureLon, featureLat] = coords;
      const d = distanceNm(lat, lon, featureLat, featureLon);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = feature;
      }
    }

    if (nearest && nearestDistance <= CLICK_SNAP_THRESHOLD_NM) {
      const identifier = nearest.icaoCode || nearest.identifier || nearest.name;
      setPendingClickLabel(identifier);
      onAddWaypoint(lat, lon, identifier);
      return;
    }

    setPendingClickLabel('PNT');
    onAddWaypoint(lat, lon, 'PNT');
  }, [airportsVisible, navaidsVisible, openAipFeatures, onAddWaypoint, reportingVisible]);

  useEffect(() => {
    if (!mapSettings) return;
    setMasterVisible(mapSettings.showMasterChart ?? true);
    setAirportsVisible(mapSettings.showAirports ?? true);
    setNavaidsVisible(mapSettings.showNavaids ?? true);
    setReportingVisible(mapSettings.showReportingPoints ?? true);
  }, [mapSettings]);

  if (!isMounted) return null;

  const polylinePositions = legs
    .filter(leg => leg.latitude !== undefined && leg.longitude !== undefined)
    .map(leg => [leg.latitude!, leg.longitude!] as [number, number]);

  const center: [number, number] = legs.length > 0
    ? [legs[legs.length - 1].latitude!, legs[legs.length - 1].longitude!]
    : [-25.9, 27.9];

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

        <LayersControl.Overlay checked={masterVisible} name="OpenAIP Master Chart">
          <TileLayer
            url="/api/openaip/tiles/openaip/{z}/{x}/{y}"
            attribution="&copy; OpenAIP"
            opacity={0.85}
          />
        </LayersControl.Overlay>
      </LayersControl>

      <MapEvents onAddWaypoint={handleMapClick} />
      <VisiblePointLoader
        onFeaturesLoaded={setViewportFeatures}
      />
      <SearchControl
        onAddWaypoint={onAddWaypoint}
        onResultsChange={(results) => {
          setSearchFeatures(results);
        }}
      />

      <div
        ref={layersRef}
        className="absolute bottom-4 left-4 z-[1000] w-[290px] rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur pointer-events-auto"
        onPointerDownCapture={stopPropagation}
        onMouseDownCapture={stopPropagation}
        onClickCapture={stopPropagation}
        onDoubleClickCapture={stopPropagation}
        onWheelCapture={stopPropagation}
      >
        <div className="mb-3 flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest">Map Layers</p>
        </div>
        <div className="space-y-2 text-xs font-semibold">
          <Button variant={masterVisible ? 'default' : 'outline'} className="h-8 w-full justify-start text-[11px] font-black uppercase" onMouseDown={blockMapInteraction} onPointerDown={blockMapInteraction} onTouchStart={blockMapInteraction} onClick={(event) => {
            blockMapInteraction(event);
            setMasterVisible((v) => !v);
          }}>
            OpenAIP Master Chart
          </Button>
          <Button variant={airportsVisible ? 'default' : 'outline'} className="h-8 w-full justify-start text-[11px] font-black uppercase" onMouseDown={blockMapInteraction} onPointerDown={blockMapInteraction} onTouchStart={blockMapInteraction} onClick={(event) => {
            blockMapInteraction(event);
            setAirportsVisible((v) => !v);
          }}>
            Airports Markers
          </Button>
          <Button variant={navaidsVisible ? 'default' : 'outline'} className="h-8 w-full justify-start text-[11px] font-black uppercase" onMouseDown={blockMapInteraction} onPointerDown={blockMapInteraction} onTouchStart={blockMapInteraction} onClick={(event) => {
            blockMapInteraction(event);
            setNavaidsVisible((v) => !v);
          }}>
            Navaids Markers
          </Button>
          <Button variant={reportingVisible ? 'default' : 'outline'} className="h-8 w-full justify-start text-[11px] font-black uppercase" onMouseDown={blockMapInteraction} onPointerDown={blockMapInteraction} onTouchStart={blockMapInteraction} onClick={(event) => {
            blockMapInteraction(event);
            setReportingVisible((v) => !v);
          }}>
            Reporting Points Markers
          </Button>
        </div>
      </div>

      {pendingClickLabel && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border bg-background/95 px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur">
          Last click: {pendingClickLabel}
        </div>
      )}

      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          color="#10b981"
          weight={4}
          dashArray="10, 10"
          opacity={0.8}
        />
      )}

      {legs.map((leg, index) => (
        <Marker key={leg.id} position={[leg.latitude!, leg.longitude!]} icon={RouteWaypointIcon}>
          <Popup>
            <div className="text-xs font-black uppercase space-y-1">
              <p className="text-primary font-bold">{leg.waypoint}</p>
              <p className="text-[10px] text-muted-foreground">Waypoint {index + 1}</p>
            </div>
          </Popup>
        </Marker>
      ))}

    </MapContainer>
  );
}
