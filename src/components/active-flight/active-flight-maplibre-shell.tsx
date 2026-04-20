'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';

import { MAPLIBRE_BASE_STYLES, OPENAIP_VECTOR_TILE_URL } from '@/lib/maplibre-map-config';

type Point = [number, number];

type FlightPosition = {
  latitude: number;
  longitude: number;
  headingTrue?: number | null;
} | null;

type ActiveFlightMapLibreShellProps = {
  className?: string;
  center: Point;
  position: FlightPosition;
  routePoints: Point[];
  trackHistory: Point[];
  legs: Array<{ id: string; latitude?: number; longitude?: number; waypoint: string }>;
  airportFeatures: Array<{ _id: string; name: string; type?: string; icaoCode?: string; identifier?: string; geometry?: { coordinates?: [number, number] }; sourceLayer: 'airports' | 'navaids' | 'reporting-points' }>;
  navaidFeatures: Array<{ _id: string; name: string; type?: string; icaoCode?: string; identifier?: string; geometry?: { coordinates?: [number, number] }; sourceLayer: 'airports' | 'navaids' | 'reporting-points' }>;
  reportingPointFeatures: Array<{ _id: string; name: string; type?: string; icaoCode?: string; identifier?: string; geometry?: { coordinates?: [number, number] }; sourceLayer: 'airports' | 'navaids' | 'reporting-points' }>;
  airspaceCollections: {
    classE: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; category: string; limits: string } }> };
    classF: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; category: string; limits: string } }> };
    classG: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; category: string; limits: string } }> };
    military: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; category: string; limits: string } }> };
    training: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; category: string; limits: string } }> };
    gliding: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; category: string; limits: string } }> };
    hangGliding: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; category: string; limits: string } }> };
    general: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; category: string; limits: string } }> };
  };
  obstacleGeoJson: { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; geometry?: { type?: string; coordinates?: any }; properties?: { _id: string; name: string; height?: number; elevation?: number } }> };
  followOwnship: boolean;
  recenterSignal: number;
  minZoom: number;
  maxZoom: number;
  showRouteLine: boolean;
  showWaypointMarkers: boolean;
  showTrackLine: boolean;
  showLabels: boolean;
  showMasterChart: boolean;
  showAirports: boolean;
  showNavaids: boolean;
  showReportingPoints: boolean;
  showAirspaces: boolean;
  showClassE: boolean;
  showClassF: boolean;
  showClassG: boolean;
  showMilitaryAreas: boolean;
  showTrainingAreas: boolean;
  showGlidingSectors: boolean;
  showHangGlidings: boolean;
  showObstacles: boolean;
  showOnlyActiveAirspace: boolean;
  onZoomChange?: (zoom: number) => void;
  onCenterChange?: (center: Point) => void;
  onUserInteracted?: () => void;
};

const normalizeHeading = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null;
  return ((value % 360) + 360) % 360;
};

const makeLineFeatureCollection = (points: Point[]) => ({
  type: 'FeatureCollection' as const,
  features: points.length > 1
    ? [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: points.map(([lat, lon]) => [lon, lat]),
          },
        },
      ]
    : [],
});

const toLayerVisibility = (visible: boolean) => (visible ? 'visible' : 'none') as 'visible' | 'none';

const tileUrl = OPENAIP_VECTOR_TILE_URL ? `${OPENAIP_VECTOR_TILE_URL.replace(/\/$/, '')}/{z}/{x}/{y}.pbf` : '';
const masterChartTileUrl = '/api/openaip/tiles/openaip/{z}/{x}/{y}';

const fetchOpenAipJson = async <T,>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const normalizeOpenAipItems = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as { items?: unknown[]; data?: unknown[] };
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
};

const formatLimitValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return `${value}`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [record.value, record.altitude, record.height, record.limit, record.text, record.unit, record.reference]
      .map((candidate) => formatLimitValue(candidate))
      .filter(Boolean)
      .join(' ');
  }
  return '';
};

const formatAirspaceVerticalLimits = (airspace: any): string => {
  const rawVertical = airspace.verticalLimits as Record<string, unknown> | undefined;
  const lower =
    formatLimitValue(rawVertical?.lower ?? rawVertical?.lowerLimit ?? rawVertical?.floor ?? airspace.lowerLimit ?? airspace.floor);
  const upper =
    formatLimitValue(rawVertical?.upper ?? rawVertical?.upperLimit ?? rawVertical?.ceiling ?? airspace.upperLimit ?? airspace.ceiling);
  const fallback = formatLimitValue(airspace.limits) || formatLimitValue(rawVertical?.text) || formatLimitValue(rawVertical?.display) || '';
  const rangeParts = [lower && `Lower ${lower}`, upper && `Upper ${upper}`].filter(Boolean) as string[];
  if (rangeParts.length > 0) return rangeParts.join(' • ');
  return fallback;
};

const isAirspaceActiveNow = (airspace: any) => {
  const operatingHours = airspace.hoursOfOperation?.operatingHours;
  if (!operatingHours || operatingHours.length === 0) return true;

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return operatingHours.some((entry: any) => {
    if (entry.dayOfWeek !== undefined && entry.dayOfWeek !== currentDay) return false;
    if (!entry.startTime || !entry.endTime) return true;
    if (entry.startTime === '00:00' && entry.endTime === '00:00') return true;

    const [startHour, startMinute] = entry.startTime.split(':').map(Number);
    const [endHour, endMinute] = entry.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  });
};

const isMilitaryAirspace = (airspace: any) =>
  airspace.type === 1 || airspace.type === 33 || /MILITARY|SHOOTING|WEAPONS|RANGE|MOA|M\.O\.A|OPERATIONS AREA/i.test(airspace.name);

const isTrainingAirspace = (airspace: any) =>
  airspace.type === 2 || /TRAINING|GENERAL FLYING|FLYING TNG|PJE/i.test(airspace.name);

const isGlidingAirspace = (airspace: any) =>
  airspace.type === 21 || /GLIDING|GLIDER/i.test(airspace.name);

const isHangGlidingAirspace = (airspace: any) =>
  /HANG\s*GLIDING|HANGGLIDING|HANG/i.test(airspace.name);

const isControlledAirspace = (airspace: any) =>
  /CTR|CONTROL\s*ZONE|CONTROLLED\s*TOR(E|W)R\s*REGION|CONTROL\s*TOR(E|W)R\s*REGION/i.test(airspace.name) ||
  airspace.type === 5 ||
  airspace.type === 10;

const getAirspaceClassCategory = (airspace: any) => {
  if (airspace.icaoClass === 6) return 'class-e';
  if (airspace.icaoClass === 7) return 'class-f';
  if (airspace.icaoClass === 8) return 'class-g';
  return 'other';
};

const getAirspaceCategory = (airspace: any) => {
  if (isControlledAirspace(airspace)) return 'ctr';
  if (isMilitaryAirspace(airspace)) return 'military';
  if (isTrainingAirspace(airspace)) return 'training';
  if (isGlidingAirspace(airspace)) return 'gliding';
  if (isHangGlidingAirspace(airspace)) return 'hang';
  const classCategory = getAirspaceClassCategory(airspace);
  if (classCategory !== 'other') return classCategory;
  return 'other';
};

const airspaceFeatureCollection = (items: any[]) => ({
  type: 'FeatureCollection' as const,
  features: items
    .filter((item) => item.geometry?.coordinates)
    .map((item) => ({
      type: 'Feature' as const,
      geometry: item.geometry,
      properties: {
        _id: item._id,
        name: item.name,
        category: getAirspaceCategory(item),
        limits: formatAirspaceVerticalLimits(item),
      },
    })),
});

const obstacleFeatureCollection = (items: any[]) => ({
  type: 'FeatureCollection' as const,
  features: items
    .filter((item) => item.geometry?.coordinates)
    .map((item) => ({
      type: 'Feature' as const,
      geometry: item.geometry,
      properties: {
        _id: item._id,
        name: item.name,
        height: item.height?.value,
        elevation: item.elevation?.value,
      },
    })),
});

const bringAerialLayersToFront = (map: MapLibreMap, layerIds: string[]) => {
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) {
      map.moveLayer(layerId);
    }
  }
};

export function ActiveFlightMapLibreShell({
  className,
  center,
  position,
  routePoints,
  trackHistory,
  legs,
  airportFeatures,
  navaidFeatures,
  reportingPointFeatures,
  airspaceCollections,
  obstacleGeoJson,
  followOwnship,
  recenterSignal,
  minZoom,
  maxZoom,
  showRouteLine,
  showWaypointMarkers,
  showTrackLine,
  showLabels,
  showMasterChart,
  showAirports,
  showNavaids,
  showReportingPoints,
  showAirspaces,
  showClassE,
  showClassF,
  showClassG,
  showMilitaryAreas,
  showTrainingAreas,
  showGlidingSectors,
  showHangGlidings,
  showObstacles,
  showOnlyActiveAirspace,
  onZoomChange,
  onCenterChange,
  onUserInteracted,
}: ActiveFlightMapLibreShellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const ownshipMarkerRef = useRef<maplibregl.Marker | null>(null);
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routeSourceRef = useRef<GeoJSONSource | null>(null);
  const trackSourceRef = useRef<GeoJSONSource | null>(null);
  const currentHeadingRef = useRef<number | null>(null);
  const loadSeqRef = useRef(0);
  const lastLoadKeyRef = useRef('');
  const lastLoadedPayloadRef = useRef('');
  const onZoomChangeRef = useRef(onZoomChange);
  const onCenterChangeRef = useRef(onCenterChange);
  const onUserInteractedRef = useRef(onUserInteracted);

  const [loadedAirportFeatures, setLoadedAirportFeatures] = useState(airportFeatures);
  const [loadedNavaidFeatures, setLoadedNavaidFeatures] = useState(navaidFeatures);
  const [loadedReportingPointFeatures, setLoadedReportingPointFeatures] = useState(reportingPointFeatures);
  const [loadedAirspaceCollections, setLoadedAirspaceCollections] = useState(airspaceCollections);
  const [loadedObstacleGeoJson, setLoadedObstacleGeoJson] = useState(obstacleGeoJson);

  const routeGeoJson = useMemo(() => makeLineFeatureCollection(routePoints), [routePoints]);
  const trackGeoJson = useMemo(() => makeLineFeatureCollection(trackHistory), [trackHistory]);
  const waypointLegs = useMemo(() => legs.filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined), [legs]);
  const airportGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: loadedAirportFeatures
        .filter((feature) => feature.geometry?.coordinates)
        .map((feature): any => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: feature.geometry!.coordinates },
          properties: {
            _id: feature._id,
            name: feature.name,
            icaoCode: feature.icaoCode,
            identifier: feature.identifier,
          },
        })),
    }),
    [loadedAirportFeatures]
  );
  const navaidGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: loadedNavaidFeatures
        .filter((feature) => feature.geometry?.coordinates)
        .map((feature): any => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: feature.geometry!.coordinates },
          properties: {
            _id: feature._id,
            name: feature.name,
            icaoCode: feature.icaoCode,
            identifier: feature.identifier,
          },
        })),
    }),
    [loadedNavaidFeatures]
  );
  const reportingGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: loadedReportingPointFeatures
        .filter((feature) => feature.geometry?.coordinates)
        .map((feature): any => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: feature.geometry!.coordinates },
          properties: {
            _id: feature._id,
            name: feature.name,
            icaoCode: feature.icaoCode,
            identifier: feature.identifier,
          },
        })),
    }),
    [loadedReportingPointFeatures]
  );
  const useVectorOpenAipLayers = Boolean(tileUrl);

  const activeOpenAipLayers = useMemo(
    () => [
      ['openaip-airport-points', showMasterChart && showAirports],
      ['openaip-airport-labels', showLabels && showMasterChart && showAirports],
      ['openaip-navaid-points', showMasterChart && showNavaids],
      ['openaip-navaid-labels', showLabels && showMasterChart && showNavaids],
      ['openaip-reporting-points', showMasterChart && showReportingPoints],
      ['openaip-reporting-labels', showLabels && showMasterChart && showReportingPoints],
      ['openaip-airspaces-ctr-fill', showMasterChart && showAirspaces],
      ['openaip-airspaces-ctr-line', showMasterChart && showAirspaces],
      ['openaip-airspaces-military-fill', showMasterChart && showMilitaryAreas],
      ['openaip-airspaces-military-line', showMasterChart && showMilitaryAreas],
      ['openaip-airspaces-training-fill', showMasterChart && showTrainingAreas],
      ['openaip-airspaces-training-line', showMasterChart && showTrainingAreas],
      ['openaip-airspaces-gliding-fill', showMasterChart && showGlidingSectors],
      ['openaip-airspaces-gliding-line', showMasterChart && showGlidingSectors],
      ['openaip-airspaces-hang-fill', showMasterChart && showHangGlidings],
      ['openaip-airspaces-hang-line', showMasterChart && showHangGlidings],
      ['openaip-airspaces-class-e-fill', showMasterChart && showClassE],
      ['openaip-airspaces-class-e-line', showMasterChart && showClassE],
      ['openaip-airspaces-class-f-fill', showMasterChart && showClassF],
      ['openaip-airspaces-class-f-line', showMasterChart && showClassF],
      ['openaip-airspaces-class-g-fill', showMasterChart && showClassG],
      ['openaip-airspaces-class-g-line', showMasterChart && showClassG],
      ['openaip-airspace-labels', showLabels && showMasterChart && (showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings)],
      ['openaip-obstacles', showMasterChart && showObstacles],
      ['openaip-obstacle-labels', showLabels && showMasterChart && showObstacles],
    ] as const,
    [
      showAirports,
      showAirspaces,
      showClassE,
      showClassF,
      showClassG,
      showGlidingSectors,
      showHangGlidings,
      showLabels,
      showMasterChart,
      showMilitaryAreas,
      showNavaids,
      showObstacles,
      showReportingPoints,
      showTrainingAreas,
    ]
  );

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    onUserInteractedRef.current = onUserInteracted;
  }, [onUserInteracted]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAPLIBRE_BASE_STYLES.light,
      center: [center[1], center[0]],
      zoom: 8,
      minZoom,
      maxZoom,
      pitch: 0,
      bearing: 0,
      interactive: true,
      dragRotate: true,
      touchPitch: true,
      cooperativeGestures: true,
    });

    mapRef.current = map;

    const ownshipEl = document.createElement('div');
    ownshipEl.style.width = '24px';
    ownshipEl.style.height = '24px';
    ownshipEl.style.borderRadius = '9999px';
    ownshipEl.style.background = '#0ea5e9';
    ownshipEl.style.border = '3px solid white';
    ownshipEl.style.boxShadow = '0 0 0 4px rgba(14,165,233,0.15)';
    ownshipEl.style.transformOrigin = 'center';
    ownshipEl.style.position = 'relative';
    ownshipEl.innerHTML = '<div style="position:absolute;left:50%;top:-6px;transform:translateX(-50%);width:2px;height:10px;background:#0ea5e9;border-radius:9999px;"></div>';

    ownshipMarkerRef.current = new maplibregl.Marker({ element: ownshipEl, anchor: 'center' });

    const syncSources = () => {
      const routeSource = map.getSource('route') as GeoJSONSource | undefined;
      const trackSource = map.getSource('track') as GeoJSONSource | undefined;
      routeSource?.setData(routeGeoJson as any);
      trackSource?.setData(trackGeoJson as any);
      routeSourceRef.current = routeSource || null;
      trackSourceRef.current = trackSource || null;
    };

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: routeGeoJson as any,
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#10b981',
          'line-width': 4,
          'line-opacity': 0.85,
          'line-dasharray': [10, 10],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: toLayerVisibility(showRouteLine) },
      });

      map.addSource('track', {
        type: 'geojson',
        data: trackGeoJson as any,
      });
      map.addLayer({
        id: 'track-line',
        type: 'line',
        source: 'track',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3,
          'line-opacity': 0.72,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: toLayerVisibility(showTrackLine) },
      });

      map.addSource('openaip-master-chart', {
        type: 'raster',
        tiles: [masterChartTileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 16,
      });
      map.addLayer({
        id: 'openaip-master-chart-layer',
        type: 'raster',
        source: 'openaip-master-chart',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
        },
        layout: { visibility: toLayerVisibility(showMasterChart) },
      } as any);

      if (tileUrl) {
        map.addSource('openaip', {
          type: 'vector',
          tiles: [tileUrl],
          minzoom: 0,
          maxzoom: 16,
        });

        const pointLabelLayout = {
          'text-field': ['coalesce', ['get', 'icaoCode'], ['get', 'identifier'], ['get', 'name']],
          'text-size': 11,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 1],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
          'icon-rotation-alignment': 'map',
          visibility: 'visible',
        } as const;

        const pointCirclePaint = {
          'circle-radius': 4,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        } as const;

        map.addLayer({
          id: 'openaip-airport-points',
          type: 'circle',
          source: 'openaip',
          'source-layer': 'airports',
          paint: {
            ...pointCirclePaint,
            'circle-color': '#2563eb',
            'circle-stroke-opacity': 0.95,
          },
          layout: { visibility: toLayerVisibility(showMasterChart && showAirports) },
        });
        map.addLayer({
          id: 'openaip-airport-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'airports',
          layout: {
            ...pointLabelLayout,
            visibility: toLayerVisibility(showLabels && showMasterChart && showAirports),
          } as any,
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.25,
          },
        });

        map.addLayer({
          id: 'openaip-navaid-points',
          type: 'circle',
          source: 'openaip',
          'source-layer': 'navaids',
          paint: {
            ...pointCirclePaint,
            'circle-color': '#7c3aed',
            'circle-stroke-opacity': 0.95,
          },
          layout: { visibility: toLayerVisibility(showMasterChart && showNavaids) },
        });
        map.addLayer({
          id: 'openaip-navaid-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'navaids',
          layout: {
            ...pointLabelLayout,
            visibility: toLayerVisibility(showLabels && showMasterChart && showNavaids),
          } as any,
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.25,
          },
        });

        map.addLayer({
          id: 'openaip-reporting-points',
          type: 'circle',
          source: 'openaip',
          'source-layer': 'reporting-points',
          paint: {
            ...pointCirclePaint,
            'circle-color': '#d97706',
            'circle-stroke-opacity': 0.95,
          },
          layout: { visibility: toLayerVisibility(showMasterChart && showReportingPoints) },
        });
        map.addLayer({
          id: 'openaip-reporting-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'reporting-points',
          layout: {
            ...pointLabelLayout,
            visibility: toLayerVisibility(showLabels && showMasterChart && showReportingPoints),
          } as any,
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.25,
          },
        });

        const addAirspaceLayers = (layerSuffix: string, sourceLayer: string, fillColor: string, lineColor: string, filter: any) => {
          map.addLayer({
            id: `openaip-airspaces-${layerSuffix}-fill`,
            type: 'fill',
            source: 'openaip',
            'source-layer': sourceLayer,
            filter,
            paint: {
              'fill-color': fillColor,
              'fill-opacity': 0.12,
            },
            layout: { visibility: toLayerVisibility(showMasterChart) },
          });
          map.addLayer({
            id: `openaip-airspaces-${layerSuffix}-line`,
            type: 'line',
            source: 'openaip',
            'source-layer': sourceLayer,
            filter,
            paint: {
              'line-color': lineColor,
              'line-width': 1.8,
              'line-opacity': 0.9,
            },
            layout: { visibility: toLayerVisibility(showMasterChart) },
          });
        };

        const activeAirspaceFilter: any = ['any', ['!has', 'hoursOfOperation'], ['==', ['get', 'active'], true]];
        addAirspaceLayers('ctr', 'airspaces', '#dc2626', '#dc2626', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'ctr']] as any);
        addAirspaceLayers('military', 'airspaces', '#ef4444', '#ef4444', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'military']] as any);
        addAirspaceLayers('training', 'airspaces', '#f59e0b', '#f59e0b', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'training']] as any);
        addAirspaceLayers('gliding', 'airspaces', '#22c55e', '#22c55e', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'gliding']] as any);
        addAirspaceLayers('hang', 'airspaces', '#a855f7', '#a855f7', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'hang']] as any);
        addAirspaceLayers('class-e', 'airspaces', '#3b82f6', '#3b82f6', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'class-e']] as any);
        addAirspaceLayers('class-f', 'airspaces', '#f97316', '#f97316', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'class-f']] as any);
        addAirspaceLayers('class-g', 'airspaces', '#14b8a6', '#14b8a6', ['all', activeAirspaceFilter, ['==', ['get', 'category'], 'class-g']] as any);

        map.addLayer({
          id: 'openaip-airspace-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'airspaces',
          filter: activeAirspaceFilter,
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', 'limits']],
            'text-size': 11,
            'text-offset': [0, 0],
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            visibility: toLayerVisibility(showLabels && showMasterChart && (showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings)),
          } as any,
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.25,
          },
        });

        map.addLayer({
          id: 'openaip-obstacles',
          type: 'circle',
          source: 'openaip',
          'source-layer': 'obstacles',
          paint: {
            'circle-color': '#ef4444',
            'circle-radius': ['case', ['>', ['to-number', ['coalesce', ['get', 'height'], 0]], 250], 5, 4],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.9,
          },
          layout: { visibility: toLayerVisibility(showMasterChart && showObstacles) },
        });
        map.addLayer({
          id: 'openaip-obstacle-labels',
          type: 'symbol',
          source: 'openaip',
          'source-layer': 'obstacles',
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', '_id']],
            'text-size': 11,
            'text-offset': [0, 1],
            'text-anchor': 'top',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            visibility: toLayerVisibility(showLabels && showMasterChart && showObstacles),
          } as any,
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.25,
          },
        });
      } else {
        map.addSource('openaip-airports', { type: 'geojson', data: airportGeoJson as any });
        map.addSource('openaip-navaids', { type: 'geojson', data: navaidGeoJson as any });
        map.addSource('openaip-reporting-points', { type: 'geojson', data: reportingGeoJson as any });
        map.addSource('openaip-airspaces-class-e', { type: 'geojson', data: loadedAirspaceCollections.classE as any });
        map.addSource('openaip-airspaces-class-f', { type: 'geojson', data: loadedAirspaceCollections.classF as any });
        map.addSource('openaip-airspaces-class-g', { type: 'geojson', data: loadedAirspaceCollections.classG as any });
        map.addSource('openaip-airspaces-ctr', { type: 'geojson', data: loadedAirspaceCollections.general as any });
        map.addSource('openaip-airspaces-military', { type: 'geojson', data: loadedAirspaceCollections.military as any });
        map.addSource('openaip-airspaces-training', { type: 'geojson', data: loadedAirspaceCollections.training as any });
        map.addSource('openaip-airspaces-gliding', { type: 'geojson', data: loadedAirspaceCollections.gliding as any });
        map.addSource('openaip-airspaces-hang', { type: 'geojson', data: loadedAirspaceCollections.hangGliding as any });
        map.addSource('openaip-obstacles', { type: 'geojson', data: loadedObstacleGeoJson as any });

        const labelLayout = {
          'text-field': ['coalesce', ['get', 'icaoCode'], ['get', 'identifier'], ['get', 'name']],
          'text-size': 11,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 1],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
          'symbol-placement': 'point',
          visibility: 'visible',
        } as any;

        const addFallbackPointLayer = (id: string, source: string, color: string, visible: boolean, labelsVisible: boolean) => {
          map.addLayer({
            id: `${id}-points`,
            type: 'circle',
            source,
            paint: {
              'circle-color': color,
              'circle-radius': 4,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.95,
            },
            layout: { visibility: toLayerVisibility(visible) },
          } as any);
          map.addLayer({
            id: `${id}-labels`,
            type: 'symbol',
            source,
            layout: {
              ...labelLayout,
              visibility: toLayerVisibility(labelsVisible),
            },
            paint: {
              'text-color': '#0f172a',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.25,
            },
          } as any);
        };

        addFallbackPointLayer('openaip-airport', 'openaip-airports', '#2563eb', showMasterChart && showAirports, showLabels && showMasterChart && showAirports);
        addFallbackPointLayer('openaip-navaid', 'openaip-navaids', '#7c3aed', showMasterChart && showNavaids, showLabels && showMasterChart && showNavaids);
        addFallbackPointLayer('openaip-reporting', 'openaip-reporting-points', '#d97706', showMasterChart && showReportingPoints, showLabels && showMasterChart && showReportingPoints);

        const addFallbackAirspaceLayer = (id: string, source: string, fillColor: string, lineColor: string, visible: boolean) => {
          map.addLayer({
            id: `${id}-fill`,
            type: 'fill',
            source,
            paint: {
              'fill-color': fillColor,
              'fill-opacity': 0.12,
            },
            layout: { visibility: toLayerVisibility(visible) },
          } as any);
          map.addLayer({
            id: `${id}-line`,
            type: 'line',
            source,
            paint: {
              'line-color': lineColor,
              'line-width': 1.8,
              'line-opacity': 0.9,
            },
            layout: { visibility: toLayerVisibility(visible) },
          } as any);
        };

        addFallbackAirspaceLayer('openaip-airspaces-ctr', 'openaip-airspaces-ctr', '#dc2626', '#dc2626', showMasterChart && showAirspaces);
        addFallbackAirspaceLayer('openaip-airspaces-military', 'openaip-airspaces-military', '#ef4444', '#ef4444', showMasterChart && showMilitaryAreas);
        addFallbackAirspaceLayer('openaip-airspaces-training', 'openaip-airspaces-training', '#f59e0b', '#f59e0b', showMasterChart && showTrainingAreas);
        addFallbackAirspaceLayer('openaip-airspaces-gliding', 'openaip-airspaces-gliding', '#22c55e', '#22c55e', showMasterChart && showGlidingSectors);
        addFallbackAirspaceLayer('openaip-airspaces-hang', 'openaip-airspaces-hang', '#a855f7', '#a855f7', showMasterChart && showHangGlidings);
        addFallbackAirspaceLayer('openaip-airspaces-class-e', 'openaip-airspaces-class-e', '#3b82f6', '#3b82f6', showMasterChart && showClassE);
        addFallbackAirspaceLayer('openaip-airspaces-class-f', 'openaip-airspaces-class-f', '#f97316', '#f97316', showMasterChart && showClassF);
        addFallbackAirspaceLayer('openaip-airspaces-class-g', 'openaip-airspaces-class-g', '#14b8a6', '#14b8a6', showMasterChart && showClassG);
        map.addLayer({
          id: 'openaip-airspace-labels',
          type: 'symbol',
          source: 'openaip-airspaces-ctr',
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', 'limits']],
            'text-size': 11,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 0],
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            visibility: toLayerVisibility(showLabels && showMasterChart && (showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings)),
          } as any,
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.25,
          },
        } as any);
        map.addLayer({
          id: 'openaip-obstacles',
          type: 'circle',
          source: 'openaip-obstacles',
          paint: {
            'circle-color': '#ef4444',
            'circle-radius': ['case', ['>', ['to-number', ['coalesce', ['get', 'height'], 0]], 250], 5, 4],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.9,
          },
          layout: { visibility: toLayerVisibility(showMasterChart && showObstacles) },
        } as any);
        map.addLayer({
          id: 'openaip-obstacle-labels',
          type: 'symbol',
          source: 'openaip-obstacles',
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', '_id']],
            'text-size': 11,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1],
            'text-anchor': 'top',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            visibility: toLayerVisibility(showLabels && showMasterChart && showObstacles),
          } as any,
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.25,
          },
        } as any);
      }

      bringAerialLayersToFront(map, [
        'openaip-airport-points',
        'openaip-airport-labels',
        'openaip-navaid-points',
        'openaip-navaid-labels',
        'openaip-reporting-points',
        'openaip-reporting-labels',
      ]);

      syncSources();
      mapRef.current?.resize();
      onZoomChange?.(map.getZoom());
      const initialCenter = map.getCenter();
      onCenterChangeRef.current?.([initialCenter.lat, initialCenter.lng]);
    });

    const handleMove = () => {
      onZoomChangeRef.current?.(map.getZoom());
      const center = map.getCenter();
      onCenterChangeRef.current?.([center.lat, center.lng]);
    };
    const handleInteraction = () => onUserInteractedRef.current?.();

    map.on('moveend', handleMove);
    map.on('zoomend', handleMove);
    map.on('dragstart', handleInteraction);
    map.on('zoomstart', handleInteraction);
    map.on('rotate', handleInteraction);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off('moveend', handleMove);
      map.off('zoomend', handleMove);
      map.off('dragstart', handleInteraction);
      map.off('zoomstart', handleInteraction);
      map.off('rotate', handleInteraction);
      ownshipMarkerRef.current?.remove();
      ownshipMarkerRef.current = null;
      waypointMarkersRef.current.forEach((marker) => marker.remove());
      waypointMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);

    const currentZoom = map.getZoom();
    if (currentZoom < minZoom) {
      map.setZoom(minZoom);
      return;
    }
    if (currentZoom > maxZoom) {
      map.setZoom(maxZoom);
    }
  }, [maxZoom, minZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || useVectorOpenAipLayers) return;

    const airportSource = map.getSource('openaip-airports') as GeoJSONSource | undefined;
    const navaidSource = map.getSource('openaip-navaids') as GeoJSONSource | undefined;
    const reportingSource = map.getSource('openaip-reporting-points') as GeoJSONSource | undefined;
    const classESource = map.getSource('openaip-airspaces-class-e') as GeoJSONSource | undefined;
    const classFSource = map.getSource('openaip-airspaces-class-f') as GeoJSONSource | undefined;
    const classGSource = map.getSource('openaip-airspaces-class-g') as GeoJSONSource | undefined;
    const ctrSource = map.getSource('openaip-airspaces-ctr') as GeoJSONSource | undefined;
    const militarySource = map.getSource('openaip-airspaces-military') as GeoJSONSource | undefined;
    const trainingSource = map.getSource('openaip-airspaces-training') as GeoJSONSource | undefined;
    const glidingSource = map.getSource('openaip-airspaces-gliding') as GeoJSONSource | undefined;
    const hangSource = map.getSource('openaip-airspaces-hang') as GeoJSONSource | undefined;
    const obstacleSource = map.getSource('openaip-obstacles') as GeoJSONSource | undefined;

    airportSource?.setData(airportGeoJson as any);
    navaidSource?.setData(navaidGeoJson as any);
    reportingSource?.setData(reportingGeoJson as any);
    classESource?.setData(loadedAirspaceCollections.classE as any);
    classFSource?.setData(loadedAirspaceCollections.classF as any);
    classGSource?.setData(loadedAirspaceCollections.classG as any);
    ctrSource?.setData(loadedAirspaceCollections.general as any);
    militarySource?.setData(loadedAirspaceCollections.military as any);
    trainingSource?.setData(loadedAirspaceCollections.training as any);
    glidingSource?.setData(loadedAirspaceCollections.gliding as any);
    hangSource?.setData(loadedAirspaceCollections.hangGliding as any);
    obstacleSource?.setData(loadedObstacleGeoJson as any);
  }, [airportGeoJson, loadedAirspaceCollections, loadedObstacleGeoJson, navaidGeoJson, reportingGeoJson, useVectorOpenAipLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    const loadVisibleOpenAipData = async () => {
      if (!showMasterChart) return;
      const bounds = map.getBounds();
      const bbox = [
        bounds.getWest().toFixed(6),
        bounds.getSouth().toFixed(6),
        bounds.getEast().toFixed(6),
        bounds.getNorth().toFixed(6),
      ].join(',');

      const activeResources = [
        showAirports ? 'airports' : null,
        showNavaids ? 'navaids' : null,
        showReportingPoints ? 'reporting-points' : null,
      ].filter(Boolean);
      const needsAirspace = showAirspaces || showClassE || showClassF || showClassG || showMilitaryAreas || showTrainingAreas || showGlidingSectors || showHangGlidings;
      const needsObstacles = showObstacles;
      const requestKey = `${bbox}|${activeResources.join(',')}|${needsAirspace ? 'airspaces' : ''}|${needsObstacles ? 'obstacles' : ''}`;
      if (lastLoadKeyRef.current === requestKey) return;
      lastLoadKeyRef.current = requestKey;

      const seq = ++loadSeqRef.current;
      const loadItems = async <T,>(resource: string) => {
        const payload = await fetchOpenAipJson<{ items?: T[] }>(`/api/openaip?resource=${resource}&bbox=${bbox}`);
        return normalizeOpenAipItems(payload);
      };

      const [airports, navaids, reportingPoints, airspaces, obstacles] = await Promise.all([
        showAirports ? loadItems<any>('airports') : Promise.resolve([]),
        showNavaids ? loadItems<any>('navaids') : Promise.resolve([]),
        showReportingPoints ? loadItems<any>('reporting-points') : Promise.resolve([]),
        needsAirspace ? loadItems<any>('airspaces') : Promise.resolve([]),
        needsObstacles ? loadItems<any>('obstacles') : Promise.resolve([]),
      ]);

      if (cancelled || seq !== loadSeqRef.current) return;

      const nextAirportFeatures = (airports as any[]).map((item) => ({ ...item, sourceLayer: 'airports' }));
      const nextNavaidFeatures = (navaids as any[]).map((item) => ({ ...item, sourceLayer: 'navaids' }));
      const nextReportingPointFeatures = (reportingPoints as any[]).map((item) => ({ ...item, sourceLayer: 'reporting-points' }));

      const mapAirspaces = (items: any[]) => ({
        classE: airspaceFeatureCollection(items.filter((item) => item.geometry?.coordinates && isAirspaceActiveNow(item) && getAirspaceClassCategory(item) === 'class-e')),
        classF: airspaceFeatureCollection(items.filter((item) => item.geometry?.coordinates && isAirspaceActiveNow(item) && getAirspaceClassCategory(item) === 'class-f')),
        classG: airspaceFeatureCollection(items.filter((item) => item.geometry?.coordinates && isAirspaceActiveNow(item) && getAirspaceClassCategory(item) === 'class-g')),
        military: airspaceFeatureCollection(items.filter((item) => item.geometry?.coordinates && isAirspaceActiveNow(item) && isMilitaryAirspace(item))),
        training: airspaceFeatureCollection(items.filter((item) => item.geometry?.coordinates && isAirspaceActiveNow(item) && isTrainingAirspace(item))),
        gliding: airspaceFeatureCollection(items.filter((item) => item.geometry?.coordinates && isAirspaceActiveNow(item) && isGlidingAirspace(item))),
        hangGliding: airspaceFeatureCollection(items.filter((item) => item.geometry?.coordinates && isAirspaceActiveNow(item) && isHangGlidingAirspace(item))),
        general: airspaceFeatureCollection(items.filter((item) => item.geometry?.coordinates && isAirspaceActiveNow(item) && (getAirspaceCategory(item) === 'other' || getAirspaceCategory(item) === 'ctr'))),
      });

      const nextAirspaceCollections = mapAirspaces(airspaces as any[]);
      const nextObstacleGeoJson = obstacleFeatureCollection((obstacles as any[]) || []);
      const nextPayloadSignature = JSON.stringify({
        airports: nextAirportFeatures,
        navaids: nextNavaidFeatures,
        reportingPoints: nextReportingPointFeatures,
        airspaces: nextAirspaceCollections,
        obstacles: nextObstacleGeoJson,
      });

      if (nextPayloadSignature === lastLoadedPayloadRef.current) {
        return;
      }

      lastLoadedPayloadRef.current = nextPayloadSignature;
      setLoadedAirportFeatures(nextAirportFeatures);
      setLoadedNavaidFeatures(nextNavaidFeatures);
      setLoadedReportingPointFeatures(nextReportingPointFeatures);
      setLoadedAirspaceCollections(nextAirspaceCollections);
      setLoadedObstacleGeoJson(nextObstacleGeoJson);
    };

    void loadVisibleOpenAipData();

    const refresh = () => {
      void loadVisibleOpenAipData();
    };

    map.on('moveend', refresh);
    map.on('zoomend', refresh);

    return () => {
      cancelled = true;
      map.off('moveend', refresh);
      map.off('zoomend', refresh);
    };
  }, [
    showAirports,
    showAirspaces,
    showClassE,
    showClassF,
    showClassG,
    showGlidingSectors,
    showHangGlidings,
    showMasterChart,
    showMilitaryAreas,
    showNavaids,
    showObstacles,
    showReportingPoints,
    showTrainingAreas,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const routeSource = map.getSource('route') as GeoJSONSource | undefined;
    routeSource?.setData(routeGeoJson as any);
    routeSourceRef.current = routeSource || null;

    if (map.getLayer('route-line')) {
      map.setLayoutProperty('route-line', 'visibility', toLayerVisibility(showRouteLine));
    }
  }, [routeGeoJson, showRouteLine]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const trackSource = map.getSource('track') as GeoJSONSource | undefined;
    trackSource?.setData(trackGeoJson as any);
    trackSourceRef.current = trackSource || null;

    if (map.getLayer('track-line')) {
      map.setLayoutProperty('track-line', 'visibility', toLayerVisibility(showTrackLine));
    }
    if (map.getLayer('openaip-master-chart-layer')) {
      map.setLayoutProperty('openaip-master-chart-layer', 'visibility', toLayerVisibility(showMasterChart));
    }
  }, [routeGeoJson, showMasterChart, showTrackLine, trackGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    waypointMarkersRef.current.forEach((marker) => marker.remove());
    waypointMarkersRef.current = [];

    if (!showWaypointMarkers) return;

    for (const leg of waypointLegs) {
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '9999px';
      el.style.background = '#10b981';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 0 2px rgba(16,185,129,0.28)';

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([leg.longitude!, leg.latitude!])
        .addTo(map);
      waypointMarkersRef.current.push(marker);
    }
  }, [showWaypointMarkers, waypointLegs]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const ownship = ownshipMarkerRef.current;
    if (!ownship) return;

    const heading = normalizeHeading(position.headingTrue) ?? 0;
    currentHeadingRef.current = heading;
    ownship
      .setLngLat([position.longitude, position.latitude])
      .addTo(map);

    const el = ownship.getElement() as HTMLDivElement;
    el.style.transform = `rotate(${heading}deg)`;

    if (!followOwnship) {
      return;
    }

    map.easeTo({
      center: [position.longitude, position.latitude],
      offset: [0, -window.innerHeight / 4],
      bearing: heading,
      duration: 0,
      essential: true,
    });
  }, [followOwnship, position]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position || recenterSignal === 0) return;

    const heading = normalizeHeading(position.headingTrue) ?? 0;
    map.easeTo({
      center: [position.longitude, position.latitude],
      offset: [0, 0],
      bearing: followOwnship ? heading : 0,
      duration: 450,
      essential: true,
    });
  }, [followOwnship, position, recenterSignal]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const [layerId, visible] of activeOpenAipLayers) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', toLayerVisibility(visible));
      }
    }
  }, [activeOpenAipLayers]);

  return <div ref={containerRef} className={className ?? 'absolute inset-0 h-full w-full'} aria-hidden="true" />;
}
