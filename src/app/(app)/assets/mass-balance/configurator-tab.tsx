
'use client';

import React, { useState, useEffect } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label as RechartsLabel,
  ReferenceDot,
  Cell,
} from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Plus, Trash2, RotateCcw, Maximize, Fuel, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];

// --- HELPER 1: Generate "Nice" Ticks ---
const generateNiceTicks = (min: number, max: number, stepCount = 6) => {
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
const OffScreenWarning = ({ direction, value, label }: { direction: string; value: number; label: string; }) => (
    <div className={`absolute top-1/2 ${direction === 'left' ? 'left-4' : 'right-4'} transform -translate-y-1/2 bg-destructive/90 border border-red-500 text-white p-3 rounded shadow-xl z-10 flex flex-col items-center animate-pulse`}>
      <AlertTriangle className="text-red-400 mb-1" size={24} />
      <span className="font-bold text-xs uppercase">{label} Off Scale!</span>
      <span className="text-lg font-mono">{value}</span>
      <span className="text-xs text-muted-foreground">
        {direction === 'left' ? '← Move Left' : 'Move Right →'}
      </span>
    </div>
  );

const ConfiguratorTab = () => {
    const { toast } = useToast();
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
  const [stations, setStations] = useState([
    { id: 2, name: "Pilot & Front Pax", weight: 340, arm: 85.5, type: 'standard', gallons: 0, maxGallons: 0 },
    { id: 3, name: "Fuel", weight: 288, arm: 95.0, type: 'fuel', gallons: 48, maxGallons: 50 },
    { id: 4, name: "Rear Pax", weight: 0, arm: 118.1, type: 'standard', gallons: 0, maxGallons: 0 },
    { id: 5, name: "Baggage", weight: 0, arm: 142.8, type: 'standard', gallons: 0, maxGallons: 0 },
  ]);

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

  // 4. LOGIC
  useEffect(() => {
    let totalMom = parseFloat(basicEmpty.moment as any) || 0;
    let totalWt = parseFloat(basicEmpty.weight as any) || 0;

    stations.forEach(st => {
      const wt = parseFloat(st.weight as any) || 0;
      const arm = parseFloat(st.arm as any) || 0;
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
  const handleBasicEmptyChange = (field: 'weight' | 'moment' | 'arm', value: string) => {
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

  const handleFuelChange = (id: number, field: 'gallons' | 'weight' | 'arm', value: string) => {
    const val = parseFloat(value) || 0;
    setStations(stations.map(s => {
      if (s.id !== id) return s;
      if (field === 'gallons') return { ...s, gallons: val, weight: val * FUEL_WEIGHT_PER_GALLON };
      if (field === 'weight') return { ...s, weight: val, gallons: parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
      return { ...s, [field]: val };
    }));
  };

  const handleAutoFit = () => {
    if (graphConfig.envelope.length < 2) return toast({title: "Add points first!", variant: 'destructive'});
    const xValues = graphConfig.envelope.map(p => p.x);
    const minX = Math.floor(Math.min(...xValues) - 1); 
    const maxX = Math.ceil(Math.max(...xValues) + 1);
    setGraphConfig(prevConfig => ({ ...prevConfig, xMin: minX, xMax: maxX }));
  };

  const updateStation = (id: number, field: string, val: string) => setStations(stations.map(s => s.id === id ? { ...s, [field]: val } : s));
  const addStation = () => setStations([...stations, { id: Date.now(), name: "New Item", weight: 0, arm: 0, type: 'standard', gallons: 0, maxGallons: 0 }]);
  const removeStation = (id: number) => setStations(stations.filter(s => s.id !== id));
  
  const updateEnvelopePoint = (index: number, field: 'x' | 'y', val: string) => {
    const newEnv = [...graphConfig.envelope];
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
        { id: 2, name: "Pilot & Front Pax", weight: 340, arm: 85.5, type: 'standard', gallons: 0, maxGallons: 0 },
        { id: 3, name: "Fuel", weight: 288, arm: 95.0, type: 'fuel', gallons: 48, maxGallons: 50 },
      ]);
    }
  };

  const clearStations = () => {
    if (window.confirm("Clear all loading stations?")) {
      setStations([]);
    }
  };

  const saveToFirebase = async () => { 
    toast({ title: "Save to Firebase not implemented yet" });
  };

  // DYNAMIC SAFETY DOMAIN CALCULATION
  const allX = [...graphConfig.envelope.map(p => p.x), results.cg].filter(n => !isNaN(n));
  const allY = [...graphConfig.envelope.map(p => p.y), results.weight].filter(n => !isNaN(n));

  const paddingX = 0.5; 
  const paddingY = 50;  

  const finalXMin = Math.min(Number(graphConfig.xMin), Math.min(...allX) - paddingX);
  const finalXMax = Math.max(Number(graphConfig.xMax), Math.max(...allX) + paddingX);
  const finalYMin = Math.min(Number(graphConfig.yMin), Math.min(...allY) - paddingY);
  const finalYMax = Math.max(Number(graphConfig.yMax), Math.max(...allY) + paddingY);

  const xAxisTicks = generateNiceTicks(finalXMin, finalXMax, 8);
  const yAxisTicks = generateNiceTicks(finalYMin, finalYMax, 8);
  
  const isOffScreen = () => {
      if (results.cg < finalXMin) return { axis: 'x', dir: 'left', val: results.cg };
      return null; 
  };
  const offScreenStatus = isOffScreen();

  return (
    <div className="p-6">
      
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">W&B Configurator</h1>
        <div className="flex gap-3">
          <Button onClick={handleReset} variant="destructive"><RotateCcw size={16} /> Reset</Button>
          <Button onClick={saveToFirebase}><Save size={16} /> Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-5 space-y-6 h-[85vh] overflow-y-auto pr-2">
          
          <Card>
             <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span> 
                    1. Basic Empty Weight
                </CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-3 gap-3">
                <div className="group space-y-1">
                    <Label htmlFor="bew-weight" className="text-xs">Weight</Label>
                    <Input id="bew-weight" type="number" value={basicEmpty.weight} onChange={(e) => handleBasicEmptyChange('weight', e.target.value)} 
                        className="font-mono text-right" />
                </div>
                <div className="group space-y-1">
                    <Label htmlFor="bew-arm" className="text-xs">Arm</Label>
                    <Input id="bew-arm" type="number" value={basicEmpty.arm} onChange={(e) => handleBasicEmptyChange('arm', e.target.value)} 
                        className="font-mono text-right" />
                </div>
                <div className="group space-y-1">
                    <Label htmlFor="bew-moment" className="text-xs">Moment</Label>
                    <Input id="bew-moment" type="number" value={basicEmpty.moment} onChange={(e) => handleBasicEmptyChange('moment', e.target.value)} 
                        className="font-mono text-right" />
                </div>
             </CardContent>
          </Card>

          <Card>
             <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 2. Loading Stations
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={clearStations} variant="destructive" size="icon" className='h-8 w-8' title="Clear all"><Trash2 size={12}/></Button>
                <Button onClick={addStation} variant="secondary" size="sm"><Plus size={12}/> Add</Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {stations.map((s) => (
                <div key={s.id} className="bg-muted/30 p-3 rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <Input value={s.name} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="bg-transparent text-sm font-bold border-b border-border focus:border-primary w-full mr-2" placeholder="Station Name" />
                    <Button onClick={() => removeStation(s.id)} variant="ghost" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"><Trash2 size={14}/></Button>
                  </div>

                  {s.type === 'fuel' ? (
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-background p-1 rounded-full border">
                            <Fuel size={14} className="text-yellow-500 ml-1"/>
                            <input type="range" min="0" max={s.maxGallons || 50} value={s.gallons || 0} 
                                onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-yellow-500 mr-1" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-[9px] uppercase tracking-wider">Gallons</Label><Input type="number" value={s.gallons || 0} onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)} className="text-xs text-right text-yellow-400" /></div>
                            <div><Label className="text-[9px] uppercase tracking-wider">Weight</Label><Input type="number" value={s.weight} onChange={(e) => handleFuelChange(s.id, 'weight', e.target.value)} className="text-xs text-right" /></div>
                            <div><Label className="text-[9px] uppercase tracking-wider">Arm</Label><Input type="number" value={s.arm} onChange={(e) => handleFuelChange(s.id, 'arm', e.target.value)} className="text-xs text-right" /></div>
                        </div>
                     </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-[9px] uppercase tracking-wider">Weight</Label><Input type="number" value={s.weight} onChange={(e) => updateStation(s.id, 'weight', e.target.value)} className="text-xs text-right" /></div>
                        <div><Label className="text-[9px] uppercase tracking-wider">Arm</Label><Input type="number" value={s.arm} onChange={(e) => updateStation(s.id, 'arm', e.target.value)} className="text-xs text-right" /></div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
               <CardTitle className="text-lg flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 3. Chart Config
               </CardTitle>
               <Button onClick={handleAutoFit} variant="outline" size="sm" className="text-xs">
                  <Maximize size={10} className="mr-1"/> Auto-Fit
               </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div><Label className="text-xs">Min CG</Label><Input type="number" value={graphConfig.xMin} onChange={(e) => setGraphConfig({...graphConfig, xMin: Number(e.target.value)})} className="text-xs" /></div>
                <div><Label className="text-xs">Max CG</Label><Input type="number" value={graphConfig.xMax} onChange={(e) => setGraphConfig({...graphConfig, xMax: Number(e.target.value)})} className="text-xs" /></div>
                <div><Label className="text-xs">Min Weight</Label><Input type="number" value={graphConfig.yMin} onChange={(e) => setGraphConfig({...graphConfig, yMin: Number(e.target.value)})} className="text-xs" /></div>
                <div><Label className="text-xs">Max Weight</Label><Input type="number" value={graphConfig.yMax} onChange={(e) => setGraphConfig({...graphConfig, yMax: Number(e.target.value)})} className="text-xs" /></div>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {graphConfig.envelope.map((pt, i) => (
                    <div key={i} className="flex gap-1 items-center">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-black font-bold" style={{ backgroundColor: POINT_COLORS[i % POINT_COLORS.length] }}>{i + 1}</div>
                        <Input type="number" value={pt.x} onChange={(e) => updateEnvelopePoint(i, 'x', e.target.value)} className="h-8 text-xs text-center" />
                        <Input type="number" value={pt.y} onChange={(e) => updateEnvelopePoint(i, 'y', e.target.value)} className="h-8 text-xs text-center" />
                    </div>
                ))}
                <Button onClick={addEnvelopePoint} variant="secondary" className="w-full h-8 text-xs mt-2"><Plus size={12} className="mr-1"/> Add Point</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <Card className="p-4 relative min-h-[600px] flex flex-col justify-center items-center overflow-hidden">
             
             <ResponsiveContainer width="100%" height={600}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[finalXMin, finalXMax]} ticks={xAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))', fontSize: '0.75rem'}} dy={10}>
                    <RechartsLabel value="CG (inches)" offset={0} position="insideBottom" fill="hsl(var(--muted-foreground))" dy={10} />
                  </XAxis>
                  <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[finalYMin, finalYMax]} ticks={yAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))', fontSize: '0.75rem'}}>
                    <RechartsLabel value="Gross Weight (lbs)" angle={-90} position="insideLeft" fill="hsl(var(--muted-foreground))" />
                  </YAxis>
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}/>
                  <Scatter name="Envelope Line" data={graphConfig.envelope} fill="transparent" line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} isAnimationActive={false} />
                  <Scatter name="Envelope Points" data={graphConfig.envelope} isAnimationActive={false}>
                    {graphConfig.envelope.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={POINT_COLORS[index % POINT_COLORS.length]} stroke="hsl(var(--primary-foreground))" strokeWidth={1}/>
                    ))}
                  </Scatter>
                  <Scatter name="Current Load" data={[{ x: results.cg, y: results.weight }]} fill={results.isSafe ? "hsl(var(--primary))" : "hsl(var(--destructive))"} isAnimationActive={false}>
                      <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stroke="hsl(var(--primary-foreground))" strokeWidth={2} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              
              <p className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-destructive font-bold text-xs md:text-sm uppercase tracking-widest pointer-events-none opacity-80">
                Please consult aircraft POH before flight
              </p>

              <div className={`absolute bottom-4 right-4 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 ${results.isSafe ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
                <div className={`w-2 h-2 rounded-full ${results.isSafe ? 'bg-white' : 'bg-white animate-pulse'}`}></div>
                {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS"}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WBCalculator;
