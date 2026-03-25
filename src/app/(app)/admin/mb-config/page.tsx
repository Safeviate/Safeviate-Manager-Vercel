'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot, Cell } from 'recharts';
import { doc, setDoc, collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Plus, Trash2, RotateCcw, Maximize, Fuel, AlertTriangle, Plane, Upload, Library, ShieldCheck, ChevronDown, Check, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
<<<<<<< HEAD
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
=======
import { Card, CardContent } from '@/components/ui/card';
>>>>>>> temp-save-work
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateFuelGallonsFromWeight, calculateFuelWeight, gallonsToLitres, getFuelPreset, poundsToKilograms, type FuelType } from '@/lib/fuel';
import type { Aircraft, AircraftModelProfile } from '@/types/aircraft';
<<<<<<< HEAD
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
=======
import { MainPageHeader } from '@/components/page-header';
>>>>>>> temp-save-work

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];

const generateNiceTicks = (min: number | string, max: number | string, stepCount = 6) => {
  const start = Number(min);
  const end = Number(max);
  if (isNaN(start) || isNaN(end) || start >= end) return [];
  const diff = end - start;
  const roughStep = diff / (stepCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  let step;
  if (normalizedStep < 1.5) step = 1 * magnitude;
  else if (normalizedStep < 3) step = 2 * magnitude;
  else if (normalizedStep < 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  const ticks = [];
  let current = Math.ceil(start / step) * step;
  if (current > start) ticks.push(start);
  while (current <= end) {
    ticks.push(current);
    current += step;
  }
  return ticks;
};

const formatLitres = (gallons: number) => gallonsToLitres(gallons).toFixed(1);
const formatKilograms = (pounds: number) => poundsToKilograms(pounds).toFixed(1);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const normalizeFuelStation = (station: any) => {
  if (station?.type !== 'fuel') return station;
  const preset = getFuelPreset(station.fuelType);
  return {
    ...station,
    fuelType: station.fuelType || 'AVGAS',
    densityLbPerGallon: Number(station.densityLbPerGallon) || preset.densityLbPerGallon,
    maxGallons: Number(station.maxGallons) || 50,
  };
};

const serializeStation = (station: any) => {
  const baseStation = {
    id: Number(station.id) || 0,
    name: station.name || '',
    weight: parseFloat(String(station.weight)) || 0,
    arm: parseFloat(String(station.arm)) || 0,
    type: station.type || 'standard',
  };
  if (baseStation.type !== 'fuel') return baseStation;
  const preset = getFuelPreset(station.fuelType);
  return {
    ...baseStation,
    gallons: parseFloat(String(station.gallons)) || 0,
    maxGallons: parseFloat(String(station.maxGallons)) || 0,
    fuelType: station.fuelType || 'AVGAS',
    densityLbPerGallon: parseFloat(String(station.densityLbPerGallon)) || preset.densityLbPerGallon,
  };
};

const WBCalculator = () => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);

  const templatesQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/massAndBalance`) : null), [firestore, tenantId]);
  const { data: savedTemplates, isLoading: isLoadingTemplates } = useCollection<AircraftModelProfile>(templatesQuery);

  const [graphConfig, setGraphConfig] = useState({
    modelName: "Piper PA-28-180",
    xMin: 80, xMax: 94, yMin: 1295, yMax: 2600,
    envelope: [{ x: 82, y: 1400 }, { x: 82, y: 1950 }, { x: 86.5, y: 2450 }, { x: 93, y: 2450 }, { x: 93, y: 1400 }, { x: 82, y: 1400 }]
  });

  const [basicEmpty, setBasicEmpty] = useState({ weight: 1416, moment: 120360, arm: 85.0 });
  const [stations, setStations] = useState<any[]>([
    { id: 2, name: "Pilot & Front Pax", weight: 340, arm: 85.5, type: 'standard' },
    { id: 3, name: "Fuel", weight: 288, arm: 95.0, type: 'fuel', gallons: 48, maxGallons: 50, fuelType: 'AVGAS', densityLbPerGallon: 6.0 },
    { id: 4, name: "Rear Pax", weight: 0, arm: 118.1, type: 'standard' },
    { id: 5, name: "Baggage", weight: 0, arm: 142.8, type: 'standard' },
  ]);

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });
  const [isSaveAircraftDialogOpen, setIsSaveAircraftDialogOpen] = useState(false);
  const [loadedAircraft, setLoadedAircraft] = useState<Aircraft | null>(null);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    let totalMom = parseFloat(String(basicEmpty.moment)) || 0;
    let totalWt = parseFloat(String(basicEmpty.weight)) || 0;
    stations.forEach(st => {
      const wt = parseFloat(String(st.weight)) || 0;
      const arm = parseFloat(String(st.arm)) || 0;
      totalWt += wt;
      totalMom += (wt * arm);
    });
    const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
    const roundedCg = parseFloat(cg.toFixed(2));
    const roundedWeight = parseFloat(totalWt.toFixed(1));
    const safe = graphConfig.envelope.length > 2 ? isPointInPolygon({ x: roundedCg, y: roundedWeight }, graphConfig.envelope) : false;
    setResults({ cg: roundedCg, weight: roundedWeight, isSafe: safe });
  }, [stations, basicEmpty, graphConfig.envelope]);

  const handleBasicEmptyChange = (field: string, value: string) => {
    const val = parseFloat(value) || 0;
    if (field === 'weight') {
      const newMoment = val * basicEmpty.arm;
      setBasicEmpty({ ...basicEmpty, weight: val, moment: parseFloat(newMoment.toFixed(2)) });
    } else if (field === 'moment') {
      const newArm = val / (basicEmpty.weight || 1);
      setBasicEmpty({ ...basicEmpty, moment: val, arm: parseFloat(newArm.toFixed(2)) });
    } else if (field === 'arm') {
      const newMoment = basicEmpty.weight * val;
      setBasicEmpty({ ...basicEmpty, arm: val, moment: parseFloat(newMoment.toFixed(2)) });
    }
  };

  const handleFuelChange = (id: number, field: string, value: string) => {
    const val = parseFloat(value) || 0;
    setStations(stations.map(s => {
      if (s.id !== id) return s;
      const f = normalizeFuelStation(s);
      const density = Number(f.densityLbPerGallon) || 6.0;
      const max = Math.max(Number(f.maxGallons) || 0, 0);
      if (field === 'gallons') {
        const gal = clamp(val, 0, max);
        return { ...f, gallons: gal, weight: parseFloat((gal * density).toFixed(1)) };
      }
      if (field === 'weight') {
        const gal = clamp(val / density, 0, max);
        return { ...f, weight: parseFloat((gal * density).toFixed(1)), gallons: parseFloat(gal.toFixed(1)) };
      }
      return { ...s, [field]: val };
    }));
  };

  const handleSaveToAircraft = (aircraftId: string) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    const data = {
      emptyWeight: basicEmpty.weight,
      emptyWeightMoment: basicEmpty.moment,
      maxTakeoffWeight: graphConfig.yMax,
      maxLandingWeight: graphConfig.yMax,
      cgEnvelope: graphConfig.envelope.map(p => ({ weight: p.y, cg: p.x })),
      stations: stations.map(serializeStation),
    };
    updateDocumentNonBlocking(aircraftRef, data);
    toast({ title: 'Saved to Aircraft' });
    setIsSaveAircraftDialogOpen(false);
  }

  const allX = [...graphConfig.envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
  const allY = [...graphConfig.envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
  const padX = allX.length > 1 ? (Math.max(...allX) - Math.min(...allX)) * 0.1 : 5;
  const padY = allY.length > 1 ? (Math.max(...allY) - Math.min(...allY)) * 0.1 : 100;
  const fXMin = Math.min(Number(graphConfig.xMin), ...allX) - padX;
  const fXMax = Math.max(Number(graphConfig.xMax), ...allX) + padX;
  const fYMin = Math.min(Number(graphConfig.yMin), ...allY) - padY;
  const fYMax = Math.max(Number(graphConfig.yMax), ...allY) + padY;

  return (
<<<<<<< HEAD
    <div className="flex h-full flex-col overflow-hidden gap-4">
      <Card className="flex h-full flex-col overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                M&B Configurator
              </CardTitle>
              <CardDescription className="text-xs">Precision organizational loading definitions.</CardDescription>
            </div>
            <div className="flex gap-3 bg-background border rounded-lg px-4 py-2 shadow-inner">
              <div className="text-center">
                <p className="text-[8px] font-black uppercase text-muted-foreground">Total Weight</p>
                <p className="text-sm font-black">{results.weight} lbs</p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <p className="text-[8px] font-black uppercase text-muted-foreground">CG</p>
                <p className="text-sm font-black">{results.cg} in</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setStations([])} className="h-9 px-4 uppercase text-xs font-black"><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
            <Button size="sm" className="h-9 px-6 uppercase text-xs font-black bg-emerald-700 hover:bg-emerald-800" onClick={() => setIsSaveAircraftDialogOpen(true)}><Plane className="mr-2 h-4 w-4" /> Commit to AC</Button>
          </div>
        </CardHeader>
=======
    <div className="flex flex-col h-full overflow-hidden gap-4 px-1">
      {/* MAIN CARD CONTAINER */}
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        
        <MainPageHeader 
          title="Mass & Balance Configuration"
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
              <Button onClick={handleReset} variant="destructive" size="sm" className="h-9 px-4 text-[10px] font-black uppercase"><RotateCcw size={14} className="mr-2" /> Reset</Button>
              
              <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase border-slate-300"><Save size={14} className="mr-2" /> Save Template</Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle className="text-xl font-black uppercase tracking-tight">Save M&B Template</DialogTitle>
                          <DialogDescription className="text-sm font-medium">Give this configuration a unique name to save it as a reusable template.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                          <Input 
                            placeholder="e.g., PA-28-180 Standard"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="h-11 font-bold"
                          />
                      </div>
                      <DialogFooter>
                          <DialogClose asChild><Button variant="outline" className="text-[10px] font-black uppercase border-slate-300">Cancel</Button></DialogClose>
                          <DialogClose asChild>
                              <Button onClick={saveAsTemplate} disabled={!templateName.trim()} className="text-[10px] font-black uppercase">Save Template</Button>
                          </DialogClose>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>

              <Dialog open={isLoadTemplateDialogOpen} onOpenChange={setIsLoadTemplateDialogOpen}>
                  <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase border-slate-300"><Library size={14} className="mr-2" /> Load Template</Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle className="text-xl font-black uppercase tracking-tight">Load M&B Template</DialogTitle>
                          <DialogDescription className="text-sm font-medium">Select a saved template to load its configuration into the calculator.</DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-60 border rounded-xl bg-muted/5 mt-4">
                          <div className="space-y-1 p-2">
                              {isLoadingTemplates ? (<p className="text-center py-4 text-xs font-bold uppercase italic opacity-40">Loading templates...</p>) 
                                : (savedTemplates || []).map(template => (
                                    <div key={template.id} className="flex items-center justify-between p-1 bg-background rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                                      <Button variant="ghost" className="flex-1 justify-start h-10 text-sm font-bold uppercase text-foreground" onClick={() => handleLoadTemplate(template)}>
                                          {template.profileName}
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/5" onClick={() => handleDeleteTemplate(template.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                ))
                              }
                              {(!savedTemplates || savedTemplates.length === 0) && !isLoadingTemplates && (
                                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest text-center py-8 italic opacity-40">No templates saved yet.</p>
                              )}
                          </div>
                      </ScrollArea>
                       <DialogFooter className="mt-4">
                            <DialogClose asChild>
                                <Button variant="outline" className="text-[10px] font-black uppercase border-slate-300">Cancel</Button>
                            </DialogClose>
                        </DialogFooter>
                  </DialogContent>
              </Dialog>
               
               <Dialog open={isLoadAircraftDialogOpen} onOpenChange={setIsLoadAircraftDialogOpen}>
                  <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase border-slate-300"><Upload size={14} className="mr-2" /> Load from Aircraft</Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle className="text-xl font-black uppercase tracking-tight">Load W&B from Aircraft</DialogTitle>
                          <DialogDescription className="text-sm font-medium">
                              Select an aircraft to load its saved Mass &amp; Balance configuration.
                          </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-60 border rounded-xl bg-muted/5 mt-4">
                          <div className="space-y-1 p-2">
                              {isLoadingAircrafts ? (
                                  <p className="text-center py-4 text-xs font-bold uppercase italic opacity-40">Loading aircraft...</p>
                              ) : (aircrafts || []).map(ac => (
                                  <Button
                                      key={ac.id}
                                      variant="ghost"
                                      className="w-full justify-start h-10 text-sm font-black uppercase"
                                      onClick={() => handleLoadFromAircraft(ac)}
                                      disabled={!ac.emptyWeight || !ac.cgEnvelope}
                                      title={!ac.emptyWeight || !ac.cgEnvelope ? 'No M&B profile saved' : ''}
                                  >
                                    {ac.tailNumber} <span className="ml-2 font-medium text-muted-foreground">({ac.model})</span>
                                  </Button>
                              ))}
                              {(!aircrafts || aircrafts.length === 0) && !isLoadingAircrafts && (
                                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest text-center py-8 italic opacity-40">No aircraft found.</p>
                              )}
                          </div>
                      </ScrollArea>
                      <DialogFooter className="mt-4">
                          <DialogClose asChild>
                              <Button variant="outline" className="text-[10px] font-black uppercase border-slate-300">Cancel</Button>
                          </DialogClose>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>

               <Dialog open={isSaveAircraftDialogOpen} onOpenChange={setIsSaveAircraftDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 px-6 text-[10px] font-black uppercase bg-emerald-700 hover:bg-emerald-800 text-white shadow-md"><Plane size={14} className="mr-2" /> Save to Aircraft</Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle className="text-xl font-black uppercase tracking-tight">Save Configuration to Aircraft</DialogTitle>
                          <DialogDescription className="text-sm font-medium">
                              Select an aircraft to apply this Mass &amp; Balance configuration.
                          </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-60 border rounded-xl bg-muted/5 mt-4">
                          <div className="space-y-1 p-2">
                              {isLoadingAircrafts ? (
                                  <p className="text-center py-4 text-xs font-bold uppercase italic opacity-40">Loading aircraft...</p>
                              ) : (aircrafts || []).map(ac => (
                                  <Button
                                      key={ac.id}
                                      variant="ghost"
                                      className="w-full justify-start h-10 text-sm font-black uppercase"
                                      onClick={() => handleSaveToAircraft(ac.id)}
                                  >
                                    {ac.tailNumber} <span className="ml-2 font-medium text-muted-foreground">({ac.model})</span>
                                  </Button>
                              ))}
                              {(!aircrafts || aircrafts.length === 0) && !isLoadingAircrafts && (
                                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest text-center py-8 italic opacity-40">No aircraft found.</p>
                              )}
                          </div>
                      </ScrollArea>
                       <DialogFooter className="mt-4">
                            <DialogClose asChild>
                                <Button variant="outline" className="text-[10px] font-black uppercase border-slate-300">Cancel</Button>
                            </DialogClose>
                        </DialogFooter>
                  </DialogContent>
              </Dialog>
            </div>
          }
        />
        
        {loadedAircraft && (
            <div className="bg-primary/5 px-6 py-2 border-b flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Active Asset:</span>
                <span className="text-sm font-black uppercase text-foreground">{loadedAircraft.tailNumber}</span>
                <Badge variant="outline" className="text-[9px] font-bold uppercase border-primary/20 bg-primary/10 text-primary">{loadedAircraft.model}</Badge>
            </div>
        )}
>>>>>>> temp-save-work

        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
<<<<<<< HEAD
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] h-full overflow-hidden">
            {/* Visual Area */}
            <div className="flex flex-col h-full overflow-hidden border-r bg-card">
              <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar touch-pan-x p-6 flex items-center justify-center">
                <div className="min-w-[900px] w-full h-[600px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 40, right: 60, bottom: 60, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[fXMin, fXMax]} ticks={generateNiceTicks(fXMin, fXMax, 8)} allowDataOverflow>
                        <Label value="CG (inches)" offset={-20} position="insideBottom" fill="hsl(var(--muted-foreground))" />
=======
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-6 space-y-6 pb-24">
              
              {/* GRAPH AREA */}
              <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 md:p-6 relative min-h-[450px] sm:min-h-[560px] md:min-h-[680px] flex flex-col justify-center items-center overflow-hidden shadow-sm">
                  {offScreenStatus && (
                  <OffScreenWarning direction={offScreenStatus.dir} value={offScreenStatus.val} label={offScreenStatus.axis === 'x' ? 'CG' : 'Weight'} />
                  )}

                  <div className="w-full max-w-6xl">
                  <p className="mb-2 w-full pl-1 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:pl-6 md:pl-8">
                    Gross Weight (lbs)
                  </p>
                  <div className="h-[320px] sm:h-[500px] md:h-[620px]">
                  <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 8, bottom: 24, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[finalXMin, finalXMax]} ticks={xAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} dy={10}>
                      <Label value="CG (inches)" offset={0} position="insideBottom" fill="hsl(var(--muted-foreground))" dy={10} className="text-[10px] font-black uppercase" />
>>>>>>> temp-save-work
                      </XAxis>
                      <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[fYMin, fYMax]} ticks={generateNiceTicks(fYMin, fYMax, 8)} allowDataOverflow>
                        <Label value="Gross Weight (lbs)" angle={-90} position="insideLeft" offset={-40} fill="hsl(var(--muted-foreground))" />
                      </YAxis>
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter data={graphConfig.envelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} />
                      <Scatter data={[{ x: results.cg, y: results.weight }]}>
                        <ReferenceDot x={results.cg} y={results.weight} r={10} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={3} />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
<<<<<<< HEAD
                  <div className={cn(
                    "absolute bottom-10 right-10 px-6 py-2 rounded-full font-black text-sm shadow-xl flex items-center gap-2 text-white border-2 border-white/20",
                    results.isSafe ? "bg-green-600" : "bg-red-600 animate-pulse"
                  )}>
                    {results.isSafe ? "ENVELOPE SAFE" : "OUT OF LIMITS"}
                  </div>
                </div>
=======
                  </div>
                  </div>
                  
                  <div className={cn("mt-3 self-end px-4 py-2 text-sm rounded-full font-black uppercase tracking-tight shadow-lg flex items-center gap-2 sm:px-6 md:absolute md:bottom-4 md:right-4 md:mt-0", results.isSafe ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
                  <div className={cn("w-2 h-2 rounded-full", results.isSafe ? 'bg-white' : 'bg-white animate-pulse')}></div>
                  {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS - CONSULT AIRCRAFT POH"}
                  </div>
              </div>

              {/* INPUTS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. BASIC EMPTY WEIGHT */}
                <div className="bg-card p-5 rounded-2xl border border-border shadow-none space-y-4">
                   <h3 className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      1. Basic Empty Weight
                   </h3>
                   <div className="grid grid-cols-3 gap-3">
                      <div className="group">
                          <label className="text-[9px] text-muted-foreground uppercase font-black mb-1 block group-focus-within:text-primary">Weight</label>
                          <Input type="number" value={basicEmpty.weight || ''} onChange={(e) => handleBasicEmptyChange('weight', e.target.value)}
                              className="w-full text-right h-8 text-xs font-bold" />
                      </div>
                      <div className="group">
                          <label className="text-[9px] text-muted-foreground uppercase font-black mb-1 block group-focus-within:text-primary">Arm</label>
                          <Input type="number" value={basicEmpty.arm || ''} onChange={(e) => handleBasicEmptyChange('arm', e.target.value)}
                              className="w-full text-right h-8 text-xs font-bold" />
                      </div>
                      <div className="group">
                          <label className="text-[9px] text-muted-foreground uppercase font-black mb-1 block group-focus-within:text-primary">Moment</label>
                          <Input type="number" value={basicEmpty.moment || ''} onChange={(e) => handleBasicEmptyChange('moment', e.target.value)}
                              className="w-full text-right h-8 text-xs font-bold" />
                      </div>
                   </div>
                </div>

                {/* 2. LOADING STATIONS */}
                <div className="bg-card p-5 rounded-2xl border border-border shadow-none space-y-4">
                   <div className="flex justify-between items-center">
                    <h3 className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-primary"></span>
                       2. Loading Stations
                    </h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={clearStations} className="h-7 w-7 text-destructive hover:bg-destructive/5" title="Clear all"><Trash2 size={14}/></Button>
                      <Button variant="outline" size="sm" onClick={() => addStation('fuel')} className="h-7 text-[9px] font-black uppercase gap-1 px-2 border-yellow-500/30 text-yellow-700 hover:bg-yellow-50"><Fuel size={12}/> Fuel</Button>
                      <Button variant="outline" size="sm" onClick={() => addStation('standard')} className="h-7 text-[9px] font-black uppercase gap-1 px-2 border-slate-300"><Plus size={12}/> Add</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 text-[9px] uppercase text-muted-foreground font-black px-1 mb-1 tracking-wider border-b pb-1">
                     <div className="col-span-5">Station</div>
                     <div className="col-span-3 text-right">Weight</div>
                     <div className="col-span-3 text-right">Arm</div>
                     <div className="col-span-1"></div>
                  </div>

                  <div className="space-y-1">
                    {stations.map((s) => (
                      <div key={s.id} className="group relative border-b border-border/50 last:border-0 pb-2 mb-1 pl-5 transition-colors hover:bg-muted/5">

                        {s.type === 'fuel' ? (
                           // FUEL ROW
                           <div className="pt-1">
                              <button onClick={() => removeStation(s.id)} className="absolute left-0 top-2 text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                              <div className="grid grid-cols-12 gap-2 items-center mb-1">
                                  <div className="col-span-6 flex items-center gap-2 min-w-0">
                                      <Fuel size={12} className="text-yellow-500 shrink-0"/>
                                      <Input value={s.name || ''} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="bg-transparent text-xs font-black uppercase border-none h-7 p-0 focus-visible:ring-0 shadow-none w-full" />
                                  </div>
                                  <div className="col-span-3">
                                      <Input type="number" value={s.weight || ''} onChange={(e) => handleFuelChange(s.id, 'weight', e.target.value)} className="w-full h-7 p-1 text-[10px] text-right font-bold" />
                                  </div>
                                  <div className="col-span-3">
                                      <Input type="number" value={s.arm || ''} onChange={(e) => handleFuelChange(s.id, 'arm', e.target.value)} className="w-full h-7 p-1 text-[10px] text-right font-bold" />
                                  </div>
                              </div>
                              <div className="mb-2">
                                  <Select value={(s.fuelType || 'AVGAS') as FuelType} onValueChange={(value) => handleFuelTypeChange(s.id, value as FuelType)}>
                                      <SelectTrigger className="h-7 text-[10px] font-bold uppercase">
                                          <SelectValue placeholder="Fuel type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="AVGAS" className="text-xs font-medium uppercase">Avgas (6.0 lb/gal)</SelectItem>
                                          <SelectItem value="JET_A1" className="text-xs font-medium uppercase">Jet A-1 (6.7 lb/gal)</SelectItem>
                                          <SelectItem value="JET_A" className="text-xs font-medium uppercase">Jet A (6.7 lb/gal)</SelectItem>
                                          <SelectItem value="MOGAS" className="text-xs font-medium uppercase">Mogas (6.0 lb/gal)</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="flex h-7 items-center justify-between rounded border border-border bg-muted/50 px-2 shadow-inner">
                                      <Input
                                          type="number"
                                          value={s.gallons || ''}
                                          onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)}
                                          className="h-auto w-12 border-none bg-transparent p-0 text-right text-[10px] font-black shadow-none focus-visible:ring-0"
                                          placeholder="0"
                                      />
                                      <span className="text-[9px] font-black uppercase text-muted-foreground">
                                          {formatLitres(Number(s.gallons) || 0)} L
                                      </span>
                                  </div>
                                  <div className="flex h-7 items-center justify-between rounded border border-border bg-muted/50 px-2 shadow-inner">
                                      <div className="flex items-center gap-1">
                                          <Input
                                              type="number"
                                              value={s.maxGallons || ''}
                                              onChange={(e) => updateStation(s.id, 'maxGallons', e.target.value)}
                                              className="h-auto w-12 border-none bg-transparent p-0 text-right text-[10px] font-black shadow-none focus-visible:ring-0"
                                              placeholder="0"
                                          />
                                          <span className="text-[9px] font-black uppercase text-muted-foreground">max gal</span>
                                      </div>
                                      <span className="text-[9px] font-black uppercase text-muted-foreground">
                                          {formatLitres(Number(s.maxGallons) || 0)} L
                                      </span>
                                  </div>
                                  <div className="col-span-2 rounded border border-border bg-muted/30 px-2 py-1 text-[10px] font-black text-muted-foreground text-right uppercase">
                                      <span className="text-foreground">{s.weight || 0} LB</span>
                                      <span className="mx-1 text-muted-foreground/60">/</span>
                                      <span>{formatKilograms(Number(s.weight) || 0)} KG</span>
                                  </div>
                              </div>
                              <input type="range" min="0" max={s.maxGallons || 50} value={s.gallons || 0}
                                      onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)}
                                      className="w-full h-1 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-yellow-500 block mt-3" />
                           </div>
                        ) : (
                          // STANDARD ROW
                          <div className="grid grid-cols-12 gap-2 items-center py-1">
                              <button onClick={() => removeStation(s.id)} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                              <div className="col-span-6 min-w-0">
                                  <Input value={s.name || ''} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="bg-transparent text-xs font-bold uppercase text-foreground border-none h-7 p-0 focus-visible:ring-0 shadow-none w-full" placeholder="Item Name" />
                              </div>
                              <div className="col-span-3">
                                  <Input type="number" value={s.weight || ''} onChange={(e) => updateStation(s.id, 'weight', e.target.value)} className="w-full h-7 p-1 text-[10px] text-right font-bold" />
                              </div>
                              <div className="col-span-3">
                                   <Input type="number" value={s.arm || ''} onChange={(e) => updateStation(s.id, 'arm', e.target.value)} className="w-full h-7 p-1 text-[10px] text-right font-bold" />
                              </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. CONFIG CARD */}
                <div className="bg-card p-5 rounded-2xl border border-border shadow-none space-y-4">
                  <div className="flex justify-between items-center">
                     <h3 className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-primary"></span>
                       3. Chart Config
                     </h3>
                     <Button variant="outline" size="sm" onClick={handleAutoFit} className="h-7 text-[9px] font-black uppercase gap-1 px-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50">
                        <Maximize size={12}/> Auto-Fit
                     </Button>
                  </div>
                   <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2">
                    <div className="space-y-1"><label className="text-[9px] text-muted-foreground uppercase font-black">Min CG</label><Input type="number" value={graphConfig.xMin || ''} onChange={(e) => setGraphConfig({...graphConfig, xMin: Number(e.target.value)})} className="w-full h-8 text-xs font-bold" /></div>
                    <div className="space-y-1"><label className="text-[9px] text-muted-foreground uppercase font-black">Max CG</label><Input type="number" value={graphConfig.xMax || ''} onChange={(e) => setGraphConfig({...graphConfig, xMax: Number(e.target.value)})} className="w-full h-8 text-xs font-bold" /></div>
                    <div className="space-y-1"><label className="text-[9px] text-muted-foreground uppercase font-black">Min Weight</label><Input type="number" value={graphConfig.yMin || ''} onChange={(e) => setGraphConfig({...graphConfig, yMin: Number(e.target.value)})} className="w-full h-8 text-xs font-bold" /></div>
                    <div className="space-y-1"><label className="text-[9px] text-muted-foreground uppercase font-black">Max Weight</label><Input type="number" value={graphConfig.yMax || ''} onChange={(e) => setGraphConfig({...graphConfig, yMax: Number(e.target.value)})} className="w-full h-8 text-xs font-bold" /></div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-1">
                     <label className="text-[9px] text-muted-foreground uppercase font-black block mb-3 tracking-widest">Envelope Points</label>
                     <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {graphConfig.envelope.map((pt, i) => (
                           <div key={i} className="flex gap-2 items-center bg-muted/5 p-1 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] text-white font-black shrink-0" style={{ backgroundColor: POINT_COLORS[i % POINT_COLORS.length] }}>{i + 1}</div>
                              <Input type="number" value={pt.x || ''} onChange={(e) => updateEnvelopePoint(i, 'x', e.target.value)} className="w-full h-8 text-xs font-bold text-center p-1 bg-background" />
                              <Input type="number" value={pt.y || ''} onChange={(e) => updateEnvelopePoint(i, 'y', e.target.value)} className="w-full h-8 text-xs font-bold text-center p-1 bg-background" />
                              <button onClick={() => removeEnvelopePoint(i)} className="text-muted-foreground hover:text-destructive transition p-1 opacity-20 hover:opacity-100"><Trash2 size={14}/></button>
                           </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={addEnvelopePoint} className="w-full h-10 text-[9px] font-black uppercase gap-1 mt-2 text-muted-foreground hover:bg-muted/50 border border-dashed border-slate-300"><Plus size={14}/> Add Point</Button>
                     </div>
                  </div>
                </div>

>>>>>>> temp-save-work
              </div>
            </div>

            {/* Sidebar Config Area */}
            <div className="flex flex-col h-full overflow-hidden bg-background">
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6 pb-20">
                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">1. Basic Dimensions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Empty Weight</Label><Input type="number" value={basicEmpty.weight} onChange={(e) => handleBasicEmptyChange('weight', e.target.value)} className="h-9 font-bold" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Empty Arm</Label><Input type="number" value={basicEmpty.arm} onChange={(e) => handleBasicEmptyChange('arm', e.target.value)} className="h-9 font-bold" /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-xs font-black uppercase tracking-widest text-primary">2. Loading Stations</h3>
                      <Button variant="ghost" size="sm" onClick={() => setStations([...stations, { id: Date.now(), name: "New Station", weight: 0, arm: 0, type: 'standard' }])} className="h-6 text-[10px] uppercase font-bold"><Plus className="mr-1 h-3 w-3" /> Add</Button>
                    </div>
                    <div className="space-y-3">
                      {stations.map((s) => (
                        <div key={s.id} className="p-3 border rounded-lg bg-muted/10 space-y-2 group">
                          <div className="flex items-center justify-between gap-2">
                            <Input value={s.name} onChange={(e) => setStations(stations.map(st => st.id === s.id ? { ...st, name: e.target.value } : st))} className="h-7 border-none bg-transparent font-bold text-xs p-0 focus-visible:ring-0 shadow-none" />
                            <Button variant="ghost" size="icon" onClick={() => setStations(stations.filter(st => st.id !== s.id))} className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1"><Label className="text-[9px] uppercase font-bold text-muted-foreground">Weight (lbs)</Label><Input type="number" value={s.weight} onChange={(e) => handleFuelChange(s.id, 'weight', e.target.value)} className="h-8 text-xs bg-background" /></div>
                            <div className="space-y-1"><Label className="text-[9px] uppercase font-bold text-muted-foreground">Arm (in)</Label><Input type="number" value={s.arm} onChange={(e) => setStations(stations.map(st => st.id === s.id ? { ...st, arm: parseFloat(e.target.value) || 0 } : st))} className="h-8 text-xs bg-background" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">3. Envelope Ticks</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-[9px] uppercase font-bold">Min Weight</Label><Input type="number" value={graphConfig.yMin} onChange={(e) => setGraphConfig({...graphConfig, yMin: Number(e.target.value)})} className="h-8 text-xs" /></div>
                      <div className="space-y-1"><Label className="text-[9px] uppercase font-bold">Max Weight</Label><Input type="number" value={graphConfig.yMax} onChange={(e) => setGraphConfig({...graphConfig, yMax: Number(e.target.value)})} className="h-8 text-xs" /></div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isSaveAircraftDialogOpen} onOpenChange={setIsSaveAircraftDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Commit to Aircraft Profile</DialogTitle></DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Select target aircraft</Label>
            <ScrollArea className="h-60 border rounded-md">
              <div className="p-2 space-y-1">
                {(aircrafts || []).map(ac => (
                  <Button key={ac.id} variant="ghost" className="w-full justify-start text-sm" onClick={() => handleSaveToAircraft(ac.id)}>{ac.tailNumber} ({ac.model})</Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WBCalculator;
