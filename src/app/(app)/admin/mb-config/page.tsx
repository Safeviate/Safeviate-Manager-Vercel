'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot, Cell } from 'recharts';
import { doc, setDoc, collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Plus, Trash2, RotateCcw, Maximize, Fuel, AlertTriangle, Plane, Upload, Library } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateFuelGallonsFromWeight, calculateFuelWeight, gallonsToLitres, getFuelPreset, poundsToKilograms, type FuelType } from '@/lib/fuel';
import type { Aircraft, AircraftModelProfile } from '@/types/aircraft';

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];

// --- HELPER 1: Generate "Nice" Ticks ---
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

  if (ticks[ticks.length - 1] < end && (end - ticks[ticks.length - 1]) < step * 0.1) {
    ticks.push(end);
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

  if (baseStation.type !== 'fuel') {
    return baseStation;
  }

  const preset = getFuelPreset(station.fuelType);

  return {
    ...baseStation,
    gallons: parseFloat(String(station.gallons)) || 0,
    maxGallons: parseFloat(String(station.maxGallons)) || 0,
    fuelType: station.fuelType || 'AVGAS',
    densityLbPerGallon: parseFloat(String(station.densityLbPerGallon)) || preset.densityLbPerGallon,
  };
};

// --- HELPER 2: Visual Warning Component ---
const OffScreenWarning = ({ direction, value, label }: { direction: string, value: number, label: string }) => (
  <div className={`absolute top-1/2 ${direction === 'left' ? 'left-4' : 'right-4'} transform -translate-y-1/2 bg-red-900/90 border border-red-500 text-white p-3 rounded shadow-xl z-10 flex flex-col items-center animate-pulse`}>
    <AlertTriangle className="text-red-400 mb-1" size={24} />
    <span className="font-bold text-xs uppercase">{label} Off Scale!</span>
    <span className="text-lg font-mono">{value}</span>
    <span className="text-xs text-gray-300">
      {direction === 'left' ? '← Move Left' : 'Move Right →' }
    </span>
  </div>
);

const WBCalculator = () => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftsQuery = useMemoFirebase(
      () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null),
      [firestore, tenantId]
  );
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);

  const templatesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/massAndBalance`) : null),
    [firestore, tenantId]
  );
  const { data: savedTemplates, isLoading: isLoadingTemplates } = useCollection<AircraftModelProfile>(templatesQuery);

  // 1. STATE: Graph Config
  const [graphConfig, setGraphConfig] = useState({
    modelName: "Piper PA-28-180",
    xMin: 80, xMax: 94,
    yMin: 1295, yMax: 2600,
    envelope: [
      { x: 82, y: 1400 },
      { x: 82, y: 1950 },
      { x: 86.5, y: 2450 },
      { x: 93, y: 2450 },
      { x: 93, y: 1400 },
      { x: 82, y: 1400 },
    ]
  });

  // 2. STATE: Aircraft Basics
  const [basicEmpty, setBasicEmpty] = useState({
    weight: 1416,
    moment: 120360,
    arm: 85.0
  });

  // 3. STATE: Stations
  const [stations, setStations] = useState<any[]>([
    { id: 2, name: "Pilot & Front Pax", weight: 340, arm: 85.5, type: 'standard' },
    { id: 3, name: "Fuel", weight: 288, arm: 95.0, type: 'fuel', gallons: 48, maxGallons: 50, fuelType: 'AVGAS', densityLbPerGallon: 6.0 },
    { id: 4, name: "Rear Pax", weight: 0, arm: 118.1, type: 'standard' },
    { id: 5, name: "Baggage", weight: 0, arm: 142.8, type: 'standard' },
  ]);

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });
  const [isSaveAircraftDialogOpen, setIsSaveAircraftDialogOpen] = useState(false);
  const [isLoadAircraftDialogOpen, setIsLoadAircraftDialogOpen] = useState(false);
  const [isLoadTemplateDialogOpen, setIsLoadTemplateDialogOpen] = useState(false);
  const [loadedAircraft, setLoadedAircraft] = useState<Aircraft | null>(null);
  const [templateName, setTemplateName] = useState('');


  // 4. LOGIC
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
    const safe = graphConfig.envelope.length > 2
        ? isPointInPolygon({ x: roundedCg, y: roundedWeight }, graphConfig.envelope)
        : false;

    setResults({
      cg: roundedCg,
      weight: roundedWeight,
      isSafe: safe
    });
  }, [stations, basicEmpty, graphConfig.envelope]);

  // HANDLERS
  const handleBasicEmptyChange = (field: string, value: string) => {
    const val = parseFloat(value) || 0;
    if (field === 'weight') {
      const newMoment = val * basicEmpty.arm;
      setBasicEmpty({ ...basicEmpty, weight: val, moment: parseFloat(newMoment.toFixed(2)) });
    } else if (field === 'moment') {
      const newArm = basicEmpty.weight > 0 ? val / basicEmpty.weight : 0;
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
      const fuelStation = normalizeFuelStation(s);
      const density = Number(fuelStation.densityLbPerGallon) || getFuelPreset(fuelStation.fuelType).densityLbPerGallon;
      const maxGallons = Math.max(Number(fuelStation.maxGallons) || 0, 0);
      if (field === 'gallons') {
        const gallons = clamp(val, 0, maxGallons);
        return { ...fuelStation, gallons, weight: parseFloat(calculateFuelWeight(gallons, density).toFixed(1)) };
      }
      if (field === 'weight') {
        const gallons = clamp(calculateFuelGallonsFromWeight(val, density), 0, maxGallons);
        return {
          ...fuelStation,
          weight: parseFloat(calculateFuelWeight(gallons, density).toFixed(1)),
          gallons: parseFloat(gallons.toFixed(1))
        };
      }
      if (field === 'maxGallons') {
        const maxGallonsValue = Math.max(val, 0);
        const gallons = clamp(Number(fuelStation.gallons) || 0, 0, maxGallonsValue);
        return {
          ...fuelStation,
          maxGallons: maxGallonsValue,
          gallons: parseFloat(gallons.toFixed(1)),
          weight: parseFloat(calculateFuelWeight(gallons, density).toFixed(1))
        };
      }
      return { ...s, [field]: val };
    }));
  };

  const handleFuelTypeChange = (id: number, fuelType: FuelType) => {
    setStations(stations.map(s => {
      if (s.id !== id) return s;
      const preset = getFuelPreset(fuelType);
      const fuelStation = normalizeFuelStation(s);
      const gallons = Number(fuelStation.gallons) || 0;
      return {
        ...fuelStation,
        fuelType,
        densityLbPerGallon: preset.densityLbPerGallon,
        weight: parseFloat(calculateFuelWeight(gallons, preset.densityLbPerGallon).toFixed(1))
      };
    }));
  };

  const handleAutoFit = () => {
    if (graphConfig.envelope.length < 2) return alert("Add points first!");
    const xValues = graphConfig.envelope.map(p => p.x);
    const minX = Math.floor(Math.min(...xValues) - 1);
    const maxX = Math.ceil(Math.max(...xValues) + 1);
    setGraphConfig(prevConfig => ({ ...prevConfig, xMin: minX, xMax: maxX }));
  };

  const updateStation = (id: number, field: string, val: string) => setStations(stations.map(s => s.id === id ? { ...s, [field]: val } : s));

  const addStation = (type = 'standard') => {
    const newStation = {
        id: Date.now(),
        name: type === 'fuel' ? "New Fuel Tank" : "New Item",
        weight: 0,
        arm: 0,
        type: type,
        ...(type === 'fuel' ? { gallons: 0, maxGallons: 50, fuelType: 'AVGAS', densityLbPerGallon: 6.0 } : {})
    };
    setStations([...stations, newStation]);
  };
  
  const clearStations = () => {
      setStations([]);
  }

  const removeStation = (id: number) => setStations(stations.filter(s => s.id !== id));

  const updateEnvelopePoint = (index: number, field: string, val: string) => {
    const newEnv = [...graphConfig.envelope];
    (newEnv[index] as any)[field] = Number(val);
    setGraphConfig({ ...graphConfig, envelope: newEnv });
  };
  const addEnvelopePoint = () => setGraphConfig({ ...graphConfig, envelope: [...graphConfig.envelope, { x: 0, y: 0 }] });
  const removeEnvelopePoint = (index: number) => {
    const newEnv = graphConfig.envelope.filter((_, i) => i !== index);
    setGraphConfig({ ...graphConfig, envelope: newEnv });
  };

  const handleReset = () => {
    if (window.confirm("Reset to default Piper PA-28 data?")) {
      setGraphConfig({
        modelName: "Piper PA-28-180",
        xMin: 80, xMax: 94, yMin: 1295, yMax: 2600,
        envelope: [{ x: 82, y: 1400 }, { x: 82, y: 1950 }, { x: 86.5, y: 2450 }, { x: 93, y: 2450 }, { x: 93, y: 1400 }, { x: 82, y: 1400 }]
      });
      setBasicEmpty({ weight: 1416, moment: 120360, arm: 85.0 });
      setStations([
        { id: 2, name: "Pilot & Front Pax", weight: 340, arm: 85.5, type: 'standard' },
        { id: 3, name: "Fuel", weight: 288, arm: 95.0, type: 'fuel', gallons: 48, maxGallons: 50, fuelType: 'AVGAS', densityLbPerGallon: 6.0 },
        { id: 4, name: "Rear Pax", weight: 0, arm: 118.1, type: 'standard' },
        { id: 5, name: "Baggage", weight: 0, arm: 142.8, type: 'standard' },
      ]);
      setLoadedAircraft(null);
    }
  };

  const saveAsTemplate = async () => {
    if (!firestore) {
        alert("Firestore not initialized.");
        return;
    }
    if (!templateName.trim()) {
        toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter a name for the template.' });
        return;
    }
    try {
        const templateId = templateName.trim().toLowerCase().replace(/\s+/g, '-');
        const dataToSave = {
            id: templateId,
            profileName: templateName.trim(),
            emptyWeight: Number(basicEmpty.weight) || 0,
            emptyWeightMoment: Number(basicEmpty.moment) || 0,
            xMin: Number(graphConfig.xMin) || 0,
            xMax: Number(graphConfig.xMax) || 0,
            yMin: Number(graphConfig.yMin) || 0,
            yMax: Number(graphConfig.yMax) || 0,
            cgEnvelope: graphConfig.envelope,
            stations: stations.map(serializeStation)
        };

        await setDoc(doc(firestore, "tenants/safeviate/massAndBalance", templateId), dataToSave);

        toast({ title: 'Template Saved', description: `M&B Template "${templateName.trim()}" has been saved.` });
        setTemplateName('');
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the template.' });
    }
  };
  
  const handleSaveToAircraft = (aircraftId: string) => {
    if (!firestore) return;
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    
    const mbDataToSave = {
        emptyWeight: basicEmpty.weight,
        emptyWeightMoment: basicEmpty.moment,
        maxTakeoffWeight: graphConfig.yMax,
        maxLandingWeight: graphConfig.yMax,
        cgEnvelope: graphConfig.envelope.map(p => ({ weight: p.y, cg: p.x })),
        stations: stations.map(serializeStation),
    };

    updateDocumentNonBlocking(aircraftRef, mbDataToSave);
    
    toast({
        title: 'Saved to Aircraft',
        description: `M&B profile has been saved to the selected aircraft.`
    });
    
    setIsSaveAircraftDialogOpen(false);
  }

  const handleLoadFromAircraft = (aircraft: Aircraft) => {
    if (!aircraft.emptyWeight || !aircraft.emptyWeightMoment || !aircraft.cgEnvelope) {
        toast({ variant: 'destructive', title: 'Load Failed', description: 'Selected aircraft does not have a complete M&B profile.' });
        return;
    }
    
    const envelope = aircraft.cgEnvelope.map(p => ({ x: p.cg, y: p.weight }));
    
    setGraphConfig({
        modelName: aircraft.model,
        xMin: Math.min(...envelope.map(p => p.x)) - 2,
        xMax: Math.max(...envelope.map(p => p.x)) + 2,
        yMin: Math.min(...envelope.map(p => p.y)) - 100,
        yMax: Math.max(...envelope.map(p => p.y)) + 100,
        envelope,
    });

    const arm = aircraft.emptyWeight > 0 ? aircraft.emptyWeightMoment / aircraft.emptyWeight : 0;
    setBasicEmpty({
        weight: aircraft.emptyWeight,
        moment: aircraft.emptyWeightMoment,
        arm: parseFloat(arm.toFixed(2)),
    });

    const newStations = aircraft.stations && aircraft.stations.length > 0 
        ? aircraft.stations.map(normalizeFuelStation)
        : [];
        
    setStations(newStations);
    
    setLoadedAircraft(aircraft);

    toast({ title: 'Aircraft W&B Loaded', description: `Configuration for ${aircraft.tailNumber} loaded.` });
    setIsLoadAircraftDialogOpen(false);
  };

  const handleLoadTemplate = (template: AircraftModelProfile) => {
    setGraphConfig({
      modelName: template.profileName,
      xMin: template.xMin,
      xMax: template.xMax,
      yMin: template.yMin,
      yMax: template.yMax,
      envelope: (template.cgEnvelope || []).map(p => ({ x: p.x, y: p.y })),
    });

    const arm = template.emptyWeight > 0 ? template.emptyWeightMoment / template.emptyWeight : 0;
    setBasicEmpty({
        weight: template.emptyWeight,
        moment: template.emptyWeightMoment,
        arm: parseFloat(arm.toFixed(2)),
    });

    setStations((template.stations || []).map(normalizeFuelStation));
    setLoadedAircraft(null);

    toast({ title: 'Template Loaded', description: `Template "${template.profileName}" has been loaded.` });
    setIsLoadTemplateDialogOpen(false);
  }
  
  const handleDeleteTemplate = (templateId: string) => {
      if (!firestore) return;
      const templateRef = doc(firestore, `tenants/${tenantId}/massAndBalance`, templateId);
      deleteDocumentNonBlocking(templateRef);
      toast({ title: "Template Deleted" });
  }


  // SAFETY DOMAIN
  const allX = [...graphConfig.envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
  const allY = [...graphConfig.envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
  
  const paddingX = allX.length > 1 ? (Math.max(...allX) - Math.min(...allX)) * 0.1 : 5;
  const paddingY = allY.length > 1 ? (Math.max(...allY) - Math.min(...allY)) * 0.1 : 100;
  
  const finalXMin = allX.length > 0 ? Math.min(Number(graphConfig.xMin), ...allX) - paddingX : 70;
  const finalXMax = allX.length > 0 ? Math.max(Number(graphConfig.xMax), ...allX) + paddingX : 100;
  const finalYMin = allY.length > 0 ? Math.min(Number(graphConfig.yMin), ...allY) - paddingY : 1000;
  const finalYMax = allY.length > 0 ? Math.max(Number(graphConfig.yMax), ...allY) + paddingY : 3000;

  const xAxisTicks = generateNiceTicks(finalXMin, finalXMax, 8);
  const yAxisTicks = generateNiceTicks(finalYMin, finalYMax, 8);
  
  const offScreenStatus = results.cg < finalXMin ? { axis: 'x', dir: 'left', val: results.cg } : null;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      {/* MAIN CARD CONTAINER */}
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        
        {/* STICKY HEADER */}
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col items-start gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {loadedAircraft && (
                <p className="text-xs text-muted-foreground">
                    Loaded: <span className="font-semibold text-primary">{loadedAircraft.tailNumber}</span> ({loadedAircraft.model})
                </p>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <Button onClick={handleReset} variant="destructive" size="sm" className="gap-2 text-xs sm:text-sm"><RotateCcw size={14} /> Reset</Button>
            
            <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm"><Save size={14} /> Save as Template</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save M&B Template</DialogTitle>
                        <DialogDescription>Give this configuration a unique name to save it as a reusable template.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                          placeholder="e.g., PA-28-180 Standard"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <DialogClose asChild>
                            <Button onClick={saveAsTemplate} disabled={!templateName.trim()}>Save Template</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isLoadTemplateDialogOpen} onOpenChange={setIsLoadTemplateDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm"><Library size={14} /> Load Template</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Load M&B Template</DialogTitle>
                        <DialogDescription>Select a saved template to load its configuration into the calculator.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-60">
                        <div className="space-y-2 p-1">
                            {isLoadingTemplates ? (<p>Loading templates...</p>) 
                              : (savedTemplates || []).map(template => (
                                  <div key={template.id} className="flex items-center justify-between">
                                    <Button variant="ghost" className="w-full justify-start" onClick={() => handleLoadTemplate(template)}>
                                        {template.profileName}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTemplate(template.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                              ))
                            }
                            {(!savedTemplates || savedTemplates.length === 0) && !isLoadingTemplates && (
                                <p className="text-muted-foreground text-sm text-center py-4">No templates saved yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                     <DialogFooter>
                          <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                          </DialogClose>
                      </DialogFooter>
                </DialogContent>
            </Dialog>
             
             <Dialog open={isLoadAircraftDialogOpen} onOpenChange={setIsLoadAircraftDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm"><Upload size={14} /> Load from Aircraft</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Load W&B from Aircraft</DialogTitle>
                        <DialogDescription>
                            Select an aircraft to load its saved Mass &amp; Balance configuration into the calculator.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-60">
                        <div className="space-y-2 p-1">
                            {isLoadingAircrafts ? (
                                <p>Loading aircraft...</p>
                            ) : (aircrafts || []).map(ac => (
                                <Button
                                    key={ac.id}
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => handleLoadFromAircraft(ac)}
                                    disabled={!ac.emptyWeight || !ac.cgEnvelope}
                                    title={!ac.emptyWeight || !ac.cgEnvelope ? 'No M&B profile saved' : ''}
                                >
                                  {ac.tailNumber} ({ac.model})
                                </Button>
                            ))}
                            {(!aircrafts || aircrafts.length === 0) && !isLoadingAircrafts && (
                                <p className="text-muted-foreground text-sm text-center py-4">No aircraft found.</p>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isSaveAircraftDialogOpen} onOpenChange={setIsSaveAircraftDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 text-xs sm:text-sm"><Plane size={14} /> Save to Aircraft</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Configuration to Aircraft</DialogTitle>
                        <DialogDescription>
                            Select an aircraft to apply this Mass &amp; Balance configuration.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-60">
                        <div className="space-y-2 p-1">
                            {isLoadingAircrafts ? (
                                <p>Loading aircraft...</p>
                            ) : (aircrafts || []).map(ac => (
                                <Button
                                    key={ac.id}
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => handleSaveToAircraft(ac.id)}
                                >
                                  {ac.tailNumber} ({ac.model})
                                </Button>
                            ))}
                            {(!aircrafts || aircrafts.length === 0) && !isLoadingAircrafts && (
                                <p className="text-muted-foreground text-sm text-center py-4">No aircraft found.</p>
                            )}
                        </div>
                    </ScrollArea>
                     <DialogFooter>
                          <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                          </DialogClose>
                      </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {/* SCROLLABLE CONTENT */}
        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-6 space-y-6 pb-24">
              
              {/* GRAPH AREA */}
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 md:p-6 relative min-h-[450px] sm:min-h-[560px] md:min-h-[680px] flex flex-col justify-center items-center overflow-hidden shadow-none">
                  {offScreenStatus && (
                  <OffScreenWarning direction={offScreenStatus.dir} value={offScreenStatus.val} label={offScreenStatus.axis === 'x' ? 'CG' : 'Weight'} />
                  )}

                  <div className="w-full max-w-6xl">
                  <p className="mb-2 w-full pl-1 text-left text-[11px] font-semibold text-muted-foreground sm:pl-6 md:pl-8">
                    Gross Weight (lbs)
                  </p>
                  <div className="h-[320px] sm:h-[500px] md:h-[620px]">
                  <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 8, bottom: 24, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[finalXMin, finalXMax]} ticks={xAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} dy={10}>
                      <Label value="CG (inches)" offset={0} position="insideBottom" fill="hsl(var(--muted-foreground))" dy={10} />
                      </XAxis>
                      <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[finalYMin, finalYMax]} ticks={yAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}/>
                      <Scatter name="Envelope Line" data={graphConfig.envelope} fill="transparent" line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} isAnimationActive={false} />
                      <Scatter name="Envelope Points" data={graphConfig.envelope} isAnimationActive={false}>
                      {graphConfig.envelope.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={POINT_COLORS[index % POINT_COLORS.length]} stroke="white" strokeWidth={1}/>
                      ))}
                      </Scatter>
                      <Scatter name="Current Load" data={[{ x: results.cg, y: results.weight }]} fill={results.isSafe ? "#10b981" : "#ef4444"} isAnimationActive={false}>
                          <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={2} />
                      </Scatter>
                  </ScatterChart>
                  </ResponsiveContainer>
                  </div>
                  </div>
                  
                  <div className={cn("mt-3 self-end px-4 py-2 text-sm rounded-full font-bold shadow-lg flex items-center gap-2 sm:px-6 md:absolute md:bottom-4 md:right-4 md:mt-0", results.isSafe ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white')}>
                  <div className={cn("w-2 h-2 rounded-full", results.isSafe ? 'bg-white' : 'bg-white animate-pulse')}></div>
                  {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS - CONSULT AIRCRAFT POH"}
                  </div>
              </div>

              {/* INPUTS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. BASIC EMPTY WEIGHT */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-none space-y-4">
                   <h3 className="text-primary font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      1. Basic Empty Weight
                   </h3>
                   <div className="grid grid-cols-3 gap-3">
                      <div className="group">
                          <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block group-focus-within:text-primary">Weight</label>
                          <Input type="number" value={basicEmpty.weight || ''} onChange={(e) => handleBasicEmptyChange('weight', e.target.value)}
                              className="w-full text-right h-8 text-xs" />
                      </div>
                      <div className="group">
                          <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block group-focus-within:text-primary">Arm</label>
                          <Input type="number" value={basicEmpty.arm || ''} onChange={(e) => handleBasicEmptyChange('arm', e.target.value)}
                              className="w-full text-right h-8 text-xs" />
                      </div>
                      <div className="group">
                          <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block group-focus-within:text-primary">Moment</label>
                          <Input type="number" value={basicEmpty.moment || ''} onChange={(e) => handleBasicEmptyChange('moment', e.target.value)}
                              className="w-full text-right h-8 text-xs" />
                      </div>
                   </div>
                </div>

                {/* 2. LOADING STATIONS */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-none space-y-4">
                   <div className="flex justify-between items-center">
                    <h3 className="text-primary font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-primary"></span>
                       2. Loading Stations
                    </h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={clearStations} className="h-6 w-6 text-destructive hover:bg-destructive/10" title="Clear all"><Trash2 size={12}/></Button>
                      <Button variant="outline" size="sm" onClick={() => addStation('fuel')} className="h-6 text-[9px] gap-1 px-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-50"><Fuel size={10}/> Fuel</Button>
                      <Button variant="outline" size="sm" onClick={() => addStation('standard')} className="h-6 text-[9px] gap-1 px-2"><Plus size={10}/> Add</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 text-[9px] uppercase text-muted-foreground font-bold px-1 mb-1 tracking-wider border-b pb-1">
                     <div className="col-span-5">Station</div>
                     <div className="col-span-3 text-right">Weight</div>
                     <div className="col-span-3 text-right">Arm</div>
                     <div className="col-span-1"></div>
                  </div>

                  <div className="space-y-1">
                    {stations.map((s) => (
                      <div key={s.id} className="group relative border-b border-border/50 last:border-0 pb-2 mb-1 pl-5">

                        {s.type === 'fuel' ? (
                           // FUEL ROW
                           <div className="pt-1">
                              <button onClick={() => removeStation(s.id)} className="absolute left-0 top-2 text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                              <div className="grid grid-cols-12 gap-2 items-center mb-1">
                                  <div className="col-span-6 flex items-center gap-2 min-w-0">
                                      <Fuel size={12} className="text-yellow-500 shrink-0"/>
                                      <Input value={s.name || ''} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="bg-transparent text-xs font-bold border-none h-7 p-0 focus-visible:ring-0 shadow-none w-full" />
                                  </div>
                                  <div className="col-span-3">
                                      <Input type="number" value={s.weight || ''} onChange={(e) => handleFuelChange(s.id, 'weight', e.target.value)} className="w-full h-7 p-1 text-[10px] text-right" />
                                  </div>
                                  <div className="col-span-3">
                                      <Input type="number" value={s.arm || ''} onChange={(e) => handleFuelChange(s.id, 'arm', e.target.value)} className="w-full h-7 p-1 text-[10px] text-right" />
                                  </div>
                              </div>
                              <div className="mb-2">
                                  <Select value={(s.fuelType || 'AVGAS') as FuelType} onValueChange={(value) => handleFuelTypeChange(s.id, value as FuelType)}>
                                      <SelectTrigger className="h-7 text-[10px]">
                                          <SelectValue placeholder="Fuel type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="AVGAS">Avgas (6.0 lb/gal)</SelectItem>
                                          <SelectItem value="JET_A1">Jet A-1 (6.7 lb/gal)</SelectItem>
                                          <SelectItem value="JET_A">Jet A (6.7 lb/gal)</SelectItem>
                                          <SelectItem value="MOGAS">Mogas (6.0 lb/gal)</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="flex h-7 items-center justify-between rounded border border-border bg-muted/50 px-2 shadow-inner">
                                      <Input
                                          type="number"
                                          value={s.gallons || ''}
                                          onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)}
                                          className="h-auto w-12 border-none bg-transparent p-0 text-right text-[10px] font-bold shadow-none focus-visible:ring-0"
                                          placeholder="0"
                                      />
                                      <span className="text-[9px] font-medium text-muted-foreground">
                                          {formatLitres(Number(s.gallons) || 0)} L
                                      </span>
                                  </div>
                                  <div className="flex h-7 items-center justify-between rounded border border-border bg-muted/50 px-2 shadow-inner">
                                      <div className="flex items-center gap-1">
                                          <Input
                                              type="number"
                                              value={s.maxGallons || ''}
                                              onChange={(e) => updateStation(s.id, 'maxGallons', e.target.value)}
                                              className="h-auto w-12 border-none bg-transparent p-0 text-right text-[10px] font-bold shadow-none focus-visible:ring-0"
                                              placeholder="0"
                                          />
                                          <span className="text-[9px] font-semibold uppercase text-muted-foreground">max gal</span>
                                      </div>
                                      <span className="text-[9px] font-medium text-muted-foreground">
                                          {formatLitres(Number(s.maxGallons) || 0)} L
                                      </span>
                                  </div>
                                  <div className="col-span-2 rounded border border-border bg-muted/30 px-2 py-1 text-[10px] font-semibold text-muted-foreground text-right">
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
                                  <Input value={s.name || ''} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="bg-transparent text-xs font-medium border-none h-7 p-0 focus-visible:ring-0 shadow-none w-full" placeholder="Item Name" />
                              </div>
                              <div className="col-span-3">
                                  <Input type="number" value={s.weight || ''} onChange={(e) => updateStation(s.id, 'weight', e.target.value)} className="w-full h-7 p-1 text-[10px] text-right" />
                              </div>
                              <div className="col-span-3">
                                   <Input type="number" value={s.arm || ''} onChange={(e) => updateStation(s.id, 'arm', e.target.value)} className="w-full h-7 p-1 text-[10px] text-right" />
                              </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. CONFIG CARD */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-none space-y-4">
                  <div className="flex justify-between items-center">
                     <h3 className="text-primary font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-primary"></span>
                       3. Chart Config
                     </h3>
                     <Button variant="outline" size="sm" onClick={handleAutoFit} className="h-6 text-[9px] gap-1 px-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50">
                        <Maximize size={10}/> Auto-Fit
                     </Button>
                  </div>
                   <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2">
                    <div className="space-y-1"><label className="text-[9px] text-muted-foreground uppercase font-bold">Min CG</label><Input type="number" value={graphConfig.xMin || ''} onChange={(e) => setGraphConfig({...graphConfig, xMin: Number(e.target.value)})} className="w-full h-7 text-[10px]" /></div>
                    <div className="space-y-1"><label className="text-[9px] text-muted-foreground uppercase font-bold">Max CG</label><Input type="number" value={graphConfig.xMax || ''} onChange={(e) => setGraphConfig({...graphConfig, xMax: Number(e.target.value)})} className="w-full h-7 text-[10px]" /></div>
                    <div className="space-y-1"><label className="text-[9px] text-muted-foreground uppercase font-bold">Min Weight</label><Input type="number" value={graphConfig.yMin || ''} onChange={(e) => setGraphConfig({...graphConfig, yMin: Number(e.target.value)})} className="w-full h-7 text-[10px]" /></div>
                    <div className="space-y-1"><label className="text-[9px] text-muted-foreground uppercase font-bold">Max Weight</label><Input type="number" value={graphConfig.yMax || ''} onChange={(e) => setGraphConfig({...graphConfig, yMax: Number(e.target.value)})} className="w-full h-7 text-[10px]" /></div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-1">
                     <label className="text-[9px] text-muted-foreground uppercase font-bold block mb-2">Envelope Points</label>
                     <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {graphConfig.envelope.map((pt, i) => (
                           <div key={i} className="flex gap-1 items-center bg-muted/20 p-1 rounded">
                              <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-black font-bold shrink-0" style={{ backgroundColor: POINT_COLORS[i % POINT_COLORS.length] }}>{i + 1}</div>
                              <Input type="number" value={pt.x || ''} onChange={(e) => updateEnvelopePoint(i, 'x', e.target.value)} className="w-full h-7 text-[10px] text-center p-1" />
                              <Input type="number" value={pt.y || ''} onChange={(e) => updateEnvelopePoint(i, 'y', e.target.value)} className="w-full h-7 text-[10px] text-center p-1" />
                              <button onClick={() => removeEnvelopePoint(i)} className="text-muted-foreground hover:text-destructive transition p-1"><Trash2 size={12}/></button>
                           </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={addEnvelopePoint} className="w-full h-7 text-[10px] gap-1 mt-2 text-muted-foreground hover:bg-muted/50 border border-dashed"><Plus size={10}/> Add Point</Button>
                     </div>
                  </div>
                </div>

              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default WBCalculator;
