
'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label as RechartsLabel } from 'recharts';
import { doc, setDoc } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Upload, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const WBCalculator = () => {
  const firestore = useFirestore();

  // --- STATE: Graph Settings (Editable Axis & Envelope) ---
  const [graphConfig, setGraphConfig] = useState({
    modelName: "Piper PA-28-180",
    xMin: 80, xMax: 94,    // CG Axis
    yMin: 1400, yMax: 2600, // Weight Axis
    // The Green Polygon Points (The Envelope)
    envelope: [
      { x: 82, y: 1400 },
      { x: 82, y: 1950 },
      { x: 86.5, y: 2450 },
      { x: 93, y: 2450 },
      { x: 93, y: 1400 },
      { x: 82, y: 1400 }, // Close the loop
    ]
  });

  // --- STATE: Flight Stations (Passengers, Fuel, etc) ---
  const [stations, setStations] = useState([
    { id: 1, name: "Basic Empty Weight", weight: 1416, arm: 85.0 },
    { id: 2, name: "Pilot & Front Pax", weight: 170, arm: 85.5 },
    { id: 3, name: "Rear Pax", weight: 0, arm: 118.1 },
    { id: 4, name: "Fuel (Gal)", weight: 300, arm: 95.0, isFuel: true },
    { id: 5, name: "Baggage Area", weight: 0, arm: 142.8 },
  ]);

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

  // --- CALCULATOR ENGINE ---
  useEffect(() => {
    let totalMom = 0;
    let totalWt = 0;

    stations.forEach(st => {
      const wt = parseFloat(st.weight as any || 0);
      const arm = parseFloat(st.arm as any || 0);
      totalWt += wt;
      totalMom += (wt * arm);
    });

    const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
    
    const safe = isPointInPolygon({ x: cg, y: totalWt }, graphConfig.envelope);

    setResults({
      cg: parseFloat(cg.toFixed(2)),
      weight: parseFloat(totalWt.toFixed(1)),
      isSafe: safe
    });

  }, [stations, graphConfig.envelope]);

  // --- HANDLERS ---
  const handleStationChange = (id: number, field: 'weight' | 'arm', val: any) => {
    setStations(stations.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleEnvelopePointChange = (index: number, field: 'x' | 'y', val: any) => {
    const newEnv = [...graphConfig.envelope];
    (newEnv[index] as any)[field] = Number(val);
    setGraphConfig({ ...graphConfig, envelope: newEnv });
  };
  
  const saveToFirebase = async () => {
    if (!firestore) {
      alert("Firestore not available");
      return;
    }
    try {
      await setDoc(doc(firestore, "aircraft_profiles", graphConfig.modelName), {
        graphConfig,
        defaultStations: stations
      });
      alert("Aircraft Profile Saved!");
    } catch (e) {
      console.error("Error saving: ", e);
      alert("Save failed, check console.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Aircraft Configuration</CardTitle>
                    <CardDescription>Define the weight and balance envelope for an aircraft model.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor='modelName'>Model Name</Label>
                        <Input id="modelName" value={graphConfig.modelName} onChange={(e) => setGraphConfig({...graphConfig, modelName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="xMin">X-Axis Min (CG)</Label>
                            <Input type="number" id="xMin" value={graphConfig.xMin} onChange={(e) => setGraphConfig({...graphConfig, xMin: Number(e.target.value)})}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="xMax">X-Axis Max (CG)</Label>
                            <Input type="number" id="xMax" value={graphConfig.xMax} onChange={(e) => setGraphConfig({...graphConfig, xMax: Number(e.target.value)})}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="yMin">Y-Axis Min (Lbs)</Label>
                            <Input type="number" id="yMin" value={graphConfig.yMin} onChange={(e) => setGraphConfig({...graphConfig, yMin: Number(e.target.value)})}/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="yMax">Y-Axis Max (Lbs)</Label>
                            <Input type="number" id="yMax" value={graphConfig.yMax} onChange={(e) => setGraphConfig({...graphConfig, yMax: Number(e.target.value)})}/>
                        </div>
                    </div>
                    <div>
                        <Label>Envelope Polygon Points</Label>
                         <div className="h-32 overflow-y-auto border p-2 rounded-md space-y-2 mt-2">
                            {graphConfig.envelope.map((pt, i) => (
                                <div key={i} className="flex gap-2">
                                    <Input type="number" value={pt.x} onChange={(e) => handleEnvelopePointChange(i, 'x', e.target.value)} className="w-20 h-8" placeholder="CG" />
                                    <Input type="number" value={pt.y} onChange={(e) => handleEnvelopePointChange(i, 'y', e.target.value)} className="flex-1 h-8" placeholder="Weight" />
                                </div>
                            ))}
                        </div>
                        <Button variant="link" className="text-sm p-0 h-auto mt-2" onClick={() => setGraphConfig({...graphConfig, envelope: [...graphConfig.envelope, {x:0, y:0}]})}>
                            <Plus className="mr-2" /> Add Point
                        </Button>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Load Calculator</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Arm</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {stations.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="py-2 font-medium">{s.name}</TableCell>
                                    <TableCell><Input type="number" className="w-20 h-8 p-1" value={s.weight} onChange={(e) => handleStationChange(s.id, 'weight', e.target.value)} /></TableCell>
                                    <TableCell><Input type="number" className="w-20 h-8 p-1" value={s.arm} onChange={(e) => handleStationChange(s.id, 'arm', e.target.value)} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     <div className="mt-4 p-2 bg-muted rounded-md text-center">
                        <strong>Total Weight: {results.weight} lbs</strong> | <strong>CG: {results.cg} in</strong>
                    </div>
                </CardContent>
            </Card>
            <Button onClick={saveToFirebase} className="w-full">
                <Save className="mr-2" />
                Save Profile to Firebase
            </Button>
        </div>

        {/* RIGHT COLUMN: The Interactive Graph */}
        <div className="lg:col-span-2">
            <Card className="min-h-[500px] flex flex-col">
                 <CardHeader>
                    <CardTitle>{graphConfig.modelName} W&B Chart</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={500}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                                type="number"
                                dataKey="x"
                                name="CG"
                                unit=" in"
                                domain={[graphConfig.xMin, graphConfig.xMax]}
                                stroke="hsl(var(--muted-foreground))"
                            >
                                <RechartsLabel value="CG (inches)" offset={-25} position="insideBottom" fill="hsl(var(--muted-foreground))" />
                            </XAxis>
                            <YAxis
                                type="number"
                                dataKey="y"
                                name="Weight"
                                unit=" lbs"
                                domain={[graphConfig.yMin, graphConfig.yMax]}
                                stroke="hsl(var(--muted-foreground))"
                            >
                                 <RechartsLabel value="Gross Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="hsl(var(--muted-foreground))" />
                            </YAxis>
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                }}
                            />
                            <Scatter
                                name="Envelope"
                                data={graphConfig.envelope}
                                fill="transparent"
                                line={{ stroke: '#4ade80', strokeWidth: 2 }}
                                shape={() => null}
                            />
                            <ReferenceDot 
                                x={results.cg} 
                                y={results.weight}
                                r={8} 
                                fill={results.isSafe ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                                stroke="hsl(var(--background))" 
                                strokeWidth={2} 
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                    <div className="mt-4">
                        <Badge className={cn(results.isSafe ? 'bg-green-600' : 'bg-destructive', 'text-white')}>
                            {results.isSafe ? 'Within Limits' : 'Out of Limits'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default WBCalculator;
