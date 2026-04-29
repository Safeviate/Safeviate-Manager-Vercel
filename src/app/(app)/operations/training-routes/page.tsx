'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2, MapIcon, Navigation, AlertTriangle, Save, Search, PlaneTakeoff, Pencil, Route } from 'lucide-react';
import { CARD_HEADER_BAND_CLASS, HEADER_ACTION_BUTTON_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { MobileActionDropdown } from '@/components/mobile-action-dropdown';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { createNavlogLegFromCoordinates } from '@/lib/flight-planner';
import { coordinatePartsToDecimal, formatLatLonDms } from '@/lib/coordinate-parser';
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';
import { OPERATIONS_MAP_CARD_CLASS, OPERATIONS_MAP_SURFACE_HEIGHT_CLASS } from '@/components/operations/operations-map-layout';
import { useIsMobile } from '@/hooks/use-mobile';
import type { TrainingRoute, NavlogLeg, Hazard, WaypointContext } from '@/types/booking';
import { v4 as uuidv4 } from 'uuid';

const getRouteTypeLabel = (routeType?: TrainingRoute['routeType']) =>
  routeType === 'other' ? 'Other Route' : 'Training Route';

const AeronauticalMap = dynamic(() => import('@/components/flight-planner/aeronautical-map'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-900 flex items-center justify-center text-white font-black uppercase tracking-widest text-[10px]">Loading Aeronautical Engine...</div>
});

const createEmptyRoute = (): TrainingRoute => ({
  id: uuidv4(),
  name: 'New Route',
  description: '',
  routeType: 'training',
  legs: [],
  hazards: [],
  tenantId: 'safeviate',
  createdAt: new Date().toISOString(),
});

type WaypointContextItem = WaypointContext['items'][number];

const WAYPOINT_KIND_LABELS: Partial<Record<NonNullable<WaypointContextItem['kind']>, string>> = {
  airport: 'Airport',
  navaid: 'Navaid',
  'reporting-point': 'Reporting Point',
  airspace: 'Airspace',
  obstacle: 'Obstacle',
  other: 'Other',
};

const formatWaypointContextKind = (kind?: WaypointContextItem['kind']) => (kind ? WAYPOINT_KIND_LABELS[kind] || kind : 'Waypoint');
const formatHeadingDegrees = (value?: number) => (value === undefined || Number.isNaN(value) ? '---' : Math.round(value).toString().padStart(3, '0'));
const getReciprocalHeading = (value?: number) => (value === undefined || Number.isNaN(value) ? undefined : (value + 180) % 360);

const WaypointContextStack = ({ context }: { context?: WaypointContext }) => {
  if (!context?.items?.length) return null;

  return (
    <div className="mt-1.5 space-y-1.5 border-t border-border/60 pt-1.5">
      <div className="space-y-1">
        {context.items.map((item, index) => (
          <div key={`${item.layer}-${item.label}-${index}`} className="rounded-md border border-border/70 bg-background/70 px-2 py-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  {formatWaypointContextKind(item.kind)}
                </p>
                <p className="text-[9px] font-black uppercase leading-tight text-foreground">
                  {item.label}
                </p>
                <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {item.layer}
                </p>
              </div>
              {item.distanceNm !== undefined && (
                <span className="shrink-0 font-mono text-[8px] font-black text-muted-foreground">
                  {item.distanceNm.toFixed(1)} NM
                </span>
              )}
            </div>
            {item.detail && <p className="mt-0.5 text-[8px] font-semibold leading-tight text-slate-700">{item.detail}</p>}
            {item.frequencies && <p className="mt-0.5 text-[8px] font-semibold leading-tight text-emerald-700">{item.frequencies}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TrainingRoutesPage() {
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const { toast } = useToast();
  const { uiMode } = useTheme();
  const isMobile = useIsMobile();
  const [routes, setRoutes] = useState<TrainingRoute[]>([]);
  const [activeRoute, setActiveRoute] = useState<TrainingRoute | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hazardToEdit, setHazardToEdit] = useState<{ lat: number; lng: number } | null>(null);
  const [hazardNote, setHazardNote] = useState('');
  const [search, setSearch] = useState('');
  const [isMapZoomPanelOpen, setIsMapZoomPanelOpen] = useState(false);
  const [isMapLayersPanelOpen, setIsMapLayersPanelOpen] = useState(false);
  const [showRouteSummary, setShowRouteSummary] = useState(true);
  const [manualWaypointName, setManualWaypointName] = useState('');
  const [manualLatHemisphere, setManualLatHemisphere] = useState<'S' | 'N'>('S');
  const [manualLatDegrees, setManualLatDegrees] = useState('');
  const [manualLatMinutes, setManualLatMinutes] = useState('');
  const [manualLatSeconds, setManualLatSeconds] = useState('');
  const [manualLonHemisphere, setManualLonHemisphere] = useState<'E' | 'W'>('E');
  const [manualLonDegrees, setManualLonDegrees] = useState('');
  const [manualLonMinutes, setManualLonMinutes] = useState('');
  const [manualLonSeconds, setManualLonSeconds] = useState('');
  const latMinutesRef = useRef<HTMLInputElement | null>(null);
  const latSecondsRef = useRef<HTMLInputElement | null>(null);
  const lonDegreesRef = useRef<HTMLInputElement | null>(null);
  const lonMinutesRef = useRef<HTMLInputElement | null>(null);
  const lonSecondsRef = useRef<HTMLInputElement | null>(null);
  const isModern = uiMode === 'modern';
  const routePlannerCompactButtonClass =
    'h-8 rounded-md px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-none gap-1.5 shrink-0';
  const routePlannerSecondaryButtonClass = cn(
    routePlannerCompactButtonClass,
    'border border-input bg-background text-foreground hover:bg-muted/50',
  );
  const routePlannerPrimaryButtonClass = cn(
    routePlannerCompactButtonClass,
    'border border-slate-900 bg-slate-900 text-white hover:bg-slate-800',
  );

  useEffect(() => {
    if (isMobile) {
      setShowRouteSummary(false);
      return;
    }
    if (activeRoute) {
      setShowRouteSummary(true);
    }
  }, [activeRoute, isMobile]);

  useEffect(() => {
      const loadRoutes = async () => {
        try {
          const res = await fetch('/api/training-routes', { cache: 'no-store' });
          const data = await res.json();
        const nextRoutes = Array.isArray(data.routes)
          ? data.routes.map((route: TrainingRoute) => ({
              ...route,
              routeType: route.routeType === 'other' ? 'other' : 'training',
            }))
          : [];
        setRoutes(nextRoutes);
        if (!activeRoute && nextRoutes.length > 0) setActiveRoute(nextRoutes[0]);
        } catch {
          setRoutes([]);
        }
    };
    loadRoutes();
  }, []);

  const persistRoute = async (route: TrainingRoute, method: 'POST' | 'PATCH') => {
    const res = await fetch('/api/training-routes', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Failed to save route.');
  };

  const handleCreateNew = () => {
    const newRoute = createEmptyRoute();
    setActiveRoute(newRoute);
    setIsEditing(true);
    setShowRouteSummary(true);
  };

  const handleAddWaypoint = (
    lat: number,
    lon: number,
    identifier?: string,
    frequencies?: string,
    layerInfo?: string,
    waypointContext?: WaypointContext
  ) => {
    if (!isEditing || !activeRoute) return;
    const newLeg = createNavlogLegFromCoordinates(
      activeRoute.legs,
      lat,
      lon,
      identifier || `WP ${activeRoute.legs.length + 1}`,
      frequencies,
      layerInfo,
      waypointContext,
    );
    setActiveRoute({ ...activeRoute, legs: [...activeRoute.legs, newLeg] });
  };

  const handleMoveWaypoint = (legId: string, lat: number, lon: number) => {
    if (!isEditing || !activeRoute) return;

    const movedLegs = activeRoute.legs.map((leg) =>
      leg.id === legId ? { ...leg, latitude: lat, longitude: lon } : leg
    );

    const recalculatedLegs = movedLegs.map((leg, index) => {
      const rebuiltLeg = createNavlogLegFromCoordinates(
        movedLegs.slice(0, index),
        leg.latitude ?? 0,
        leg.longitude ?? 0,
        leg.waypoint?.replace(/-\d+$/, '') || 'PNT',
        leg.frequencies,
        leg.layerInfo,
        leg.waypointContext,
      );

      return {
        ...leg,
        ...rebuiltLeg,
        id: leg.id,
      };
    });

    setActiveRoute({ ...activeRoute, legs: recalculatedLegs });
    toast({ title: 'Waypoint moved', description: 'Route leg calculations updated.' });
  };

  const handleAddHazardRequest = (lat: number, lng: number) => {
    setHazardToEdit({ lat, lng });
    setHazardNote('');
  };

  const handleAddManualWaypoint = () => {
    if (!isEditing || !activeRoute) return;

    const lat = coordinatePartsToDecimal({
      axis: 'lat',
      hemisphere: manualLatHemisphere,
      degrees: manualLatDegrees,
      minutes: manualLatMinutes,
      seconds: manualLatSeconds,
    });
    const lon = coordinatePartsToDecimal({
      axis: 'lon',
      hemisphere: manualLonHemisphere,
      degrees: manualLonDegrees,
      minutes: manualLonMinutes,
      seconds: manualLonSeconds,
    });

    if (lat === null || lon === null) {
      toast({ variant: 'destructive', title: 'Invalid coordinates', description: 'Check the hemisphere, degrees, minutes, and seconds fields.' });
      return;
    }

    const identifier = manualWaypointName.trim() || 'PNT';
    const newLeg = createNavlogLegFromCoordinates(
      activeRoute.legs,
      lat,
      lon,
      identifier,
      undefined,
      'Manual Coordinates'
    );

    setActiveRoute({ ...activeRoute, legs: [...activeRoute.legs, newLeg] });
    setManualWaypointName('');
    setManualLatDegrees('');
    setManualLatMinutes('');
    setManualLatSeconds('');
    setManualLonDegrees('');
    setManualLonMinutes('');
    setManualLonSeconds('');
    toast({ title: 'Waypoint added', description: `${identifier} added from manual coordinates.` });
  };

  const handleCoordinatePartChange = (
    value: string,
    setValue: (next: string) => void,
    nextField?: React.RefObject<HTMLInputElement | null>,
    maxDigits = 2
  ) => {
    const sanitized = value.replace(/[^\d]/g, '').slice(0, maxDigits);
    setValue(sanitized);
    if (nextField && sanitized.length === maxDigits) {
      nextField.current?.focus();
      nextField.current?.select();
    }
  };

  const confirmAddHazard = () => {
    if (!hazardToEdit || !activeRoute) return;
    const newHazard: Hazard = { id: uuidv4(), lat: hazardToEdit.lat, lng: hazardToEdit.lng, note: hazardNote, severity: 'medium' };
    setActiveRoute({ ...activeRoute, hazards: [...activeRoute.hazards, newHazard] });
    setHazardToEdit(null);
  };

  const handleSave = async () => {
    if (!activeRoute) return;
    try {
      const exists = routes.some((route) => route.id === activeRoute.id);
      await persistRoute(activeRoute, exists ? 'PATCH' : 'POST');
      const nextRoutes = exists ? routes.map((route) => (route.id === activeRoute.id ? activeRoute : route)) : [activeRoute, ...routes];
      setRoutes(nextRoutes);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (routeId: string) => {
    try {
      await fetch(`/api/training-routes?id=${routeId}`, { method: 'DELETE' });
      const nextRoutes = routes.filter((route) => route.id !== routeId);
      setRoutes(nextRoutes);
      if (activeRoute?.id === routeId) {
        setActiveRoute(nextRoutes[0] ?? createEmptyRoute());
        setIsEditing(nextRoutes.length === 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRoutes = useMemo(
    () => routes.filter((route) => route.name.toLowerCase().includes(search.toLowerCase()) || route.description.toLowerCase().includes(search.toLowerCase())),
    [routes, search]
  );

  if (isTenantLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-background px-6 py-12 text-center">
        <div className="space-y-4">
          <PlaneTakeoff className="mx-auto h-8 w-8 text-slate-400" />
          <p className="text-sm font-black uppercase tracking-widest">Loading Route Planner</p>
        </div>
      </div>
    );
  }

  if (
    !shouldBypassIndustryRestrictions(tenant?.id) &&
    !isHrefEnabledForIndustry('/operations/training-routes', tenant?.industry) &&
    !(tenant?.enabledMenus?.includes('/operations/training-routes') ?? false)
  ) {
    return (
      <Card className="mx-auto w-full max-w-3xl border shadow-none">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight">Route Planner Unavailable</h1>
            <p className="text-sm text-muted-foreground">Route planning is only available for aviation tenants.</p>
          </div>
          <Button asChild variant="outline" className="font-black uppercase">
            <Link href="/operations">Back to Operations</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('mx-auto flex h-full min-h-0 w-full lg:max-w-[1100px] flex-1 flex-col gap-4 overflow-hidden px-1 pt-4', isModern && 'gap-4')}>
      <Card className={cn(OPERATIONS_MAP_CARD_CLASS, isModern && 'border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)]')}>
        <CardHeader className={cn(CARD_HEADER_BAND_CLASS, isModern && 'bg-transparent')}>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="hidden flex-wrap items-center justify-center gap-2 md:flex">
              <Button
                variant="outline"
                onClick={() => {
                  setIsMapZoomPanelOpen((current) => {
                    const next = !current;
                    if (next) setIsMapLayersPanelOpen(false);
                    return next;
                  });
                }}
                className={cn(routePlannerSecondaryButtonClass, isModern && 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}
              >
                Map Zoom
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsMapLayersPanelOpen((current) => {
                    const next = !current;
                    if (next) setIsMapZoomPanelOpen(false);
                    return next;
                  });
                }}
                className={cn(routePlannerSecondaryButtonClass, isModern && 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}
              >
                Map Layers
              </Button>
              <Button
                onClick={handleCreateNew}
                className={cn(routePlannerPrimaryButtonClass, isModern && 'border-slate-200 bg-slate-800 text-white hover:bg-slate-700')}
              >
                <Plus size={14} className="mr-2" /> New Route
              </Button>
            </div>
            <MobileActionDropdown icon={Navigation} label="Route Actions" className="md:hidden">
              <DropdownMenuItem
                onClick={() => {
                  setIsMapZoomPanelOpen((current) => {
                    const next = !current;
                    if (next) setIsMapLayersPanelOpen(false);
                    return next;
                  });
                }}
                className="text-[11px] font-semibold uppercase"
              >
                Map Zoom
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsMapLayersPanelOpen((current) => {
                    const next = !current;
                    if (next) setIsMapZoomPanelOpen(false);
                    return next;
                  });
                }}
                className="text-[11px] font-semibold uppercase"
              >
                Map Layers
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleCreateNew}
                className="text-[11px] font-semibold uppercase"
              >
                <Plus size={14} className="mr-2" />
                New Route
              </DropdownMenuItem>
            </MobileActionDropdown>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div
            className={cn(
              'relative flex min-h-0 flex-1 overflow-hidden overscroll-contain',
              isMobile && 'min-h-[calc(100svh-15rem)]'
            )}
            style={isMobile ? { overscrollBehavior: 'contain' } : undefined}
          >
            <div className={cn('relative z-20 flex min-h-0 flex-1 overflow-visible bg-slate-900', isMobile && 'min-h-[calc(100svh-15rem)]', isModern && 'bg-white')}>
              <AeronauticalMap
                legs={activeRoute?.legs || []}
                hazards={activeRoute?.hazards || []}
                onAddWaypoint={handleAddWaypoint}
                onMoveWaypoint={handleMoveWaypoint}
                onAddHazard={handleAddHazardRequest}
                isEditing={isEditing}
                isZoomPanelOpen={isMapZoomPanelOpen}
                onZoomPanelOpenChange={setIsMapZoomPanelOpen}
                isLayersPanelOpen={isMapLayersPanelOpen}
                onLayersPanelOpenChange={setIsMapLayersPanelOpen}
              />
              <button
                type="button"
                className="absolute right-3 top-16 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-xl backdrop-blur hover:bg-slate-50 md:right-4 md:top-4"
                onClick={() => setShowRouteSummary((current) => !current)}
                aria-label={showRouteSummary ? 'Hide route summary' : 'Show route summary'}
                title={showRouteSummary ? 'Hide route summary' : 'Show route summary'}
              >
                <Route className="h-4 w-4" />
              </button>
              {!isEditing && activeRoute && (
                <div className="absolute bottom-6 left-1/2 z-[1000] -translate-x-1/2">
                  <Button onClick={() => setIsEditing(true)} className="h-10 rounded-full border bg-white/95 px-6 text-[10px] font-black uppercase text-black shadow-2xl hover:bg-white">
                    Edit Route Engine
                  </Button>
                </div>
              )}
            </div>

            {showRouteSummary ? (
              <div className="absolute inset-x-3 bottom-3 z-30 md:inset-y-3 md:left-auto md:right-3 md:w-[22rem]">
                <Card className="flex max-h-[42svh] min-h-0 flex-col overflow-hidden border border-border/70 bg-background/98 shadow-2xl backdrop-blur md:h-full md:max-h-none">
                  <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b px-3 py-2.5">
                    <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                      <MapIcon className="h-3.5 w-3.5 text-emerald-600" />
                      {activeRoute ? 'Route Summary' : 'Select a Route'}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowRouteSummary(false)}>
                      <Route className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-6 p-3">
                      {activeRoute ? (
                        <>
                          <div className={cn('space-y-4 border-b pb-6', isModern && 'border-slate-200/80')}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Route Profile</p>
                              <div className="flex items-center gap-2">
                                {!isEditing ? (
                                  <Button variant="outline" onClick={() => setIsEditing(true)} className={HEADER_SECONDARY_BUTTON_CLASS}>
                                    <Pencil size={14} className="mr-2" /> Edit
                                  </Button>
                                ) : null}
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(activeRoute.id)}>
                                  <Trash2 size={14} />
                                </Button>
                                <Button onClick={handleSave} disabled={!isEditing} className={HEADER_ACTION_BUTTON_CLASS}>
                                  <Save size={14} className="mr-2" /> Save
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">Saved Routes</label>
                                <Select
                                  value={activeRoute?.id ?? ''}
                                  onValueChange={(routeId) => {
                                    const selectedRoute = routes.find((route) => route.id === routeId) || null;
                                    setActiveRoute(selectedRoute);
                                    setIsEditing(false);
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-[10px] font-black uppercase">
                                    <SelectValue placeholder={routes.length ? 'Select saved route' : 'No saved routes'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {routes.map((route) => (
                                      <SelectItem key={route.id} value={route.id}>
                                        {route.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">Route Name</label>
                                <Input value={activeRoute.name} onChange={(e) => setActiveRoute({ ...activeRoute, name: e.target.value })} className="h-9 text-xs font-black uppercase" readOnly={!isEditing} />
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">Route Type</label>
                                <Select
                                  value={activeRoute.routeType || 'training'}
                                  onValueChange={(value) => setActiveRoute({ ...activeRoute, routeType: value === 'other' ? 'other' : 'training' })}
                                  disabled={!isEditing}
                                >
                                  <SelectTrigger className="h-9 text-xs font-black uppercase">
                                    <SelectValue placeholder="Select route type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="training">Training Route</SelectItem>
                                    <SelectItem value="other">Other Route</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">Description / Notes</label>
                                <Textarea value={activeRoute.description} onChange={(e) => setActiveRoute({ ...activeRoute, description: e.target.value })} className="min-h-[60px] text-[10px] font-bold" readOnly={!isEditing} placeholder="Route notes, sector details, frequency requirements, etc." />
                              </div>
                            </div>
                          </div>

                          <section className="space-y-4">
                            {isEditing ? (
                              <div className={cn('rounded-xl border bg-background p-3', isModern && 'border-slate-200/90 bg-slate-50/70')}>
                                <div className="mb-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Manual Coordinates</p>
                                  <p className="mt-1 text-[10px] font-semibold text-muted-foreground">Enter latitude first, then longitude, using separate fields for quick tab entry.</p>
                                </div>
                                <div className="space-y-2">
                                  <Input
                                    value={manualWaypointName}
                                    onChange={(event) => setManualWaypointName(event.target.value)}
                                    placeholder="Waypoint label"
                                    className="h-9 text-[10px] font-black uppercase"
                                  />
                                  <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Latitude</p>
                                    <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] gap-2">
                                      <Select value={manualLatHemisphere} onValueChange={(value) => setManualLatHemisphere(value as 'S' | 'N')}>
                                        <SelectTrigger className="h-9 text-[10px] font-black uppercase">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="S">South</SelectItem>
                                          <SelectItem value="N">North</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input value={manualLatDegrees} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLatDegrees, latMinutesRef, 2)} placeholder="Deg" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                      <Input ref={latMinutesRef} value={manualLatMinutes} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLatMinutes, latSecondsRef, 2)} placeholder="Min" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                      <Input ref={latSecondsRef} value={manualLatSeconds} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLatSeconds, lonDegreesRef, 2)} placeholder="Sec" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Longitude</p>
                                    <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] gap-2">
                                      <Select value={manualLonHemisphere} onValueChange={(value) => setManualLonHemisphere(value as 'E' | 'W')}>
                                        <SelectTrigger className="h-9 text-[10px] font-black uppercase">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="E">East</SelectItem>
                                          <SelectItem value="W">West</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input ref={lonDegreesRef} value={manualLonDegrees} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLonDegrees, lonMinutesRef, 3)} placeholder="Deg" inputMode="numeric" maxLength={3} className="h-9 text-[10px] font-semibold" />
                                      <Input ref={lonMinutesRef} value={manualLonMinutes} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLonMinutes, lonSecondsRef, 2)} placeholder="Min" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                      <Input ref={lonSecondsRef} value={manualLonSeconds} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLonSeconds, undefined, 2)} placeholder="Sec" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                    </div>
                                  </div>
                                  <p className="text-[9px] font-semibold text-muted-foreground">
                                    Type each number separately, then tab to the next field.
                                  </p>
                                  <Button onClick={handleAddManualWaypoint} className={HEADER_ACTION_BUTTON_CLASS}>
                                    <Plus size={14} className="mr-2" />
                                    Add Coordinates
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" /> Planned Legs
                            </h3>
                            <div className="space-y-2">
                              {activeRoute.legs.map((leg, i) => {
                                const displayTitle = leg.waypoint || 'PNT';
                                const isOriginWaypoint = i === 0;
                                const hasWaypointContext = Boolean(leg.waypointContext?.items?.length);
                                const metaLine = [hasWaypointContext ? null : leg.frequencies || leg.layerInfo, formatLatLonDms(leg.latitude, leg.longitude)]
                                  .filter(Boolean)
                                  .join(' | ');

                                return (
                                  <div key={leg.id} className={cn('group rounded-xl border bg-background p-3 transition-colors hover:bg-muted/20', isModern && 'border-slate-200/90 bg-slate-50/70')}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        {isEditing ? (
                                          <Input
                                            value={displayTitle}
                                            onChange={(e) => {
                                              const rawValue = e.target.value.trim();
                                              const next = [...activeRoute.legs];
                                              next[i].waypoint = rawValue.replace(/-\d+$/, '') || 'PNT';
                                              setActiveRoute({ ...activeRoute, legs: next });
                                            }}
                                            className="h-6 w-full max-w-[16rem] border-none p-0 text-[11px] font-black uppercase text-slate-900 shadow-none focus-visible:ring-0"
                                            readOnly={!isEditing}
                                          />
                                        ) : (
                                          <p className="break-words text-[11px] font-black uppercase leading-tight text-slate-900">{displayTitle}</p>
                                        )}

                                        {metaLine ? (
                                          <p className="mt-1 text-[8px] font-semibold leading-tight text-emerald-700">
                                            {metaLine}
                                          </p>
                                        ) : null}

                                        <WaypointContextStack context={leg.waypointContext} />

                                        <div className="mt-2 flex gap-5">
                                          <div className="flex flex-col">
                                            <span className="text-[8px] font-bold uppercase text-muted-foreground">Dist</span>
                                            <span className="text-[10px] font-black text-slate-900">{isOriginWaypoint ? '---' : `${leg.distance?.toFixed(1) || '0.0'} NM`}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-[8px] font-bold uppercase text-muted-foreground">TRK</span>
                                            <span className="text-[10px] font-black text-slate-900">{isOriginWaypoint ? '---' : `${formatHeadingDegrees(getReciprocalHeading(leg.magneticHeading))}°`}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="shrink-0 flex flex-col items-end gap-2">
                                        {isEditing ? (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                                            onClick={() => setActiveRoute({ ...activeRoute, legs: activeRoute.legs.filter((item) => item.id !== leg.id) })}
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {activeRoute.legs.length === 0 && (
                                <div className="rounded-xl border border-dashed bg-muted/5 py-8 text-center">
                                  <Navigation className="mx-auto mb-2 h-6 w-6 opacity-50 text-muted-foreground" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Click map to add waypoints</p>
                                </div>
                              )}
                            </div>
                          </section>

                          <Separator />

                          <section className="space-y-4">
                            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-destructive">
                              <div className="h-2 w-2 rounded-full bg-destructive" /> Safety Hazards
                            </h3>
                            <div className="space-y-2">
                              {activeRoute.hazards.map((hazard) => (
                                <div key={hazard.id} className="group relative space-y-2 rounded-xl border border-destructive/10 bg-destructive/5 p-3 transition-all hover:border-destructive/30">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="destructive" className="h-4 text-[8px] font-black uppercase">Alert</Badge>
                                    {isEditing && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() => setActiveRoute({ ...activeRoute, hazards: activeRoute.hazards.filter((item) => item.id !== hazard.id) })}
                                      >
                                        <Trash2 size={12} />
                                      </Button>
                                    )}
                                  </div>
                                  <Textarea
                                    value={hazard.note}
                                    onChange={(e) => setActiveRoute({ ...activeRoute, hazards: activeRoute.hazards.map((item) => item.id === hazard.id ? { ...item, note: e.target.value } : item) })}
                                    className="h-16 resize-none border-none bg-transparent p-0 text-[10px] font-bold leading-relaxed shadow-none focus-visible:ring-0"
                                    placeholder="Hazard description..."
                                    readOnly={!isEditing}
                                  />
                                  <p className="font-mono text-[8px] font-black text-destructive/60">{formatLatLonDms(hazard.lat, hazard.lng)}</p>
                                </div>
                              ))}
                              {activeRoute.hazards.length === 0 && (
                                <div className="rounded-xl border border-dashed bg-muted/5 py-8 text-center">
                                  <AlertTriangle className="mx-auto mb-2 h-6 w-6 opacity-40 text-muted-foreground" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mark hazards from the map</p>
                                </div>
                              )}
                            </div>
                          </section>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-4 p-4 text-center opacity-40">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <MapIcon size={24} />
                          </div>
                          <div className="max-w-xs space-y-2">
                            <p className="text-xs font-black uppercase tracking-tight">Select a Route</p>
                            <p className="text-[10px] font-bold leading-relaxed">Choose a route from the list or create a new one to begin planning.</p>
                            <Select
                              value=""
                              onValueChange={(routeId) => {
                                const selectedRoute = routes.find((route) => route.id === routeId) || null;
                                setActiveRoute(selectedRoute);
                                setIsEditing(false);
                                setShowRouteSummary(true);
                              }}
                            >
                              <SelectTrigger className="h-9 text-[10px] font-black uppercase">
                                <SelectValue placeholder={routes.length ? 'Select saved route' : 'No saved routes'} />
                              </SelectTrigger>
                              <SelectContent>
                                {routes.map((route) => (
                                  <SelectItem key={route.id} value={route.id}>
                                    {route.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleCreateNew} className={HEADER_ACTION_BUTTON_CLASS}>
                              <Plus size={14} className="mr-2" />
                              New Route
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!hazardToEdit} onOpenChange={() => setHazardToEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest"><AlertTriangle className="h-4 w-4 text-destructive" /> Mark Safety Hazard</DialogTitle>
            <DialogDescription>Describe the hazard and save it with the route.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Hazard Description</label>
              <Textarea value={hazardNote} onChange={(e) => setHazardNote(e.target.value)} placeholder="Describe the hazard..." className="min-h-[100px] text-xs font-bold" />
            </div>
            <p className="text-center font-mono text-[9px] font-bold text-muted-foreground">Target: {formatLatLonDms(hazardToEdit?.lat, hazardToEdit?.lng)}</p>
          </div>
            <DialogFooter>
            <DialogClose asChild><Button variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS}>Cancel</Button></DialogClose>
            <Button onClick={confirmAddHazard} className={HEADER_ACTION_BUTTON_CLASS}>Add Marker</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

