'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2, MapIcon, Navigation, AlertTriangle, Save, Search, PlaneTakeoff, MapPinned, ListFilter, Layers3, SlidersHorizontal, ChevronDown, Route, X } from 'lucide-react';
import { MainPageHeader, HEADER_ACTION_BUTTON_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
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

export default function TrainingRoutesPage() {
  type InspectorTab = 'routes' | 'selected' | null;
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const [routes, setRoutes] = useState<TrainingRoute[]>([]);
  const [activeRoute, setActiveRoute] = useState<TrainingRoute | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hazardToEdit, setHazardToEdit] = useState<{ lat: number; lng: number } | null>(null);
  const [hazardNote, setHazardNote] = useState('');
  const [search, setSearch] = useState('');
  const [showRouteSummary, setShowRouteSummary] = useState(false);
  const [showAllRoutesOpen, setShowAllRoutesOpen] = useState(false);
  const [saveRouteOpen, setSaveRouteOpen] = useState(false);
  const [routeNameDraft, setRouteNameDraft] = useState('');
  const [showLayerSelectorOpen, setShowLayerSelectorOpen] = useState(false);
  const [showLayerLevelsOpen, setShowLayerLevelsOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('routes');
  const [showRouteList, setShowRouteList] = useState(true);
  const [showSelectedRoute, setShowSelectedRoute] = useState(true);

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
    const newRoute: TrainingRoute = {
      id: uuidv4(),
      name: '',
      description: '',
      routeType: 'training',
      legs: [],
      hazards: [],
      tenantId: 'safeviate',
      createdAt: new Date().toISOString(),
    };
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
      identifier || 'WP',
      frequencies,
      layerInfo
    );
    newLeg.altitude = 4500;
    setActiveRoute({ ...activeRoute, legs: [...activeRoute.legs, newLeg] });
  };

  const handleDeleteWaypoint = (legId: string) => {
    if (!activeRoute) return;
    setActiveRoute({
      ...activeRoute,
      legs: activeRoute.legs.filter((leg) => leg.id !== legId),
    });
    setIsEditing(true);
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
      if (activeRoute?.id === routeId) setActiveRoute(null);
      setInspectorTab('routes');
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
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden px-1">
      <Card className="flex h-full flex-col overflow-hidden border shadow-none">
        <div className="sticky top-0 z-30 border-b bg-card">
            <MainPageHeader
            title="Route Planner"
          />
        </div>

        <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-0 bg-muted/5">
          <div className="sticky top-0 z-20 border-b bg-background px-2 py-1.5 md:px-3 md:py-2">
            <div className="flex items-center justify-end gap-1.5 md:gap-2" aria-label="Route planner action bar">
              <div className="hidden items-center justify-end gap-1.5 md:flex md:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                  onClick={() => setShowRouteSummary((current) => !current)}
                >
                  <ListFilter className="h-4 w-4" />
                  {showRouteSummary ? 'Hide Route' : 'Show Route'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                  onClick={() => setShowLayerSelectorOpen((current) => !current)}
                >
                  <Layers3 className="h-4 w-4" />
                  Layers
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                  onClick={() => setShowLayerLevelsOpen((current) => !current)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Map Zoom
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                  onClick={() => setShowAllRoutesOpen(true)}
                >
                  <Search className="h-4 w-4" />
                  Show All Routes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                  onClick={handleClearRoute}
                  disabled={!activeRoute || (!activeRoute.legs.length && !activeRoute.hazards.length && !activeRoute.name.trim())}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Route
                </Button>
                <Button onClick={handleCreateNew} className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur">
                  <Plus size={14} className="mr-2" /> New Route
                </Button>
                <Button
                  onClick={() => {
                    if (activeRoute) {
                      setRouteNameDraft(activeRoute.name);
                      setSaveRouteOpen(true);
                    }
                  }}
                  disabled={!activeRoute || !isEditing}
                  className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                >
                  <Save size={14} className="mr-2" /> Save Route
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full justify-between rounded-xl border-slate-300 bg-background px-3 text-xs font-medium shadow-sm hover:bg-muted md:hidden"
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Actions
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[7000] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => setShowLayerSelectorOpen((current) => !current)}>
                    <Layers3 className="mr-2 h-4 w-4" /> {showLayerSelectorOpen ? 'Hide Layers' : 'Show Layers'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowLayerLevelsOpen((current) => !current)}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" /> {showLayerLevelsOpen ? 'Hide Map Zoom' : 'Show Map Zoom'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowRouteSummary((current) => !current)}>
                    <ListFilter className="mr-2 h-4 w-4" /> {showRouteSummary ? 'Hide Route' : 'Show Route'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAllRoutesOpen(true)}>
                    <Search className="mr-2 h-4 w-4" /> Show All Routes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleClearRoute}
                    disabled={!activeRoute || (!activeRoute.legs.length && !activeRoute.hazards.length && !activeRoute.name.trim())}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Route
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" /> New Route
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (activeRoute) {
                        setRouteNameDraft(activeRoute.name);
                        setSaveRouteOpen(true);
                      }
                    }}
                    disabled={!activeRoute || !isEditing}
                  >
                    <Save className="mr-2 h-4 w-4" /> Save Route
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="absolute inset-0">
                <AeronauticalMap
                  legs={activeRoute?.legs || []}
                  hazards={activeRoute?.hazards || []}
                  onAddWaypoint={handleAddWaypoint}
                  onAddHazard={handleAddHazardRequest}
                  rightAccessory={
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-xl backdrop-blur hover:bg-slate-50"
                      onClick={() => setShowRouteSummary((current) => !current)}
                      aria-label={showRouteSummary ? 'Hide route summary' : 'Show route summary'}
                      title={showRouteSummary ? 'Hide route summary' : 'Show route summary'}
                    >
                      <Route className="h-4 w-4" />
                    </button>
                  }
                  showLayerSelectorControl={false}
                  showLayerLevelsControl={false}
                  layerSelectorOpen={showLayerSelectorOpen}
                  layerLevelsOpen={showLayerLevelsOpen}
                  onLayerSelectorOpenChange={setShowLayerSelectorOpen}
                  onLayerLevelsOpenChange={setShowLayerLevelsOpen}
                />
              </div>

              <div className="pointer-events-none absolute inset-3 z-[2000]">
              <div className="hidden">
              {inspectorTab ? (
                <div className="pointer-events-auto absolute right-0 top-0 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
                  <div className="flex h-10 items-center justify-between gap-3 border-b border-slate-100 px-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {inspectorTab === 'routes' ? 'Saved Routes' : 'Draft Route'}
                      </p>
                      <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {inspectorTab === 'routes'
                          ? `${filteredRoutes.length} route${filteredRoutes.length === 1 ? '' : 's'} available`
                          : activeRoute
                            ? `${activeRoute.name} â€¢ ${activeRoute.legs.length} legs`
                            : 'No route selected'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 rounded-full border-slate-200 bg-white px-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700"
                      onClick={() => setInspectorTab(null)}
                    >
                      Close
                    </Button>
                  </div>

                  {inspectorTab === 'routes' ? (
                    <div className="p-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search routes..." className="h-8 pl-9 text-[10px] font-bold uppercase" />
                      </div>
                      <ScrollArea className="mt-3 max-h-[calc(100vh-16rem)]">
                        <div className="space-y-1 pr-1">
                          {filteredRoutes.map((route) => (
                            <button
                              key={route.id}
                              onClick={() => {
                                setActiveRoute(route);
                                setIsEditing(false);
                                setInspectorTab('selected');
                              }}
                              className={`w-full rounded-xl border p-3 text-left transition-all ${activeRoute?.id === route.id ? 'border-primary/20 bg-primary/5 shadow-sm' : 'border-transparent bg-white/80 hover:bg-muted/50'}`}
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <Badge variant="outline" className="h-4 text-[8px] font-black uppercase opacity-60">{getRouteTypeLabel(route.routeType)}</Badge>
                                <span className="text-[8px] font-bold text-muted-foreground">{route.legs.length} Waypoints</span>
                              </div>
                              <p className="truncate text-[11px] font-black uppercase">{route.name}</p>
                              <p className="mt-1 line-clamp-1 text-[9px] font-bold italic text-muted-foreground">{route.description || 'No description'}</p>
                            </button>
                          ))}
                          {filteredRoutes.length === 0 && (<div className="space-y-3 p-8 text-center opacity-40"><PlaneTakeoff size={32} className="mx-auto" /><p className="text-[10px] font-black uppercase tracking-widest">No routes found</p></div>)}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : activeRoute ? (
                      <div className="space-y-4 p-4">
                        <div className="rounded-xl border bg-background/70 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Create Route</p>
                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black uppercase">{activeRoute.name}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">{getRouteTypeLabel(activeRoute.routeType)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(activeRoute.id)}>
                              <Trash2 size={14} />
                            </Button>
                            <Button variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS} onClick={handleClearRoute}>
                              Clear Route
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-lg border bg-white px-3 py-2">
                            <p className="text-[8px] font-black uppercase text-muted-foreground">Waypoints</p>
                            <p className="text-lg font-black">{activeRoute.legs.length}</p>
                          </div>
                          <div className="rounded-lg border bg-white px-3 py-2">
                            <p className="text-[8px] font-black uppercase text-muted-foreground">Hazards</p>
                            <p className="text-lg font-black">{activeRoute.hazards.length}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-[10px] font-bold leading-relaxed text-muted-foreground">
                          {activeRoute.description || 'No route notes yet. Start editing or add waypoints directly from the map.'}
                        </p>
                        <div className="mt-4 space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Waypoints
                          </p>
                          {activeRoute.legs.length > 0 ? (
                            <div className="space-y-2">
                              {activeRoute.legs.map((leg, index) => (
                                <div
                                  key={leg.id}
                                  className="flex items-start justify-between gap-3 rounded-lg border bg-white px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-[10px] font-black uppercase text-slate-700">
                                      {index + 1}. {leg.waypoint}
                                    </p>
                                    <p className="text-[9px] font-mono font-bold text-muted-foreground">
                                      {leg.latitude?.toFixed(4) ?? '-'}, {leg.longitude?.toFixed(4) ?? '-'}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                                      {leg.altitude ? `${leg.altitude} ft` : 'No alt'}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive"
                                      onClick={() => handleDeleteWaypoint(leg.id)}
                                    >
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed bg-white px-3 py-3 text-[10px] font-bold text-muted-foreground">
                              No waypoints yet.
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setIsEditing(true)} className={`${HEADER_ACTION_BUTTON_CLASS} flex-1`}>
                          <Save size={14} className="mr-2" /> Edit Route
                        </Button>
                        <Button variant="outline" className={`${HEADER_SECONDARY_BUTTON_CLASS} flex-1`} onClick={() => setInspectorTab('routes')}>
                          Browse Routes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center space-y-4 p-8 text-center opacity-40">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><MapIcon size={32} /></div>
                      <div className="max-w-xs">
                        <p className="text-xs font-black uppercase tracking-tight">Select a Route</p>
                        <p className="mt-2 text-[10px] font-bold leading-relaxed">Pick a route from the rail, or create a new one to inspect it here.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              </div>

              {showRouteSummary ? (
                <div className="pointer-events-none absolute right-4 top-2 z-[1000] flex w-[300px] flex-col">
                  <Card className="pointer-events-auto flex h-fit max-h-full min-h-0 flex-col overflow-hidden border bg-background/95 shadow-2xl backdrop-blur">
                    <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 p-4 border-b">
                      <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                        <MapPinned className="h-3.5 w-3.5 text-emerald-600" /> Route Summary
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowRouteSummary(false)}
                        aria-label="Hide route summary"
                        title="Hide route summary"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <ScrollArea className="max-h-[calc(100vh-14rem)] overflow-y-auto">
                      <div className="space-y-2 p-2">
                        {activeRoute?.legs.length ? activeRoute.legs.map((leg, index) => (
                          <div key={leg.id} className="group flex items-center gap-3 rounded-lg border bg-muted/10 p-3 transition-colors hover:bg-muted/20">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate text-[11px] font-black uppercase">{index + 1}. {leg.waypoint}</span>
                                <span className="font-mono text-[9px] text-muted-foreground">{leg.latitude?.toFixed(2)}, {leg.longitude?.toFixed(2)}</span>
                              </div>
                              {leg.frequencies && <p className="mt-1 text-[9px] font-semibold text-emerald-700">{leg.frequencies}</p>}
                              {leg.layerInfo && <p className="text-[9px] font-semibold text-primary">{leg.layerInfo}</p>}
                              <div className="mt-1 flex gap-3">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-bold uppercase text-muted-foreground">Dist</span>
                                  <span className="text-[10px] font-black">{leg.distance?.toFixed(1) || '-'} NM</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-bold uppercase text-muted-foreground">HDG</span>
                                  <span className="text-[10px] font-black">{leg.magneticHeading?.toFixed(0) || '-'}°</span>
                                </div>
                              </div>
                            </div>
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() => handleDeleteWaypoint(leg.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )) : (
                          <div className="flex min-h-[240px] flex-col items-center justify-center space-y-3 rounded-xl border border-dashed bg-slate-50 p-6 text-center">
                            <MapIcon className="h-8 w-8 opacity-40" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No waypoints yet</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              ) : null}
<div className="hidden pointer-events-auto absolute right-0 top-0 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur"> 
                <div className={`flex items-center justify-between gap-3 px-3 ${showRouteList ? 'h-10 border-b border-slate-100' : 'h-10'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Saved Routes</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 rounded-full border-slate-200 bg-white px-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700"
                    onClick={() => setShowRouteList((current) => !current)}
                  >
                    {showRouteList ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
                {showRouteList ? (
                  <div className="p-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search routes..." className="h-8 pl-9 text-[10px] font-bold uppercase" />
                    </div>
                    <ScrollArea className="mt-3 h-[calc(100vh-18rem)]">
                      <div className="space-y-1 pr-1">
                        {filteredRoutes.map((route) => (
                          <button key={route.id} onClick={() => { setActiveRoute(route); setIsEditing(false); }} className={`w-full rounded-xl border p-3 text-left transition-all ${activeRoute?.id === route.id ? 'border-primary/20 bg-primary/5 shadow-sm' : 'border-transparent bg-white/80 hover:bg-muted/50'}`}>
                            <div className="mb-1 flex items-center justify-between">
                              <Badge variant="outline" className="h-4 text-[8px] font-black uppercase opacity-60">{getRouteTypeLabel(route.routeType)}</Badge>
                              <span className="text-[8px] font-bold text-muted-foreground">{route.legs.length} Waypoints</span>
                            </div>
                            <p className="truncate text-[11px] font-black uppercase">{route.name}</p>
                            <p className="mt-1 line-clamp-1 text-[9px] font-bold italic text-muted-foreground">{route.description || 'No description'}</p>
                          </button>
                        ))}
                        {filteredRoutes.length === 0 && (<div className="space-y-3 p-8 text-center opacity-40"><PlaneTakeoff size={32} className="mx-auto" /><p className="text-[10px] font-black uppercase tracking-widest">No routes found</p></div>)}
                      </div>
                    </ScrollArea>
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

