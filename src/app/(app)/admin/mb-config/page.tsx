
'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot, Cell } from 'recharts';
import { doc, setDoc, collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Plus, Trash2, RotateCcw, Maximize, Fuel, AlertTriangle, Plane } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Aircraft } from '../../assets/page';

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];
const FUEL_WEIGHT_PER_GALLON = 6;

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

// --- HELPER 2: Visual Warning Component ---
const OffScreenWarning = ({ direction, value, label }: { direction: string, value: number, label: string }) => (
  <div className={`absolute top-1/2 ${direction === 'left' ? 'left-4' : 'right-4'} transform -translate-y-1/2 bg-red-900/90 border border-red-500 text-white p-3 rounded shadow-xl z-10 flex flex-col items-center animate-pulse`}>
    <AlertTriangle className="text-red-400 mb-1" size={24} />
    <span className="font-bold text-xs uppercase">{label} Off Scale!</span>
    <span className="text-lg font-mono">{value}</span>
    <span className="text-xs text-gray-300">
      {direction === 'left' ? '← Move Left' : 'Move Right →'}
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

  // 1. STATE: Graph Config
  const [graphConfig, setGraphConfig] = useState({
    modelName: "Piper PA-28-180",
    xMin: 80, xMax: 94,
    yMin: 1400, yMax: 2600,
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
    { id: 3, name: "Fuel", weight: 288, arm: 95.0, type: 'fuel', gallons: 48, maxGallons: 50 },
    { id: 4, name: "Rear Pax", weight: 0, arm: 118.1, type: 'standard' },
    { id: 5, name: "Baggage", weight: 0, arm: 142.8, type: 'standard' },
  ]);

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });
  const [isSaveAircraftDialogOpen, setIsSaveAircraftDialogOpen] = useState(false);

  // 4. LOGIC
  useEffect(() => {
    let totalMom = parseFloat(basicEmpty.moment as any) || 0;
    let totalWt = parseFloat(basicEmpty.weight as any) || 0;

    stations.forEach(st => {
      const wt = parseFloat(st.weight) || 0;
      const arm = parseFloat(st.arm) || 0;
      totalWt += wt;
      totalMom += (wt * arm);
    });

    const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
    const safe = graphConfig.envelope.length > 2
        ? isPointInPolygon({ x: cg, y: totalWt }, graphConfig.envelope)
        : false;

    setResults({
      cg: parseFloat(cg.toFixed(2)),
      weight: parseFloat(totalWt.toFixed(1)),
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
      if (field === 'gallons') return { ...s, gallons: val, weight: val * FUEL_WEIGHT_PER_GALLON };
      if (field === 'weight') return { ...s, weight: val, gallons: parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
      return { ...s, [field]: val };
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
        weight: type === 'fuel' ? 0 : "",
        arm: "",
        type: type,
        ...(type === 'fuel' ? { gallons: 0, maxGallons: 50 } : {})
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
        xMin: 80, xMax: 94, yMin: 1400, yMax: 2600,
        envelope: [{ x: 82, y: 1400 }, { x: 82, y: 1950 }, { x: 86.5, y: 2450 }, { x: 93, y: 2450 }, { x: 93, y: 1400 }, { x: 82, y: 1400 }]
      });
      setBasicEmpty({ weight: 1416, moment: 120360, arm: 85.0 });
      setStations([
        { id: 2, name: "Pilot & Front Pax", weight: 340, arm: 85.5, type: 'standard' },
        { id: 3, name: "Fuel", weight: 288, arm: 95.0, type: 'fuel', gallons: 48, maxGallons: 50 }
      ]);
    }
  };

  const saveAsTemplate = async () => {
    if (!firestore) {
        alert("Firestore not initialized.");
        return;
    }
    try {
        await setDoc(doc(firestore, "tenants/safeviate/massAndBalance", graphConfig.modelName), {
            graphConfig,
            stations
        });
        toast({ title: 'Template Saved', description: `M&B Template "${graphConfig.modelName}" has been saved.` });
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the template.' });
    }
  };
  
  const handleSaveToAircraft = (aircraftId: string) => {
    if (!firestore) return;
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    
    // Construct the M&B data to save based on the current state of the calculator
    const mbDataToSave = {
        emptyWeight: basicEmpty.weight,
        emptyWeightMoment: basicEmpty.moment,
        maxTakeoffWeight: graphConfig.yMax, // Simplified assumption
        maxLandingWeight: graphConfig.yMax, // Simplified assumption
        cgEnvelope: graphConfig.envelope.map(p => ({ weight: p.y, cg: p.x })),
        stationArms: stations.reduce((acc, st) => {
            const key = st.name.toLowerCase().replace(/ & /g, '').replace(/ /g, '');
            acc[key] = st.arm;
            return acc;
        }, {}),
    };

    updateDocumentNonBlocking(aircraftRef, mbDataToSave);
    
    toast({
        title: 'Saved to Aircraft',
        description: `M&B profile has been saved to the selected aircraft.`
    });
    
    setIsSaveAircraftDialogOpen(false);
  }

  // SAFETY DOMAIN
  const allX = [...graphConfig.envelope.map(p => p.x), results.cg].filter(n => !isNaN(n));
  const allY = [...graphConfig.envelope.map(p => p.y), results.weight].filter(n => !isNaN(n));
  const paddingX = 0.5; const paddingY = 50;
  const finalXMin = Math.min(Number(graphConfig.xMin), Math.min(...allX) - paddingX);
  const finalXMax = Math.max(Number(graphConfig.xMax), Math.max(...allX) + paddingX);
  const finalYMin = Math.min(Number(graphConfig.yMin), Math.min(...allY) - paddingY);
  const finalYMax = Math.max(Number(graphConfig.yMax), Math.max(...allY) + paddingY);
  const xAxisTicks = generateNiceTicks(finalXMin, finalXMax, 8);
  const yAxisTicks = generateNiceTicks(finalYMin, finalYMax, 8);
  const isOffScreen = () => { if (results.cg < finalXMin) return { axis: 'x', dir: 'left', val: results.cg }; return null; };
  const offScreenStatus = isOffScreen();

  return (
    <div className="min-h-screen bg-background text-foreground p-6 font-sans">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">W&B Configurator</h1>
        <div className="flex gap-3">
          <Button onClick={handleReset} variant="destructive" className="flex items-center gap-2 transition"><RotateCcw size={16} /> Reset</Button>
          <Button onClick={saveAsTemplate} variant="outline" className="flex items-center gap-2 transition"><Save size={16} /> Save as Template</Button>
           <Dialog open={isSaveAircraftDialogOpen} onOpenChange={setIsSaveAircraftDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition shadow-lg"><Plane size={16} /> Save to Aircraft</Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Save Configuration to Aircraft</DialogTitle>
                      <DialogDescription>
                          Select an aircraft to apply this Mass & Balance configuration. This will overwrite the aircraft's existing M&B data.
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: CONTROLS */}
        <div className="lg:col-span-5 space-y-6 h-[85vh] overflow-y-auto pr-2 custom-scrollbar">

          {/* 1. BASIC EMPTY WEIGHT */}
          <div className="bg-card p-5 rounded-xl border border-border shadow-xl">
             <h3 className="text-primary font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                1. Basic Empty Weight
             </h3>
             <div className="grid grid-cols-3 gap-3">
                <div className="group">
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block group-focus-within:text-primary">Weight</label>
                    <Input type="number" value={basicEmpty.weight} onChange={(e) => handleBasicEmptyChange('weight', e.target.value)}
                        className="w-full text-right" />
                </div>
                <div className="group">
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block group-focus-within:text-primary">Arm</label>
                    <Input type="number" value={basicEmpty.arm} onChange={(e) => handleBasicEmptyChange('arm', e.target.value)}
                        className="w-full text-right" />
                </div>
                <div className="group">
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block group-focus-within:text-primary">Moment</label>
                    <Input type="number" value={basicEmpty.moment} onChange={(e) => handleBasicEmptyChange('moment', e.target.value)}
                        className="w-full text-right" />
                </div>
             </div>
          </div>

          {/* 2. LOADING STATIONS */}
          <div className="bg-card p-5 rounded-xl border border-border shadow-xl">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 2. Loading Stations
              </h3>
              <div className="flex gap-2">
                <button onClick={clearStations} className="text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive px-2 py-1 rounded border border-destructive/30 transition" title="Clear all"><Trash2 size={12}/></button>
                <button onClick={() => addStation('fuel')} className="text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded border border-yellow-500/30 flex items-center gap-1 transition" title="Add Fuel Tank"><Fuel size={12}/> Fuel</button>
                <button onClick={() => addStation('standard')} className="text-xs bg-muted hover:bg-muted/80 px-3 py-1 rounded border border-border flex items-center gap-1 transition text-foreground"><Plus size={12}/> Add</button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 text-[9px] uppercase text-muted-foreground font-bold px-1 mb-2 tracking-wider">
               <div className="col-span-5">Station</div>
               <div className="col-span-3 text-right">Weight</div>
               <div className="col-span-3 text-right">Arm</div>
               <div className="col-span-1"></div>
            </div>

            <div className="space-y-1">
              {stations.map((s) => (
                <div key={s.id} className="group relative border-b border-border last:border-0 pb-2 mb-1">

                  {s.type === 'fuel' ? (
                     // FUEL ROW
                     <div className="pt-1">
                        <div className="grid grid-cols-12 gap-2 items-center mb-1">
                            <div className="col-span-5 flex items-center gap-2">
                                <Fuel size={12} className="text-yellow-500"/>
                                <Input value={s.name} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="bg-transparent text-sm font-bold text-secondary-foreground focus:text-foreground border-b border-transparent focus:border-primary outline-none w-full mr-2 placeholder-gray-600" />
                                <div className="flex items-center bg-muted border border-border rounded px-2 py-0.5 ml-auto shrink-0 shadow-inner">
                                   <Input type="number" value={s.gallons || 0} onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)}
                                      className="w-10 bg-transparent text-sm font-bold text-right text-yellow-600 outline-none p-0 h-auto" />
                                   <span className="text-[10px] text-muted-foreground ml-1 font-semibold">gal</span>
                                </div>
                            </div>
                            <div className="col-span-3">
                                <Input type="number" value={s.weight} onChange={(e) => handleFuelChange(s.id, 'weight', e.target.value)} className="w-full p-1 text-sm text-right" />
                            </div>
                            <div className="col-span-3">
                                <Input type="number" value={s.arm} onChange={(e) => handleFuelChange(s.id, 'arm', e.target.value)} className="w-full p-1 text-sm text-right" />
                            </div>
                             <div className="col-span-1 flex justify-end">
                                <button onClick={() => removeStation(s.id)} className="text-muted-foreground hover:text-destructive transition"><Trash2 size={12}/></button>
                            </div>
                        </div>
                        <input type="range" min="0" max={s.maxGallons || 50} value={s.gallons || 0}
                                onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)}
                                className="w-full h-1 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-yellow-500 block" />
                     </div>
                  ) : (
                    // STANDARD ROW
                    <div className="grid grid-cols-12 gap-2 items-center py-1">
                        <div className="col-span-5">
                            <Input value={s.name} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="bg-transparent text-sm font-medium text-secondary-foreground focus:text-foreground border-none outline-none w-full placeholder-gray-600 h-auto p-1" placeholder="Item Name" />
                        </div>
                        <div className="col-span-3">
                            <Input type="number" value={s.weight} onChange={(e) => updateStation(s.id, 'weight', e.target.value)} className="w-full p-1 text-sm text-right" />
                        </div>
                        <div className="col-span-3">
                             <Input type="number" value={s.arm} onChange={(e) => updateStation(s.id, 'arm', e.target.value)} className="w-full p-1 text-sm text-right" />
                        </div>
                        <div className="col-span-1 flex justify-end">
                            <button onClick={() => removeStation(s.id)} className="text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. CONFIG CARD */}
          <div className="bg-card p-5 rounded-xl border border-border shadow-xl">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 3. Chart Config
               </h3>
               <button onClick={handleAutoFit} className="flex items-center gap-1 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30 transition uppercase font-bold tracking-wide">
                  <Maximize size={10}/> Auto-Fit
               </button>
            </div>
             <div className="grid grid-cols-2 gap-3 mb-4">
              <div><label className="text-[9px] text-muted-foreground uppercase">Min CG</label><Input type="number" value={graphConfig.xMin} onChange={(e) => setGraphConfig({...graphConfig, xMin: Number(e.target.value)})} className="w-full p-1.5 text-xs" /></div>
              <div><label className="text-[9px] text-muted-foreground uppercase">Max CG</label><Input type="number" value={graphConfig.xMax} onChange={(e) => setGraphConfig({...graphConfig, xMax: Number(e.target.value)})} className="w-full p-1.5 text-xs" /></div>
              <div><label className="text-[9px] text-muted-foreground uppercase">Min Weight</label><Input type="number" value={graphConfig.yMin} onChange={(e) => setGraphConfig({...graphConfig, yMin: Number(e.target.value)})} className="w-full p-1.5 text-xs" /></div>
              <div><label className="text-[9px] text-muted-foreground uppercase">Max Weight</label><Input type="number" value={graphConfig.yMax} onChange={(e) => setGraphConfig({...graphConfig, yMax: Number(e.target.value)})} className="w-full p-1.5 text-xs" /></div>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
               {graphConfig.envelope.map((pt, i) => (
                  <div key={i} className="flex gap-1 items-center">
                     <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-black font-bold" style={{ backgroundColor: POINT_COLORS[i % POINT_COLORS.length] }}>{i + 1}</div>
                     <Input type="number" value={pt.x} onChange={(e) => updateEnvelopePoint(i, 'x', e.target.value)} className="w-full p-1 text-xs text-center rounded-sm" />
                     <Input type="number" value={pt.y} onChange={(e) => updateEnvelopePoint(i, 'y', e.target.value)} className="w-full p-1 text-xs text-center rounded-sm" />
                  </div>
               ))}
               <button onClick={addEnvelopePoint} className="w-full py-1.5 text-xs bg-muted hover:bg-muted/80 rounded mt-2 border border-border transition text-muted-foreground"><Plus size={12} className="inline mr-1"/> Add Point</button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: GRAPH */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-card border border-border rounded-xl p-4 shadow-2xl relative min-h-[600px] flex flex-col justify-center items-center overflow-hidden">

             {offScreenStatus && (
               <OffScreenWarning direction={offScreenStatus.dir} value={offScreenStatus.val} label={offScreenStatus.axis === 'x' ? 'CG' : 'Weight'} />
             )}

             <ResponsiveContainer width="100%" height={600}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[finalXMin, finalXMax]} ticks={xAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} dy={10}>
                    <Label value="CG (inches)" offset={0} position="insideBottom" fill="hsl(var(--muted-foreground))" dy={10} />
                  </XAxis>
                  <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[finalYMin, finalYMax]} ticks={yAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}}>
                    <Label value="Gross Weight (lbs)" angle={-90} position="insideLeft" fill="hsl(var(--muted-foreground))" />
                  </YAxis>
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
              
              <p className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-red-600 font-extrabold text-sm md:text-base uppercase tracking-widest pointer-events-none whitespace-nowrap drop-shadow-md">
                CONSULT AIRCRAFT POH BEFORE FLIGHT
              </p>

              <div className={cn("absolute bottom-4 right-4 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2", results.isSafe ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white')}>
                <div className={cn("w-2 h-2 rounded-full", results.isSafe ? 'bg-white' : 'bg-white animate-pulse')}></div>
                {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS"}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WBCalculator;

    