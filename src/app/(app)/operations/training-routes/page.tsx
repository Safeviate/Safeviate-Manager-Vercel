
'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { PlaneTakeoff, Plus, Trash2, MapIcon, Navigation, AlertTriangle, Save, ChevronRight, Info, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import type { TrainingRoute, NavlogLeg, Hazard } from '@/types/booking';
import { MainPageHeader } from '@/components/page-header';
import { v4 as uuidv4 } from 'uuid';

// Dynamically import map to avoid SSR issues with Leaflet
const AeronauticalMap = dynamic(() => import('@/components/flight-planner/aeronautical-map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900 animate-pulse flex items-center justify-center text-white font-black uppercase tracking-widest text-[10px]">Loading Aeronautical Engine...</div>
});

export default function TrainingRoutesPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { toast } = useToast();

  const routesQuery = useMemoFirebase(() => (
    firestore && tenantId ? collection(firestore, `tenants/${tenantId}/trainingRoutes`) : null
  ), [firestore, tenantId]);
  
  const { data: routes, isLoading } = useCollection<TrainingRoute>(routesQuery);

  const [activeRoute, setActiveRoute] = useState<TrainingRoute | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hazardToEdit, setHazardToEdit] = useState<{ lat: number, lng: number } | null>(null);
  const [hazardNote, setHazardNote] = useState('');

  const handleCreateNew = () => {
    const newRoute: TrainingRoute = {
      id: uuidv4(),
      name: 'New Training Route',
      description: '',
      legs: [],
      hazards: [],
      tenantId: tenantId!,
      createdAt: new Date().toISOString()
    };
    setActiveRoute(newRoute);
    setIsEditing(true);
  };

  const handleAddWaypoint = (lat: number, lon: number, identifier?: string) => {
    if (!isEditing || !activeRoute) return;
    
    const newLeg: NavlogLeg = {
      id: uuidv4(),
      waypoint: identifier || `WP ${activeRoute.legs.length + 1}`,
      latitude: lat,
      longitude: lon,
      altitude: 4500,
    };

    setActiveRoute({
      ...activeRoute,
      legs: [...activeRoute.legs, newLeg]
    });
  };

  const handleAddHazardRequest = (lat: number, lng: number) => {
    setHazardToEdit({ lat, lng });
    setHazardNote('');
  };

  const confirmAddHazard = () => {
    if (!hazardToEdit || !activeRoute) return;
    
    const newHazard: Hazard = {
      id: uuidv4(),
      lat: hazardToEdit.lat,
      lng: hazardToEdit.lng,
      note: hazardNote,
      severity: 'medium'
    };

    setActiveRoute({
      ...activeRoute,
      hazards: [...activeRoute.hazards, newHazard]
    });
    setHazardToEdit(null);
  };

  const handleRemoveLeg = (id: string) => {
    if (!activeRoute) return;
    setActiveRoute({
      ...activeRoute,
      legs: activeRoute.legs.filter(l => l.id !== id)
    });
  };

  const handleRemoveHazard = (id: string) => {
    if (!activeRoute) return;
    setActiveRoute({
      ...activeRoute,
      hazards: activeRoute.hazards.filter(h => h.id !== id)
    });
  };

  const handleSave = async () => {
    if (!firestore || !tenantId || !activeRoute) return;
    
    try {
      await setDoc(doc(firestore, `tenants/${tenantId}/trainingRoutes`, activeRoute.id), activeRoute);
      toast({ title: 'Route Saved', description: activeRoute.name });
      setIsEditing(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!firestore || !tenantId) return;
    try {
      await deleteDoc(doc(firestore, `tenants/${tenantId}/trainingRoutes`, routeId));
      if (activeRoute?.id === routeId) setActiveRoute(null);
      toast({ title: 'Route Deleted' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden gap-4 px-1">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <div className="sticky top-0 z-30 bg-card border-b">
          <MainPageHeader 
            title="Training Routes"
            actions={
              <Button 
                onClick={handleCreateNew}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black uppercase text-[10px] h-9"
              >
                <Plus size={14} className="mr-2" /> New Route
              </Button>
            }
          />
        </div>

        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_350px] h-full overflow-hidden">
            {/* ── Sidebar: Route List ── */}
            <div className="border-r bg-background flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b bg-muted/10">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search routes..." 
                    className="h-8 pl-9 text-[10px] font-bold uppercase"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {(routes || []).map(route => (
                    <button
                      key={route.id}
                      onClick={() => { setActiveRoute(route); setIsEditing(false); }}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${activeRoute?.id === route.id ? 'bg-primary/5 border-primary/20 shadow-sm' : 'hover:bg-muted/50 border-transparent'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[8px] h-4 font-black uppercase opacity-60">Route</Badge>
                        <span className="text-[8px] font-bold text-muted-foreground">{route.legs.length} Waypoints</span>
                      </div>
                      <p className="text-[11px] font-black uppercase truncate">{route.name}</p>
                      <p className="text-[9px] text-muted-foreground font-bold mt-1 line-clamp-1 italic">{route.description || 'No description'}</p>
                    </button>
                  ))}
                  {routes?.length === 0 && (
                    <div className="p-8 text-center space-y-3 opacity-40">
                      <PlaneTakeoff size={32} className="mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No routes found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* ── Center: Map Area ── */}
            <div className="relative bg-slate-900 h-full overflow-hidden flex flex-col">
              <AeronauticalMap 
                legs={activeRoute?.legs || []}
                hazards={activeRoute?.hazards || []}
                onAddWaypoint={handleAddWaypoint}
                onAddHazard={handleAddHazardRequest}
              />
              
              {!isEditing && activeRoute && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
                  <Button 
                    onClick={() => setIsEditing(true)}
                    className="bg-white/95 backdrop-blur text-black hover:bg-white shadow-2xl font-black uppercase text-[10px] h-10 px-6 rounded-full border"
                  >
                    Edit Route Engine
                  </Button>
                </div>
              )}
            </div>

            {/* ── Sidebar: Route Details/Editor ── */}
            <div className="border-l bg-background flex flex-col h-full overflow-hidden">
              {activeRoute ? (
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Route Profile</p>
                      <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(activeRoute.id)}><Trash2 size={14} /></Button>
                         <Button 
                           onClick={handleSave}
                           disabled={!isEditing}
                           className="h-8 bg-emerald-700 hover:bg-emerald-800 font-black uppercase text-[9px] px-3 shrink-0"
                         >
                            <Save size={14} className="mr-2" /> Save
                         </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Route Name</Label>
                        <Input 
                          value={activeRoute.name} 
                          onChange={e => setActiveRoute({...activeRoute, name: e.target.value})}
                          className="h-9 font-black uppercase text-xs"
                          readOnly={!isEditing}
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] font-black uppercase text-muted-foreground mb-1 block">Description / Notes</Label>
                        <Textarea 
                          value={activeRoute.description} 
                          onChange={e => setActiveRoute({...activeRoute, description: e.target.value})}
                          className="min-h-[60px] text-[10px] font-bold"
                          readOnly={!isEditing}
                          placeholder="Training sector details, frequency requirements, etc."
                        />
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8 pb-12">
                      {/* Legs List */}
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500" /> Planned Legs
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {activeRoute.legs.map((leg, i) => (
                            <div key={leg.id} className="p-3 border rounded-xl bg-background shadow-sm hover:border-primary/20 transition-all group overflow-hidden">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                   <div className="w-5 h-5 rounded flex items-center justify-center bg-muted text-[10px] font-black uppercase">{i+1}</div>
                                   <Input 
                                     value={leg.waypoint} 
                                     onChange={e => {
                                       const newLegs = [...activeRoute.legs];
                                       newLegs[i].waypoint = e.target.value;
                                       setActiveRoute({...activeRoute, legs: newLegs});
                                     }}
                                     className="h-6 border-none shadow-none font-bold uppercase text-[10px] p-0 focus-visible:ring-0 w-24"
                                     readOnly={!isEditing}
                                   />
                                </div>
                                {isEditing && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveLeg(leg.id)}><Trash2 size={12} /></Button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <p className="text-[8px] font-black uppercase text-muted-foreground">Alt (ft)</p>
                                   <Input 
                                      type="number" 
                                      value={leg.altitude} 
                                      onChange={e => {
                                        const newLegs = [...activeRoute.legs];
                                        newLegs[i].altitude = Number(e.target.value);
                                        setActiveRoute({...activeRoute, legs: newLegs});
                                      }}
                                      className="h-7 text-[10px] font-black border-dashed"
                                      readOnly={!isEditing}
                                   />
                                </div>
                                <div className="flex items-end justify-end">
                                   <p className="text-[9px] font-mono font-bold text-muted-foreground">{leg.latitude.toFixed(3)}, {leg.longitude.toFixed(3)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {activeRoute.legs.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed rounded-xl bg-muted/5">
                               <Navigation className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Click map to add waypoints</p>
                            </div>
                          )}
                        </div>
                      </section>

                      <Separator />

                      {/* Hazards List */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-destructive" /> Safety Hazards
                        </h3>
                        <div className="space-y-2">
                          {activeRoute.hazards.map((hazard) => (
                            <div key={hazard.id} className="p-3 border border-destructive/10 rounded-xl bg-destructive/5 space-y-2 relative group hover:border-destructive/30 transition-all">
                               <div className="flex items-center justify-between">
                                  <Badge variant="destructive" className="text-[8px] h-4 font-black uppercase">Alert</Badge>
                                  {isEditing && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveHazard(hazard.id)}><Trash2 size={12} /></Button>
                                  )}
                               </div>
                               <Textarea 
                                  value={hazard.note}
                                  onChange={e => {
                                    const newHazards = activeRoute.hazards.map(h => h.id === hazard.id ? {...h, note: e.target.value} : h);
                                    setActiveRoute({...activeRoute, hazards: newHazards});
                                  }}
                                  className="h-16 text-[10px] font-bold bg-transparent border-none shadow-none focus-visible:ring-0 p-0 resize-none leading-relaxed"
                                  placeholder="Hazard description..."
                                  readOnly={!isEditing}
                               />
                               <p className="text-[8px] font-mono text-destructive/60 font-black">{hazard.lat.toFixed(4)}, {hazard.lng.toFixed(4)}</p>
                            </div>
                          ))}
                          {activeRoute.hazards.length === 0 && (
                            <div className="text-center py-8 border rounded-xl bg-muted/5 border-dashed">
                               <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mark hazards from the map</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-12 text-center space-y-4 opacity-40">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <MapIcon size={32} />
                  </div>
                  <div className="max-w-xs">
                    <p className="text-xs font-black uppercase tracking-tight">Select a Training Route</p>
                    <p className="text-[10px] font-bold mt-2 leading-relaxed">Choose a route from the list or create a new one to begin planning.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hazard Note Dialog */}
      <Dialog open={!!hazardToEdit} onOpenChange={() => setHazardToEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Mark Safety Hazard
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Hazard Description</Label>
              <Textarea 
                placeholder="Describe the hazard (e.g., High terrain, restricted area, frequent turbulence...)"
                className="text-xs font-bold min-h-[100px]"
                value={hazardNote}
                onChange={e => setHazardNote(e.target.value)}
              />
            </div>
            <p className="text-[9px] font-mono font-bold text-muted-foreground text-center">
              Target: {hazardToEdit?.lat.toFixed(4)}, {hazardToEdit?.lng.toFixed(4)}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="text-[10px] font-black uppercase">Cancel</Button></DialogClose>
            <Button onClick={confirmAddHazard} className="bg-destructive hover:bg-destructive/90 text-white font-black uppercase text-[10px]">Add Marker</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className, ...props }: any) {
  return <label className={`${className}`} {...props}>{children}</label>;
}
