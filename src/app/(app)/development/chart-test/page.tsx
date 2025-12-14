
'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label as RechartsLabel } from 'recharts';
import { doc, setDoc, getDoc } from "firebase/firestore"; 
import { useFirestore } from '@/firebase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const WBCalculator = () => {
  const firestore = useFirestore();

  // --- 1. STATE: Graph Configuration (The "Editable" parts) ---
  const [config, setConfig] = useState({
    modelName: "Piper PA-28-180",
    xMin: 80, xMax: 95, // CG Axis Range
    yMin: 1400, yMax: 2600, // Weight Axis Range
    // The "Green Box" points (CG, Weight)
    envelope: [
      { x: 82, y: 1400 },
      { x: 82, y: 2050 }, // Forward limit step
      { x: 86.5, y: 2450 }, // Slope
      { x: 93, y: 2450 }, // Aft limit top
      { x: 93, y: 1400 }, // Aft limit bottom
      { x: 82, y: 1400 }, // Close the loop
    ]
  });

  // --- 2. STATE: Current Flight Load ---
  const [stations, setStations] = useState([
    { name: "Basic Empty Weight", weight: 1416, arm: 85.0 },
    { name: "Pilot & Front Pax", weight: 170, arm: 85.5 },
    { name: "Rear Pax", weight: 0, arm: 118.1 },
    { name: "Fuel (6lbs/gal)", weight: 300, arm: 95.0 },
    { name: "Baggage", weight: 0, arm: 142.8 },
  ]);

  const [currentCG, setCurrentCG] = useState({ x: 0, y: 0 });

  // --- 3. CALCULATIONS ---
  useEffect(() => {
    let totalWeight = 0;
    let totalMoment = 0;

    stations.forEach(station => {
      totalWeight += parseFloat(station.weight as any || 0);
      totalMoment += (parseFloat(station.weight as any || 0) * parseFloat(station.arm as any || 0));
    });

    const cg = totalMoment / totalWeight || 0;
    setCurrentCG({ x: parseFloat(cg.toFixed(2)), y: totalWeight });
  }, [stations]);

  // --- 4. FIREBASE SAVE/LOAD ---
  const saveProfile = async () => {
    if (!firestore) {
        alert("Firestore is not ready.");
        return;
    }
    try {
      await setDoc(doc(firestore, "aircraft", config.modelName), { config, stations });
      alert("Profile Saved!");
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  // --- HANDLERS ---
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const updateStation = (index: number, field: 'weight' | 'arm', value: any) => {
    const newStations = [...stations];
    (newStations[index] as any)[field] = value;
    setStations(newStations);
  };

  const handleEnvelopeChange = (index: number, field: 'x' | 'y', value: any) => {
    const newEnvelope = [...config.envelope];
    (newEnvelope[index] as any)[field] = Number(value);
    setConfig({ ...config, envelope: newEnvelope });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20">
      
      {/* LEFT COLUMN: Controls */}
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">1. Aircraft Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Model Name</Label>
              <Input className="w-full" name="modelName" value={config.modelName} onChange={handleConfigChange}/>
            </div>
            <div/>
            <div>
              <Label>X-Axis Min (CG)</Label>
              <Input type="number" className="w-full" name="xMin" value={config.xMin} onChange={handleConfigChange}/>
            </div>
            <div>
              <Label>X-Axis Max (CG)</Label>
              <Input type="number" className="w-full" name="xMax" value={config.xMax} onChange={handleConfigChange}/>
            </div>
            <div>
              <Label>Y-Axis Min (Lbs)</Label>
              <Input type="number" className="w-full" name="yMin" value={config.yMin} onChange={handleConfigChange}/>
            </div>
            <div>
              <Label>Y-Axis Max (Lbs)</Label>
              <Input type="number" className="w-full" name="yMax" value={config.yMax} onChange={handleConfigChange}/>
            </div>
          </div>

          <h3 className="font-semibold mt-4 mb-2">Envelope Polygon Points</h3>
          <div className="h-32 overflow-y-scroll border p-2 rounded-md">
            {config.envelope.map((pt, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <Input type="number" value={pt.x} onChange={(e) => handleEnvelopeChange(i, 'x', e.target.value)} className="w-20 h-8" placeholder="CG" />
                <Input type="number" value={pt.y} onChange={(e) => handleEnvelopeChange(i, 'y', e.target.value)} className="w-20 h-8" placeholder="Wt" />
              </div>
            ))}
            <Button variant="link" className="text-sm p-0 h-auto mt-2" onClick={() => setConfig({...config, envelope: [...config.envelope, {x:0, y:0}]})}>+ Add Point</Button>
          </div>
          <Button onClick={saveProfile} className="mt-4 w-full bg-green-600 hover:bg-green-700">Save to Firebase</Button>
        </div>

        <div className="bg-card p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">2. Load Calculator</h2>
          <table className="w-full text-sm text-left">
            <thead>
              <tr><th className='pb-2'>Item</th><th className='pb-2'>Weight (lbs)</th><th className='pb-2'>Arm (in)</th></tr>
            </thead>
            <tbody>
              {stations.map((s, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{s.name}</td>
                  <td><Input type="number" className="w-20 h-8" value={s.weight} onChange={(e) => updateStation(i, 'weight', e.target.value)} /></td>
                  <td><Input type="number" className="w-20 h-8" value={s.arm} onChange={(e) => updateStation(i, 'arm', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 p-2 bg-blue-100 dark:bg-blue-900/50 rounded text-center text-blue-800 dark:text-blue-200">
            <strong>Total Weight: {currentCG.y.toFixed(1)} lbs</strong> | <strong>CG: {currentCG.x.toFixed(2)} in</strong>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: The Interactive Graph */}
      <div className="bg-card p-4 rounded-lg shadow flex flex-col items-center justify-center min-h-[500px]">
        <h2 className="text-lg font-bold mb-2">{config.modelName} W&B Chart</h2>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            
            <XAxis 
              type="number" 
              dataKey="x" 
              name="CG" 
              unit=" in" 
              domain={[Number(config.xMin), Number(config.xMax)]} 
              stroke="hsl(var(--foreground))"
            >
              <RechartsLabel value="CG (inches)" offset={-15} position="insideBottom" fill="hsl(var(--muted-foreground))" />
            </XAxis>

            <YAxis 
              type="number" 
              dataKey="y" 
              name="Weight" 
              unit=" lbs" 
              domain={[Number(config.yMin), Number(config.yMax)]} 
              stroke="hsl(var(--foreground))"
            >
              <RechartsLabel value="Gross Weight (lbs)" angle={-90} position="insideLeft" fill="hsl(var(--muted-foreground))" />
            </YAxis>

            <Tooltip cursor={{ strokeDasharray: '3 3' }} />

            <Scatter 
              name="Envelope" 
              data={config.envelope} 
              fill="transparent" 
              line={{ stroke: '#4ade80', strokeWidth: 2 }} 
              shape={() => null} // Hide dots for envelope
            />

            <Scatter 
              name="Current Load" 
              data={[currentCG]} 
              fill="#ef4444" 
              shape="circle"
            />
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-4">
           <span className="text-muted-foreground text-sm">Verify point is within the green envelope.</span>
        </div>
      </div>
    </div>
  );
};

export default WBCalculator;
