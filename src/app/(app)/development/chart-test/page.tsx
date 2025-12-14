
'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label as RechartsLabel, ReferenceDot, Cell } from 'recharts';
import { doc, setDoc } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Plus, Trash2, HelpCircle, X } from 'lucide-react';
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

const generateTicks = (min: number | string, max: number | string, count = 5) => {
    const minNum = Number(min);
    const maxNum = Number(max);
    if (isNaN(minNum) || isNaN(maxNum) || minNum >= maxNum) return [];
  
    const step = (maxNum - minNum) / count;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(Math.round((minNum + (step * i)) * 10) / 10);
    }
    return ticks;
};

const GuideModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <HelpCircle size={20} className="text-primary" />
              Setup Guide: POH Data
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto">
            <section className="flex gap-4">
              <div className="bg-primary/20 text-primary font-bold h-8 w-8 flex items-center justify-center rounded-full shrink-0">1</div>
              <div>
                <h3 className="font-bold mb-2">Define Axis Limits</h3>
                <p className="text-sm text-muted-foreground mb-2">Look at the blank W&B chart in your aircraft manual.</p>
                <ul className="text-sm list-disc pl-4 space-y-1">
                  <li><strong>Min/Max CG (X):</strong> Find the furthest left and right numbers on the bottom scale (e.g., 80 to 95 inches).</li>
                  <li><strong>Min/Max Weight (Y):</strong> Find the lowest and highest numbers on the vertical scale (e.g., 1400 to 2600 lbs).</li>
                </ul>
              </div>
            </section>
            <hr />
            <section className="flex gap-4">
              <div className="bg-primary/20 text-primary font-bold h-8 w-8 flex items-center justify-center rounded-full shrink-0">2</div>
              <div>
                <h3 className="font-bold mb-2">Trace the Envelope</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Create the envelope by entering corner points. Start at the bottom-left corner and work clockwise.
                </p>
                <div className="bg-muted p-3 rounded border text-sm font-mono text-muted-foreground">
                  Example (Piper PA-28):<br/>
                  1. 82.0, 1400 (Bottom Left)<br/>
                  2. 82.0, 1950 (Straight Up)<br/>
                  3. 86.5, 2450 (Angled Slope)<br/>
                  4. 93.0, 2450 (Top Right)<br/>
                  5. 93.0, 1400 (Bottom Right)<br/>
                  6. 82.0, 1400 (<strong>Important:</strong> Repeat first point to close loop)
                </div>
              </div>
            </section>
             <hr />
            <section className="flex gap-4">
              <div className="bg-primary/20 text-primary font-bold h-8 w-8 flex items-center justify-center rounded-full shrink-0">3</div>
              <div>
                <h3 className="font-bold mb-2">Add Loading Stations</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the "Arm" (distance from datum) for every seat, fuel tank, and baggage area. Leave the "Weight" blank (or 0) for the initial profile.
                </p>
              </div>
            </section>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Got it, let's configure</Button>
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
        { x: 82, y: 1400 }, { x: 82, y: 1950 }, { x: 86.5, y: 2450 },
        { x: 93, y: 2450 }, { x: 93, y: 1400 }, { x: 82, y: 1400 },
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

  const isGraphConfigured = 
    graphConfig.xMin !== "" && graphConfig.xMax !== "" && 
    graphConfig.yMin !== "" && graphConfig.yMax !== "" &&
    graphConfig.envelope.length >= 3;
    
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
    const safe = isPointInPolygon({ x: cg, y: totalWt }, graphConfig.envelope);
    setResults({ cg: parseFloat(cg.toFixed(2)), weight: parseFloat(totalWt.toFixed(1)), isSafe: safe });
  }, [stations, graphConfig.envelope]);

  const addStation = () => setStations([...stations, { id: Date.now(), name: "New Item", weight: "", arm: "" }]);
  const removeStation = (id: number) => setStations(stations.filter(s => s.id !== id));
  const updateStation = (id: number, field: 'name' | 'weight' | 'arm', val: string) => setStations(stations.map(s => s.id === id ? { ...s, [field]: val } : s));
  const addEnvelopePoint = () => setGraphConfig({ ...graphConfig, envelope: [...graphConfig.envelope, { x: 0, y: 0 }] });
  const updateEnvelopePoint = (index: number, field: 'x' | 'y', val: string) => {
    const newEnv = [...graphConfig.envelope];
    newEnv[index][field] = Number(val);
    setGraphConfig({ ...graphConfig, envelope: newEnv });
  };
  const removeEnvelopePoint = (index: number) => {
    const newEnv = graphConfig.envelope.filter((_, i) => i !== index);
    setGraphConfig({ ...graphConfig, envelope: newEnv });
  };

  const saveToFirebase = async () => {
    if (!firestore) return alert("Firestore not available");
    if (!graphConfig.modelName) return alert("Please enter a Model Name");
    try {
      await setDoc(doc(firestore, "aircraft_profiles", graphConfig.modelName), {
        graphConfig, defaultStations: stations
      });
      alert("Aircraft Profile Saved!");
    } catch (e) {
      console.error("Error saving: ", e);
    }
  };
  
  const xTicks = generateTicks(graphConfig.xMin, graphConfig.xMax, 7);
  const yTicks = generateTicks(graphConfig.yMin, graphConfig.yMax, 6);

  return (
    <div className="p-6 font-sans">
      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">W&B Configurator</h1>
          <Input 
            placeholder="Enter Aircraft Model Name..."
            value={graphConfig.modelName} 
            onChange={(e) => setGraphConfig({...graphConfig, modelName: e.target.value})}
            className="text-lg w-96 mt-1"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowGuide(true)}><HelpCircle size={16} /> Data Entry Guide</Button>
          <Button onClick={saveToFirebase}><Save size={16} /> Save Profile</Button>
        </div>
      </div>

        <Card className="flex-1 flex flex-col justify-center items-center p-4 mb-6">
            <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[Number(graphConfig.xMin), Number(graphConfig.xMax)]} ticks={xTicks} tick={{fill: 'hsl(var(--muted-foreground))'}} stroke="hsl(var(--muted-foreground))">
                <RechartsLabel value="CG (inches)" offset={-25} position="insideBottom" fill="hsl(var(--muted-foreground))" />
                </XAxis>
                <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[Number(graphConfig.yMin), Number(graphConfig.yMax)]} ticks={yTicks} tick={{fill: 'hsl(var(--muted-foreground))'}} stroke="hsl(var(--muted-foreground))">
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
                <CardHeader>
                    <CardTitle className='flex items-center justify-between'>
                    1. Chart Limits
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowGuide(true)}>
                        <HelpCircle size={16} className="text-muted-foreground" />
                    </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div><Label>Min CG (X)</Label><Input type="number" placeholder="80" value={graphConfig.xMin} onChange={(e) => setGraphConfig({...graphConfig, xMin: e.target.value})} /></div>
                    <div><Label>Max CG (X)</Label><Input type="number" placeholder="95" value={graphConfig.xMax} onChange={(e) => setGraphConfig({...graphConfig, xMax: e.target.value})} /></div>
                    <div><Label>Min Weight (Y)</Label><Input type="number" placeholder="1400" value={graphConfig.yMin} onChange={(e) => setGraphConfig({...graphConfig, yMin: e.target.value})} /></div>
                    <div><Label>Max Weight (Y)</Label><Input type="number" placeholder="2600" value={graphConfig.yMax} onChange={(e) => setGraphConfig({...graphConfig, yMax: e.target.value})} /></div>
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
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {graphConfig.envelope.map((pt, i) => (
                        <div key={i} className="flex gap-2 items-center group">
                            <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: POINT_COLORS[i % POINT_COLORS.length] }}></span>
                            <Input type="number" value={pt.x} onChange={(e) => updateEnvelopePoint(i, 'x', e.target.value)} placeholder="CG" />
                            <Input type="number" value={pt.y} onChange={(e) => updateEnvelopePoint(i, 'y', e.target.value)} placeholder="Wt" />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeEnvelopePoint(i)}><Trash2 size={14}/></Button>
                        </div>
                        ))}
                    </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center"><CardTitle>3. Loading Stations</CardTitle><Button variant="outline" size="sm" onClick={addStation}><Plus size={12}/> Add Item</Button></div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {stations.map((s) => (
                    <div key={s.id} className="grid grid-cols-12 gap-2 items-center group">
                        <Input value={s.name} onChange={(e) => updateStation(s.id, 'name', e.target.value)} className="col-span-5" placeholder="Name" />
                        <Input type="number" value={s.weight} onChange={(e) => updateStation(s.id, 'weight', e.target.value)} className="col-span-3" placeholder="Lbs" />
                        <Input type="number" value={s.arm} onChange={(e) => updateStation(s.id, 'arm', e.target.value)} className="col-span-3" placeholder="Arm" />
                        <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeStation(s.id)}><Trash2 size={14}/></Button>
                    </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default WBCalculator;
