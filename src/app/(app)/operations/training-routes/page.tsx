'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2, MapIcon, Navigation, AlertTriangle, Save, Search, PlaneTakeoff, Pencil } from 'lucide-react';
import { HEADER_ACTION_BUTTON_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { createNavlogLegFromCoordinates } from '@/lib/flight-planner';
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';
import { calculateRouteTotals, createNavlogLegFromCoordinates } from '@/lib/flight-planner';
import { cn } from '@/lib/utils';
import type { TrainingRoute, NavlogLeg, Hazard } from '@/types/booking';
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

export default function TrainingRoutesPage() {
  type InspectorTab = 'routes' | 'selected' | null;
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const { uiMode } = useTheme();
  const [routes, setRoutes] = useState<TrainingRoute[]>([]);
  const [activeRoute, setActiveRoute] = useState<TrainingRoute | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hazardToEdit, setHazardToEdit] = useState<{ lat: number; lng: number } | null>(null);
  const [hazardNote, setHazardNote] = useState('');
  const [search, setSearch] = useState('');
  const [isMapZoomPanelOpen, setIsMapZoomPanelOpen] = useState(false);
  const [isMapLayersPanelOpen, setIsMapLayersPanelOpen] = useState(false);
  const isModern = uiMode === 'modern';

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
    setRouteNameDraft('');
    setIsEditing(true);
    setInspectorTab('selected');
  };

  const handleAddWaypoint = (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => {
    if (!isEditing || !activeRoute) return;
    const newLeg = createNavlogLegFromCoordinates(
      activeRoute.legs,
      lat,
      lon,
      identifier || `WP ${activeRoute.legs.length + 1}`,
      frequencies,
      layerInfo,
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
      );

      return {
        ...leg,
        ...rebuiltLeg,
        id: leg.id,
      };
    });

    setActiveRoute({ ...activeRoute, legs: recalculatedLegs });
  };

  const handleAddHazardRequest = (lat: number, lng: number) => {
    setHazardToEdit({ lat, lng });
    setHazardNote('');
  };

  const confirmAddHazard = () => {
    if (!hazardToEdit || !activeRoute) return;
    const newHazard: Hazard = { id: uuidv4(), lat: hazardToEdit.lat, lng: hazardToEdit.lng, note: hazardNote, severity: 'medium' };
    setActiveRoute({ ...activeRoute, hazards: [...activeRoute.hazards, newHazard] });
    setHazardToEdit(null);
  };

  const handleSave = async (nameOverride?: string) => {
    if (!activeRoute) return;
    const nextName = (nameOverride ?? routeNameDraft ?? activeRoute.name).trim() || activeRoute.name.trim();
    if (!nextName) return;
    try {
      const nextRoute = {
        ...activeRoute,
        name: nextName,
      };
      const exists = routes.some((route) => route.id === activeRoute.id);
      await persistRoute(nextRoute, exists ? 'PATCH' : 'POST');
      const nextRoutes = exists ? routes.map((route) => (route.id === activeRoute.id ? nextRoute : route)) : [nextRoute, ...routes];
      setRoutes(nextRoutes);
      setActiveRoute(nextRoute);
      setRouteNameDraft(nextRoute.name);
      setIsEditing(false);
      setSaveRouteOpen(false);
      setInspectorTab('selected');
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearRoute = () => {
    if (!activeRoute) return;
    setActiveRoute({
      ...activeRoute,
      legs: [],
      hazards: [],
    });
    setIsEditing(true);
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
  const routeTotals = useMemo(() => calculateRouteTotals(activeRoute?.legs || []), [activeRoute?.legs]);

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
    <div className={cn('mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-6 overflow-y-auto p-4 pt-6 md:p-8', isModern && 'gap-7')}>
      <Card className={cn('flex min-h-0 flex-1 flex-col overflow-hidden border shadow-none', isModern && 'border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)]')}>
        <CardHeader className={cn('border-b bg-muted/20 px-4 py-3 sm:px-5', isModern && 'bg-transparent')}>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsMapZoomPanelOpen(true)}
              className={cn(HEADER_ACTION_BUTTON_CLASS, isModern && 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}
            >
              Map Zoom
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsMapLayersPanelOpen(true)}
              className={cn(HEADER_ACTION_BUTTON_CLASS, isModern && 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}
            >
              Map Layers
            </Button>
            <Button onClick={handleCreateNew} className={cn(HEADER_ACTION_BUTTON_CLASS, isModern && 'border-slate-200 bg-slate-800 text-white hover:bg-slate-700')}>
              <Plus size={14} className="mr-2" /> New Route
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="grid min-h-[70vh] grid-cols-1 overflow-hidden lg:h-full lg:grid-cols-[minmax(0,1fr)_350px]">
            <div className={cn('relative order-1 flex min-h-[320px] flex-col overflow-hidden bg-slate-900 lg:h-full lg:min-h-0', isModern && 'bg-white')}>
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
              {!isEditing && activeRoute && (<div className="absolute bottom-6 left-1/2 z-[1000] -translate-x-1/2"><Button onClick={() => setIsEditing(true)} className="h-10 rounded-full border bg-white/95 px-6 text-[10px] font-black uppercase text-black shadow-2xl hover:bg-white">Edit Route Engine</Button></div>)}
            </div>

            <div className={cn('order-2 flex max-h-[70vh] min-h-0 flex-col overflow-hidden border-t bg-background lg:h-full lg:max-h-none lg:border-l lg:border-t-0', isModern && 'border-slate-200/80 bg-white')}>
              {activeRoute ? (
                <ScrollArea className="flex-1">
                  <div className="space-y-8 p-6 pb-12">
                    <div className={cn('space-y-4 border-b pb-6', isModern && 'border-slate-200/80')}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Route Profile</p>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <Button variant="outline" onClick={() => setIsEditing(true)} className={HEADER_SECONDARY_BUTTON_CLASS}><Pencil size={14} className="mr-2" /> Edit</Button>
                        ) : null}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(activeRoute.id)}><Trash2 size={14} /></Button>
                        <Button onClick={handleSave} disabled={!isEditing} className={HEADER_ACTION_BUTTON_CLASS}><Save size={14} className="mr-2" /> Save</Button>
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
                    <div className="space-y-8">
                      <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Planned Legs</h3>
                        <div className="space-y-2">
                          {activeRoute.legs.map((leg, i) => {
                        const displayTitle = leg.waypoint || 'PNT';
                            const detailLines = [leg.frequencies, leg.layerInfo].filter(Boolean);

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
                                      <p className="text-[11px] font-black uppercase leading-tight text-slate-900 break-words">{displayTitle}</p>
                                    )}

                                    {detailLines.map((line, index) => (
                                      <p
                                        key={`${leg.id}-detail-${index}`}
                                        className={cn(
                                          'mt-1 text-[9px] font-semibold leading-tight',
                                          index === 0 ? 'text-slate-700' : 'text-slate-700'
                                        )}
                                      >
                                        {line}
                                      </p>
                                    ))}

                                    <div className="mt-2 flex gap-5">
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-bold uppercase text-muted-foreground">Dist</span>
                                        <span className="text-[10px] font-black text-slate-900">{leg.distance?.toFixed(1) || '0.0'} NM</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-bold uppercase text-muted-foreground">HDG</span>
                                        <span className="text-[10px] font-black text-slate-900">{leg.magneticHeading?.toFixed(0) || '0'}°</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex flex-col items-end gap-2">
                                    <span className="font-mono text-[8px] text-muted-foreground">
                                      {leg.latitude?.toFixed(2)}, {leg.longitude?.toFixed(2)}
                                    </span>
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
                          {activeRoute.legs.length === 0 && <div className="rounded-xl border border-dashed bg-muted/5 py-8 text-center"><Navigation className="mx-auto mb-2 h-6 w-6 opacity-50 text-muted-foreground" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Click map to add waypoints</p></div>}
                        </div>
                      </section>
                      <Separator />
                      <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-destructive"><div className="h-2 w-2 rounded-full bg-destructive" /> Safety Hazards</h3>
                        <div className="space-y-2">
                          {activeRoute.hazards.map((hazard) => (
                            <div key={hazard.id} className="group relative space-y-2 rounded-xl border border-destructive/10 bg-destructive/5 p-3 transition-all hover:border-destructive/30">
                              <div className="flex items-center justify-between">
                                <Badge variant="destructive" className="h-4 text-[8px] font-black uppercase">Alert</Badge>
                                {isEditing && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setActiveRoute({ ...activeRoute, hazards: activeRoute.hazards.filter((item) => item.id !== hazard.id) })}><Trash2 size={12} /></Button>}
                              </div>
                              <Textarea value={hazard.note} onChange={(e) => setActiveRoute({ ...activeRoute, hazards: activeRoute.hazards.map((item) => item.id === hazard.id ? { ...item, note: e.target.value } : item) })} className="h-16 resize-none border-none bg-transparent p-0 text-[10px] font-bold leading-relaxed shadow-none focus-visible:ring-0" placeholder="Hazard description..." readOnly={!isEditing} />
                              <p className="font-mono text-[8px] font-black text-destructive/60">{hazard.lat.toFixed(4)}, {hazard.lng.toFixed(4)}</p>
                            </div>
                          ))}
                          {activeRoute.hazards.length === 0 && <div className="rounded-xl border border-dashed bg-muted/5 py-8 text-center"><AlertTriangle className="mx-auto mb-2 h-6 w-6 opacity-40 text-muted-foreground" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mark hazards from the map</p></div>}
                        </div>
                      </section>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-4 p-12 text-center opacity-40">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><MapIcon size={32} /></div>
                  <div className="max-w-xs">
                    <p className="text-xs font-black uppercase tracking-tight">Select a Route</p>
                    <p className="mt-2 text-[10px] font-bold leading-relaxed">Choose a route from the list or create a new one to begin planning.</p>
                  </div>
                ) : null}
              </div>

              <div className="hidden pointer-events-auto absolute right-0 top-0 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
                <div className={`flex items-center justify-between gap-3 px-3 ${showSelectedRoute ? 'h-10 border-b border-slate-100' : 'h-10'}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Draft Route</p>
                    <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {activeRoute ? `${activeRoute.name} â€¢ ${activeRoute.legs.length} legs` : 'No route selected'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 rounded-full border-slate-200 bg-white px-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700"
                    onClick={() => setShowSelectedRoute((current) => !current)}
                  >
                    {showSelectedRoute ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
                {showSelectedRoute ? (
                <div className="max-h-[calc(100vh-12rem)] overflow-hidden">
                  {activeRoute ? (
                    <div className="flex h-full flex-col">
                      <div className="space-y-3 border-b p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Route Profile</p>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(activeRoute.id)}><Trash2 size={14} /></Button>
                              <Button variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS} onClick={handleClearRoute}>
                                Clear Route
                              </Button>
                              <Button
                                onClick={() => {
                                  setRouteNameDraft(activeRoute.name);
                                  setSaveRouteOpen(true);
                                }}
                                disabled={!isEditing}
                                className={HEADER_ACTION_BUTTON_CLASS}
                              >
                                <Save size={14} className="mr-2" /> Save Route
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">Route Name</label>
                              <Input
                                value={activeRoute.name}
                                onChange={(e) => setActiveRoute({ ...activeRoute, name: e.target.value })}
                                className="h-9 text-xs font-black uppercase"
                                readOnly={!isEditing}
                                placeholder="Enter route name"
                              />
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
                      <ScrollArea className="flex-1 max-h-[calc(100vh-24rem)]">
                        <div className="space-y-8 p-4 pb-12">
                          <section className="space-y-4">
                            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Planned Legs</h3>
                            <div className="space-y-2">
                              {activeRoute.legs.map((leg, i) => (
                                <div key={leg.id} className="group overflow-hidden rounded-xl border bg-background p-3 shadow-sm transition-all hover:border-primary/20">
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-black uppercase">{i + 1}</div>
                                      <Input value={leg.waypoint} onChange={(e) => { const next = [...activeRoute.legs]; next[i].waypoint = e.target.value; setActiveRoute({ ...activeRoute, legs: next }); }} className="h-6 w-24 border-none p-0 text-[10px] font-bold uppercase shadow-none focus-visible:ring-0" readOnly={!isEditing} />
                                    </div>
                                    {isEditing && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 transition-opacity group-hover:opacity-100" onClick={() => handleDeleteWaypoint(leg.id)}><Trash2 size={12} /></Button>}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[8px] font-black uppercase text-muted-foreground">Alt (ft)</p>
                                      <Input type="number" value={leg.altitude} onChange={(e) => { const next = [...activeRoute.legs]; next[i].altitude = Number(e.target.value); setActiveRoute({ ...activeRoute, legs: next }); }} className="h-7 border-dashed text-[10px] font-black" readOnly={!isEditing} />
                                    </div>
                                    <div className="flex items-end justify-end">
                                      <p className="font-mono text-[9px] font-bold text-muted-foreground">{leg.latitude?.toFixed(3)}, {leg.longitude?.toFixed(3)}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {activeRoute.legs.length === 0 && <div className="rounded-xl border border-dashed bg-muted/5 py-8 text-center"><Navigation className="mx-auto mb-2 h-6 w-6 opacity-50 text-muted-foreground" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Click map to add waypoints</p></div>}
                            </div>
                          </section>
                          <Separator />
                          <section className="space-y-4">
                            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-destructive"><div className="h-2 w-2 rounded-full bg-destructive" /> Safety Hazards</h3>
                            <div className="space-y-2">
                              {activeRoute.hazards.map((hazard) => (
                                <div key={hazard.id} className="group relative space-y-2 rounded-xl border border-destructive/10 bg-destructive/5 p-3 transition-all hover:border-destructive/30">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="destructive" className="h-4 text-[8px] font-black uppercase">Alert</Badge>
                                    {isEditing && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setActiveRoute({ ...activeRoute, hazards: activeRoute.hazards.filter((item) => item.id !== hazard.id) })}><Trash2 size={12} /></Button>}
                                  </div>
                                  <Textarea value={hazard.note} onChange={(e) => setActiveRoute({ ...activeRoute, hazards: activeRoute.hazards.map((item) => item.id === hazard.id ? { ...item, note: e.target.value } : item) })} className="h-16 resize-none border-none bg-transparent p-0 text-[10px] font-bold leading-relaxed shadow-none focus-visible:ring-0" placeholder="Hazard description..." readOnly={!isEditing} />
                                  <p className="font-mono text-[8px] font-black text-destructive/60">{hazard.lat.toFixed(4)}, {hazard.lng.toFixed(4)}</p>
                                </div>
                              ))}
                              {activeRoute.hazards.length === 0 && <div className="rounded-xl border border-dashed bg-muted/5 py-8 text-center"><AlertTriangle className="mx-auto mb-2 h-6 w-6 opacity-40 text-muted-foreground" /><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mark hazards from the map</p></div>}
                            </div>
                          </section>
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center space-y-4 p-8 text-center opacity-40">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><MapIcon size={32} /></div>
                      <div className="max-w-xs">
                        <p className="text-xs font-black uppercase tracking-tight">Select a Route</p>
                        <p className="mt-2 text-[10px] font-bold leading-relaxed">Choose a route from the list or create a new one to begin planning.</p>
                      </div>
                    </div>
                  )}
                </div>
                ) : null}
              </div>
              {!isEditing && activeRoute && (<div className="pointer-events-auto absolute bottom-6 left-1/2 z-[1000] -translate-x-1/2"><Button onClick={() => setIsEditing(true)} className="h-10 rounded-full border bg-white/95 px-6 text-[10px] font-black uppercase text-black shadow-2xl hover:bg-white">Edit Route Engine</Button></div>)}
            </div>
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
            <p className="text-center font-mono text-[9px] font-bold text-muted-foreground">Target: {hazardToEdit?.lat.toFixed(4)}, {hazardToEdit?.lng.toFixed(4)}</p>
          </div>
            <DialogFooter>
            <DialogClose asChild><Button variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS}>Cancel</Button></DialogClose>
            <Button onClick={confirmAddHazard} className={HEADER_ACTION_BUTTON_CLASS}>Add Marker</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllRoutesOpen} onOpenChange={setShowAllRoutesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">All Routes</DialogTitle>
            <DialogDescription>Select a saved route to load it into the planner.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-2 py-2">
              {filteredRoutes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left transition-all ${activeRoute?.id === route.id ? 'border-primary/20 bg-primary/5 shadow-sm' : 'border-border bg-background hover:bg-muted/50'}`}
                  onClick={() => {
                    setActiveRoute(route);
                    setRouteNameDraft(route.name);
                    setIsEditing(false);
                    setShowAllRoutesOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black uppercase">{route.name || 'Untitled Route'}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase text-muted-foreground">{route.legs.length} waypoints</p>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase opacity-70">
                      {getRouteTypeLabel(route.routeType)}
                    </Badge>
                  </div>
                </button>
              ))}
              {filteredRoutes.length === 0 && (
                <div className="rounded-xl border border-dashed bg-muted/5 py-8 text-center">
                  <PlaneTakeoff className="mx-auto mb-2 h-6 w-6 opacity-40 text-muted-foreground" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No routes found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={saveRouteOpen} onOpenChange={setSaveRouteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">Save Route</DialogTitle>
            <DialogDescription>Name this route before saving it to the database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Route Name</label>
            <Input
              value={routeNameDraft}
              onChange={(e) => setRouteNameDraft(e.target.value)}
              placeholder="Enter route name"
              className="h-10 text-xs font-black uppercase"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (!activeRoute) return;
                void handleSave(routeNameDraft);
              }}
              className={HEADER_ACTION_BUTTON_CLASS}
              disabled={!routeNameDraft.trim()}
            >
              <Save size={14} className="mr-2" /> Save Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

