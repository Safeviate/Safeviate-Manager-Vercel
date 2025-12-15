
'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label as RechartsLabel, ReferenceDot, Cell } from 'recharts';
import { collection } from "firebase/firestore";
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Plus, Trash2, RotateCcw, Maximize, Fuel, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';

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
  
  if (ticks[ticks.length - 1] < end && (end - ticks[ticks.length - 1]) < step * 0.1) {
    ticks.push(end);
  }
  
  return ticks;
};

const OffScreenWarning = ({ direction, value, label }: { direction: string, value: number, label: string }) => (
  <div className={`absolute top-1/2 ${direction === 'left' ? 'left-4' : 'right-4'} transform -translate-y-1/2 bg-destructive/90 border border-red-500 text-white p-3 rounded shadow-xl z-10 flex flex-col items-center animate-pulse`}>
    <AlertTriangle className="text-red-400 mb-1" size={24} />
    <span className="font-bold text-xs uppercase">{label} Off Scale!</span>
    <span className="text-lg font-mono">{value}</span>
    <span className="text-xs text-muted-foreground">
      {direction === 'left' ? '← Move Left' : 'Move Right →'}
    </span>
  </div>
);

export function ConfiguratorTab() {
  const firestore = useFirestore();
  const { toast } = useToast();

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

  const [basicEmpty, setBasicEmpty] = useState({
    weight: 1416,
    moment: 120360, 
    arm: 85.0       
  });

  const [stations, setStations] = useState<any[]>([
    { id: 2, name: "Pilot & Front Pax", weight: 340, arm: 85.5, type: 'standard' },
    { id: 3, name: "Fuel", weight: 288, arm: 95.0, type: 'fuel', gallons: 48, maxGallons: 50 },
    { id: 4, name: "Rear Pax", weight: 0, arm: 118.1, type: 'standard' },
    { id: 5, name: "Baggage", weight: 0, arm: 142.8, type: 'standard' },
  ]);

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

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
    if (graphConfig.envelope.length < 2) return toast({ variant: 'destructive', title: "Add points first!"});
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

  const removeStation = (id: number) => setStations(stations.filter(s => s.id !== id));
  
  const updateEnvelopePoint = (index: number, field: string, val: string) => {
    const newEnv = [...graphConfig.envelope];
    // @ts-ignore
    newEnv[index][field] = Number(val);
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

  const clearStations = () => {
    if (window.confirm("Clear all loading stations?")) {
      setStations([]);
    }
  };

  const saveToFirebase = () => {
    if (!firestore || !graphConfig.modelName) return toast({ variant: 'destructive', title: "Model Name Required" });

    const [make, ...modelParts] = graphConfig.modelName.split(' ');
    const model = modelParts.join(' ');
    
    const profileData = {
        make,
        model,
        xMin: graphConfig.xMin,
        xMax: graphConfig.xMax,
        yMin: graphConfig.yMin,
        yMax: graphConfig.yMax,
        cgEnvelope: graphConfig.envelope,
        stations: [
            { id: 1, name: 'Basic Empty Weight', weight: basicEmpty.weight, arm: basicEmpty.arm },
            ...stations
        ]
    };
    
    const collectionRef = collection(firestore, 'tenants', 'safeviate', 'aircraftModelProfiles');
    addDocumentNonBlocking(collectionRef, profileData);
    toast({ title: 'Profile Saved', description: `The profile "${graphConfig.modelName}" is being saved.`});
  };

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">W&amp;B Configurator</h1>
        <div className="flex gap-3">
          <Button onClick={handleReset} variant="destructive">
            <RotateCcw size={16} className='mr-2' /> Reset
          </Button>
          <Button onClick={saveToFirebase}>
            <Save size={16} className='mr-2' /> Save Template
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="relative min-h-[600px] flex flex-col justify-center items-center overflow-hidden pt-6">
            {offScreenStatus && <OffScreenWarning direction={offScreenStatus.dir} value={offScreenStatus.val} label={offScreenStatus.axis === 'x' ? 'CG' : 'Weight'} />}
            <ResponsiveContainer width="100%" height={600}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[finalXMin, finalXMax]} ticks={xAxisTicks} allowDataOverflow={true} dy={10}>
                    <RechartsLabel value="CG (inches)" offset={0} position="insideBottom" />
                </XAxis>
                <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[finalYMin, finalYMax]} ticks={yAxisTicks} allowDataOverflow={true}>
                    <RechartsLabel value="Gross Weight (lbs)" angle={-90} position="insideLeft" />
                </YAxis>
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Envelope Line" data={graphConfig.envelope} fill="transparent" line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} isAnimationActive={false} />
                <Scatter name="Envelope Points" data={graphConfig.envelope} isAnimationActive={false}>
                    {graphConfig.envelope.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={POINT_COLORS[index % POINT_COLORS.length]} stroke="hsl(var(--primary-foreground))" strokeWidth={1}/>
                    ))}
                </Scatter>
                <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stroke="hsl(var(--primary-foreground))" strokeWidth={2} />
                </ScatterChart>
            </ResponsiveContainer>
             <p className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-red-600 font-extrabold text-sm md:text-base uppercase tracking-widest pointer-events-none whitespace-nowrap drop-shadow-md">
                CONSULT AIRCRAFT POH BEFORE FLIGHT
              </p>
            <div className={cn("absolute bottom-4 right-4 px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-2", results.isSafe ? 'bg-green-600/90 text-white' : 'bg-destructive text-white')}>
                <div className={cn("w-2 h-2 rounded-full", results.isSafe ? 'bg-white' : 'bg-white animate-pulse')}></div>
                <span className="text-xs">{results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS"}</span>
            </div>
        </CardContent>

        <Separator />
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              {/* --- LEFT COLUMN --- */}
              <div className="space-y-6">
                {/* Basic Empty Weight */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Basic Empty Weight</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="bew-weight">Weight</Label>
                            <Input id="bew-weight" type="number" value={basicEmpty.weight} onChange={(e) => handleBasicEmptyChange('weight', e.target.value)} />
                        </div>
                            <div className="space-y-1">
                            <Label htmlFor="bew-arm">Arm</Label>
                            <Input id="bew-arm" type="number" value={basicEmpty.arm} onChange={(e) => handleBasicEmptyChange('arm', e.target.value)} />
                        </div>
                            <div className="space-y-1">
                            <Label htmlFor="bew-moment">Moment</Label>
                            <Input id="bew-moment" type="number" value={basicEmpty.moment} onChange={(e) => handleBasicEmptyChange('moment', e.target.value)} />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Loading Stations */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Loading Stations</h3>
                            <div className="flex gap-2">
                            <Button onClick={clearStations} variant="destructive" size="icon" title="Clear all"><Trash2 size={16}/></Button>
                            <Button onClick={() => addStation('fuel')} variant="outline" size="sm" title="Add Fuel Tank"><Fuel size={16} className='mr-2'/> Fuel</Button>
                            <Button onClick={() => addStation('standard')} variant="outline" size="sm"><Plus size={16} className='mr-2'/> Add</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-bold px-1 mb-2 tracking-wider">
                        <div className="col-span-5">Station</div>
                        <div className="col-span-3 text-right">Weight</div>
                        <div className="col-span-3 text-right">Arm</div>
                    </div>
                    <div className="space-y-2">
                    {stations.map((s) => (
                        <div key={s.id} className="group relative">
                        {s.type === 'fuel' ? (
                            <div className="p-2 border rounded-lg bg-secondary/20">
                                <div className="grid grid-cols-12 gap-2 items-center mb-2">
                                    <div className="col-span-5 flex items-center gap-2">
                                        <Fuel size={14} className="text-yellow-500"/>
                                        <Input value={s.name} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="text-sm font-bold h-8" />
                                        <Badge variant="outline" className="ml-auto shrink-0">{s.gallons || 0} gal</Badge>
                                    </div>
                                    <div className="col-span-3">
                                        <Input type="number" value={s.weight} onChange={(e) => handleFuelChange(s.id, 'weight', e.target.value)} className="text-sm text-right h-8" />
                                    </div>
                                    <div className="col-span-3">
                                        <Input type="number" value={s.arm} onChange={(e) => handleFuelChange(s.id, 'arm', e.target.value)} className="text-sm text-right h-8" />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <Button onClick={() => removeStation(s.id)} variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8"><Trash2 size={16}/></Button>
                                    </div>
                                </div>
                                <input type="range" min="0" max={s.maxGallons || 50} value={s.gallons || 0} 
                                        onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)}
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-yellow-500 block" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-12 gap-2 items-center py-1">
                                <div className="col-span-5">
                                    <Input value={s.name} onChange={(e) => updateStation(s.id, 'name', e.target.value)} placeholder="Item Name" className="h-8" />
                                </div>
                                <div className="col-span-3">
                                    <Input type="number" value={s.weight} onChange={(e) => updateStation(s.id, 'weight', e.target.value)} className="text-right h-8" />
                                </div>
                                <div className="col-span-3">
                                    <Input type="number" value={s.arm} onChange={(e) => updateStation(s.id, 'arm', e.target.value)} className="text-right h-8" />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button onClick={() => removeStation(s.id)} variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></Button>
                                </div>
                            </div>
                        )}
                        </div>
                    ))}
                    </div>
                </div>
              </div>

              {/* --- RIGHT COLUMN --- */}
              <div className="space-y-6">
                {/* Chart Configuration */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Chart Configuration</h3>
                        <Button onClick={handleAutoFit} variant="outline" size="sm"><Maximize size={16} className='mr-2'/> Auto-Fit</Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div><Label>Min CG</Label><Input type="number" value={graphConfig.xMin} onChange={(e) => setGraphConfig({...graphConfig, xMin: e.target.value as any})} /></div>
                        <div><Label>Max CG</Label><Input type="number" value={graphConfig.xMax} onChange={(e) => setGraphConfig({...graphConfig, xMax: e.target.value as any})} /></div>
                        <div><Label>Min Weight</Label><Input type="number" value={graphConfig.yMin} onChange={(e) => setGraphConfig({...graphConfig, yMin: e.target.value as any})} /></div>
                        <div><Label>Max Weight</Label><Input type="number" value={graphConfig.yMax} onChange={(e) => setGraphConfig({...graphConfig, yMax: e.target.value as any})} /></div>
                    </div>
                    <Label>Envelope Points</Label>
                    <div className="space-y-2 mt-2">
                        {graphConfig.envelope.map((pt, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: POINT_COLORS[i % POINT_COLORS.length] }}>{i + 1}</div>
                                <Input type="number" value={pt.x} onChange={(e) => updateEnvelopePoint(i, 'x', e.target.value)} placeholder="CG (X)" />
                                <Input type="number" value={pt.y} onChange={(e) => updateEnvelopePoint(i, 'y', e.target.value)} placeholder="Weight (Y)" />
                                <Button onClick={() => removeEnvelopePoint(i)} variant="ghost" size="icon"><Trash2 className="text-destructive"/></Button>
                            </div>
                        ))}
                    </div>
                    <Button onClick={addEnvelopePoint} variant="outline" className="w-full mt-2"><Plus size={16} className="mr-2"/> Add Point</Button>
                </div>
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguratorTab;
