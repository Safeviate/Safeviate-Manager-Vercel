
'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label as RechartsLabel, ReferenceDot, Cell } from 'recharts';
import { doc, setDoc } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Plus, Trash2, HelpCircle, X, RotateCcw, Maximize, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];

// --- HELPER: Visual Warning Component ---
const OffScreenWarning = ({ direction, value, label }: { direction: string, value: number, label: string }) => (
  <div className={`absolute top-1/2 ${direction === 'left' ? 'left-4' : 'right-4'} transform -translate-y-1/2 bg-destructive/90 border border-red-500 text-white p-3 rounded shadow-xl z-10 flex flex-col items-center animate-pulse`}>
    <AlertTriangle className="text-red-400 mb-1" size={24} />
    <span className="font-bold text-xs uppercase">{label} Off Scale!</span>
    <span className="text-lg font-mono">{value}</span>
    <span className="text-xs text-gray-300">
      {direction === 'left' ? '← Move Left' : 'Move Right →'}
    </span>
  </div>
);


const GuideModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Graph Tips</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="mb-4">If your graph looks "squashed", your Axis Limits (Min/Max) are likely too wide for the data.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};


const WBCalculator = () => {
  const firestore = useFirestore();
  const [showGuide, setShowGuide] = useState(false);
  
  const [graphConfig, setGraphConfig] = useState({
    modelName: "Piper PA-28-180",
    xMin: "80", xMax: "94",    
    yMin: "1400", yMax: "2600",    
    envelope: [
        { x: 82, y: 1400 },
        { x: 82, y: 1950 },
        { x: 86.5, y: 2450 },
        { x: 93, y: 2450 },
        { x: 93, y: 1400 },
        { x: 82, y: 1400 },
    ]           
  });

  const [stations, setStations] = useState([
    { id: 1, name: "Empty Weight", weight: "1416", arm: "85.0" },
    { id: 2, name: "Pilot & Front Pax", weight: "340", arm: "85.5" },
    { id: 3, name: "Fuel (48 gal)", weight: "288", arm: "95.0" },
    { id: 4, name: "Rear Pax", weight: "0", arm: "118.1" },
    { id: 5, name: "Baggage", weight: "0", arm: "142.8" },
  ]);

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

  useEffect(() => {
    let totalMom = 0;
    let totalWt = 0;
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
  }, [stations, graphConfig.envelope]);

  // --- UPDATED: AUTO-FIT (X-AXIS ONLY) ---
  // Adjusts the CG (X) to fit the green box, but KEEPS your Weight (Y) settings.
  const handleAutoFit = () => {
    if (graphConfig.envelope.length < 2) return alert("Add points first!");
    
    // 1. Get X values from the green polygon
    const xValues = graphConfig.envelope.map(p => p.x);
    
    // 2. Calculate ideal X limits (with a little padding)
    const minX = Math.floor(Math.min(...xValues) - 1); 
    const maxX = Math.ceil(Math.max(...xValues) + 1);

    // 3. Update State
    setGraphConfig(prevConfig => ({
        ...prevConfig,
        xMin: String(minX), 
        xMax: String(maxX)
        // We DO NOT update yMin/yMax here, so your manual entries stay put!
    }));
  };

  const updateStation = (id: number, field: 'name' | 'weight' | 'arm', val: string) => {
    setStations(stations.map(s => s.id === id ? { ...s, [field]: val } : s));
  };
  const addStation = () => setStations([...stations, { id: Date.now(), name: "New Item", weight: "", arm: "" }]);
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
            xMin: "80", xMax: "94", yMin: "1400", yMax: "2600",    
            envelope: [{ x: 82, y: 1400 }, { x: 82, y: 1950 }, { x: 86.5, y: 2450 }, { x: 93, y: 2450 }, { x: 93, y: 1400 }, { x: 82, y: 1400 }]
        });
        setStations([{ id: 1, name: "Empty Weight", weight: "1416", arm: "85.0" }]);
    }
  };
  
  const saveToFirebase = async () => {
    if (!firestore) return alert("Firestore not available");
    if (!graphConfig.modelName) return alert("Please enter a Model Name");
    try {
      await setDoc(doc(firestore, "aircraft_profiles", graphConfig.modelName), {
        graphConfig,
        defaultStations: stations
      });
      alert("Aircraft Profile Saved!");
    } catch (e) {
      console.error("Error saving: ", e);
    }
  };

  const isOffScreen = () => {
    if (results.cg < Number(graphConfig.xMin)) return { axis: 'x', dir: 'left', val: results.cg };
    if (results.cg > Number(graphConfig.xMax)) return { axis: 'x', dir: 'right', val: results.cg };
    if (results.weight < Number(graphConfig.yMin)) return { axis: 'y', dir: 'bottom', val: results.weight };
    if (results.weight > Number(graphConfig.yMax)) return { axis: 'y', dir: 'top', val: results.weight };
    return null;
  };

  const offScreenStatus = isOffScreen();

  return (
    <div className="p-6 font-sans space-y-6">
      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
      <div className="flex justify-between items-center pb-4">
        <h1 className="text-2xl font-bold">W&B Configurator</h1>
        <div className="flex gap-3">
          <Button onClick={handleReset} variant="destructive"><RotateCcw size={16} /> Reset</Button>
          <Button onClick={saveToFirebase}><Save size={16} /> Save Profile</Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {offScreenStatus && (
            <OffScreenWarning 
                direction={offScreenStatus.dir} 
                value={offScreenStatus.val} 
                label={offScreenStatus.axis === 'x' ? 'CG' : 'Weight'} 
            />
        )}
        <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="CG" 
              unit=" in" 
              domain={[Number(graphConfig.xMin), Number(graphConfig.xMax)]} 
              tickCount={7}
              allowDataOverflow={true}
              tick={{fill: 'hsl(var(--muted-foreground))'}} 
              stroke="hsl(var(--muted-foreground))"
            >
              <RechartsLabel value="CG (inches)" offset={-25} position="insideBottom" fill="hsl(var(--muted-foreground))" />
            </XAxis>
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Weight" 
              unit=" lbs" 
              domain={[Number(graphConfig.yMin), Number(graphConfig.yMax)]} 
              tickCount={8}
              allowDataOverflow={true}
              tick={{fill: 'hsl(var(--muted-foreground))'}} 
              stroke="hsl(var(--muted-foreground))"
            >
              <RechartsLabel value="Gross Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="hsl(var(--muted-foreground))" />
            </YAxis>
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
            <Scatter name="Envelope Line" data={graphConfig.envelope} fill="transparent" line={{ stroke: 'hsl(var(--chart-2))', strokeWidth: 2 }} shape={() => null} isAnimationActive={false} />
            <Scatter name="Envelope Points" data={graphConfig.envelope} isAnimationActive={false}>
              {graphConfig.envelope.map((entry, index) => <Cell key={`cell-${index}`} fill={POINT_COLORS[index % POINT_COLORS.length]} stroke="white" strokeWidth={1}/>)}
            </Scatter>
            <Scatter name="Current Load" data={[{ x: results.cg, y: results.weight }]} isAnimationActive={false}>
                <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} stroke="white" strokeWidth={2} />
            </Scatter>
        </ScatterChart>
        </ResponsiveContainer>
        <div className={`mt-4 px-4 py-2 rounded-full text-sm font-bold ${results.isSafe ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS"}
        </div>
      </Card>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
              <CardHeader className='flex-row items-center justify-between'>
                <CardTitle>1. Chart Axes Limits</CardTitle>
                <Button onClick={handleAutoFit} size="sm" variant="outline"><Maximize size={16}/> Auto-Fit</Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                  <div><Label>Min CG</Label><Input type="number" value={graphConfig.xMin} onChange={(e) => setGraphConfig({...graphConfig, xMin: e.target.value})} /></div>
                  <div><Label>Max CG</Label><Input type="number" value={graphConfig.xMax} onChange={(e) => setGraphConfig({...graphConfig, xMax: e.target.value})} /></div>
                  <div><Label>Min Weight</Label><Input type="number" value={graphConfig.yMin} onChange={(e) => setGraphConfig({...graphConfig, yMin: e.target.value})} /></div>
                  <div><Label>Max Weight</Label><Input type="number" value={graphConfig.yMax} onChange={(e) => setGraphConfig({...graphConfig, yMax: e.target.value})} /></div>
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <div className="flex justify-between items-center">
                  <CardTitle>2. Envelope Points</CardTitle>
                  <Button variant="outline" size="sm" onClick={addEnvelopePoint}><Plus size={12}/> Add Point</Button>
                  </div>
              </CardHeader>
              <CardContent>
                  {graphConfig.envelope.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">No points defined.</p></div>
                  ) : (
                  <ScrollArea className="h-40 pr-3">
                    <div className="space-y-2">
                        {graphConfig.envelope.map((pt, i) => (
                        <div key={i} className="flex gap-2 items-center group bg-muted/30 p-1 rounded">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-background shrink-0" style={{ backgroundColor: POINT_COLORS[i % POINT_COLORS.length] }}>{i + 1}</div>
                            <Input type="number" value={pt.x} onChange={(e) => updateEnvelopePoint(i, 'x', e.target.value)} placeholder="CG" />
                            <Input type="number" value={pt.y} onChange={(e) => updateEnvelopePoint(i, 'y', e.target.value)} placeholder="Wt" />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeEnvelopePoint(i)}><Trash2 size={14}/></Button>
                        </div>
                        ))}
                    </div>
                  </ScrollArea>
                  )}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <div className="flex justify-between items-center"><CardTitle>3. Loading Stations</CardTitle><Button variant="outline" size="sm" onClick={addStation}><Plus size={12}/> Add Item</Button></div>
              </CardHeader>
              <CardContent className="space-y-2">
                <ScrollArea className='h-40 pr-3'>
                  {stations.map((s) => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 items-center group">
                      <Input value={s.name} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="col-span-5" placeholder="Name" />
                      <Input type="number" value={s.weight} onChange={(e) => updateStation(s.id, 'weight', e.target.value)} className="col-span-3" placeholder="Lbs" />
                      <Input type="number" value={s.arm} onChange={(e) => updateStation(s.id, 'arm', e.target.value)} className="col-span-3" placeholder="Arm" />
                      <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeStation(s.id)}><Trash2 size={14}/></Button>
                  </div>
                  ))}
                </ScrollArea>
              </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default WBCalculator;

    