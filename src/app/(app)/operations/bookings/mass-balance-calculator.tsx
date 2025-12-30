
'use client';

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot, Cell } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, Plus, Trash2, Fuel, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../../assets/page';
import type { MassAndBalance } from '@/types/booking';

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];
const FUEL_WEIGHT_PER_GALLON = 6;

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


interface MassBalanceCalculatorProps {
    aircraft: Aircraft;
    initialData?: MassAndBalance;
    onSave: (data: MassAndBalance) => void;
}

export const MassBalanceCalculator = ({ aircraft, initialData, onSave }: MassBalanceCalculatorProps) => {
  const { toast } = useToast();

  const [stations, setStations] = useState<any[]>(() => {
    // Initialize stations from aircraft profile or default
    return [
      { id: 1, name: "Front Seats", weight: 0, arm: aircraft.stationArms?.frontSeats || 0, type: 'standard' },
      { id: 2, name: "Rear Seats", weight: 0, arm: aircraft.stationArms?.rearSeats || 0, type: 'standard' },
      { id: 3, name: "Baggage 1", weight: 0, arm: aircraft.stationArms?.baggage1 || 0, type: 'standard' },
      { id: 4, name: "Fuel", weight: 0, arm: aircraft.stationArms?.fuel || 0, type: 'fuel', gallons: 0, maxGallons: 50 }, // Assuming 50 gal max
    ];
  });

  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });
  
  // When initialData changes (e.g., loading an existing booking), update the station weights
  useEffect(() => {
    if (initialData) {
        setStations(prevStations => {
            return prevStations.map(station => {
                const stationKey = station.name.toLowerCase().replace(/\s+/g, '');
                if (initialData[stationKey]) {
                    const weight = initialData[stationKey].weight;
                    if (station.type === 'fuel') {
                        return { ...station, weight, gallons: parseFloat((weight / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
                    }
                    return { ...station, weight };
                }
                return station;
            })
        })
    }
  }, [initialData]);

  // Main calculation logic
  useEffect(() => {
    let totalMom = aircraft.emptyWeightMoment || 0;
    let totalWt = aircraft.emptyWeight || 0;

    stations.forEach(st => {
      const wt = parseFloat(st.weight) || 0;
      const arm = parseFloat(st.arm) || 0;
      totalWt += wt;
      totalMom += (wt * arm);
    });

    const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
    const safe = aircraft.cgEnvelope && aircraft.cgEnvelope.length > 2
        ? isPointInPolygon({ x: cg, y: totalWt }, aircraft.cgEnvelope)
        : false;

    setResults({
      cg: parseFloat(cg.toFixed(2)),
      weight: parseFloat(totalWt.toFixed(1)),
      isSafe: safe
    });
  }, [stations, aircraft]);

  // HANDLERS
  const handleFuelChange = (id: number, field: string, value: string) => {
    const val = parseFloat(value) || 0;
    setStations(stations.map(s => {
      if (s.id !== id) return s;
      if (field === 'gallons') return { ...s, gallons: val, weight: val * FUEL_WEIGHT_PER_GALLON };
      if (field === 'weight') return { ...s, weight: val, gallons: parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
      return { ...s, [field]: val };
    }));
  };

  const updateStation = (id: number, field: string, val: string) => setStations(stations.map(s => s.id === id ? { ...s, [field]: val } : s));
  
  const handleSaveToBooking = () => {
    const saveData: MassAndBalance = {};
    stations.forEach(station => {
        const stationKey = station.name.toLowerCase().replace(/\s+/g, '');
        saveData[stationKey] = {
            weight: parseFloat(station.weight) || 0,
            moment: (parseFloat(station.weight) || 0) * (parseFloat(station.arm) || 0)
        }
    });
    // Also include basic empty weight in the saved data for completeness
    saveData.basicEmpty = {
        weight: aircraft.emptyWeight || 0,
        moment: aircraft.emptyWeightMoment || 0,
    };
    onSave(saveData);
  }

  // Chart domain and ticks
  const xDomain: [number, number] = [ Math.min(...(aircraft.cgEnvelope?.map(p => p.cg) || [0])), Math.max(...(aircraft.cgEnvelope?.map(p => p.cg) || [100])) ];
  const yDomain: [number, number] = [ Math.min(...(aircraft.cgEnvelope?.map(p => p.weight) || [0])), Math.max(...(aircraft.cgEnvelope?.map(p => p.weight) || [3000])) ];

  const xAxisTicks = generateNiceTicks(xDomain[0], xDomain[1]);
  const yAxisTicks = generateNiceTicks(yDomain[0], yDomain[1]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">

        {/* LEFT COLUMN: CONTROLS */}
        <div className="lg:col-span-5 space-y-6 h-[70vh] overflow-y-auto pr-2 custom-scrollbar">

          {/* 1. AIRCRAFT DATA */}
          <div className="bg-card p-5 rounded-xl border border-border shadow-md">
             <h3 className="text-primary font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                1. Aircraft Base Data
             </h3>
             <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Empty Wt:</span> {aircraft.emptyWeight} lbs</div>
                <div><span className="text-muted-foreground">Empty Moment:</span> {aircraft.emptyWeightMoment}</div>
                <div><span className="text-muted-foreground">Max Takeoff Wt:</span> {aircraft.maxTakeoffWeight} lbs</div>
                <div><span className="text-muted-foreground">Max Landing Wt:</span> {aircraft.maxLandingWeight} lbs</div>
             </div>
          </div>

          {/* 2. LOADING STATIONS */}
          <div className="bg-card p-5 rounded-xl border border-border shadow-md">
             <h3 className="text-primary font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                 2. Loading Stations
              </h3>

            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-muted-foreground font-bold px-1 mb-2 tracking-wider">
               <div className="col-span-5">Station</div>
               <div className="col-span-3 text-right">Weight (lbs)</div>
               <div className="col-span-4 text-right">Arm (in)</div>
            </div>

            <div className="space-y-1">
              {stations.map((s) => (
                <div key={s.id} className="group relative border-b border-border last:border-0 pb-2 mb-1">
                  {s.type === 'fuel' ? (
                     <div className="pt-1">
                        <div className="grid grid-cols-12 gap-2 items-center mb-1">
                            <div className="col-span-5 flex items-center gap-2 font-semibold">
                                <Fuel size={14} className="text-yellow-500"/>
                                {s.name}
                            </div>
                            <div className="col-span-3">
                                <Input type="number" value={s.weight} onChange={(e) => handleFuelChange(s.id, 'weight', e.target.value)} className="w-full p-1 text-sm text-right" />
                            </div>
                            <div className="col-span-4">
                                 <Input type="number" value={s.arm} readOnly disabled className="w-full p-1 text-sm text-right bg-muted/50" />
                            </div>
                        </div>
                         <div className="flex items-center bg-muted border border-border rounded px-2 py-0.5 mt-2 shadow-inner">
                            <Input type="number" value={s.gallons || ''} onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)} className="w-16 bg-transparent text-sm font-bold text-right outline-none p-0 h-auto" placeholder="0" />
                            <span className="text-xs text-muted-foreground ml-1 font-semibold">gallons</span>
                            <input type="range" min="0" max={s.maxGallons || 50} value={s.gallons || 0} onChange={(e) => handleFuelChange(s.id, 'gallons', e.target.value)} className="w-full h-1 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-yellow-500 ml-4" />
                        </div>
                     </div>
                  ) : (
                    <div className="grid grid-cols-12 gap-2 items-center py-1">
                        <div className="col-span-5 font-semibold text-secondary-foreground">{s.name}</div>
                        <div className="col-span-3">
                            <Input type="number" value={s.weight} onChange={(e) => updateStation(s.id, 'weight', e.target.value)} className="w-full p-1 text-sm text-right" placeholder="0" />
                        </div>
                        <div className="col-span-4">
                             <Input type="number" value={s.arm} readOnly disabled className="w-full p-1 text-sm text-right bg-muted/50" />
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: GRAPH & RESULTS */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-md relative min-h-[400px] flex flex-col justify-center items-center overflow-hidden">
             <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[xDomain[0] - 2, xDomain[1] + 2]} ticks={xAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} dy={10}>
                    <Label value="CG (inches)" offset={-10} position="insideBottom" fill="hsl(var(--muted-foreground))" />
                  </XAxis>
                  <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[yDomain[0] - 100, yDomain[1] + 100]} ticks={yAxisTicks} allowDataOverflow={true} stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}}>
                    <Label value="Gross Weight (lbs)" angle={-90} position="insideLeft" fill="hsl(var(--muted-foreground))" />
                  </YAxis>
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}/>
                  {aircraft.cgEnvelope && <Scatter name="Envelope" data={aircraft.cgEnvelope} fill="transparent" line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} isAnimationActive={false} />}
                  <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={2} isFront={true} />
                </ScatterChart>
              </ResponsiveContainer>
              <div className={`absolute bottom-4 right-4 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 ${results.isSafe ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
                <div className={`w-2 h-2 rounded-full ${results.isSafe ? 'bg-white' : 'bg-white animate-pulse'}`}></div>
                {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS"}
              </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-md grid grid-cols-2 gap-4">
              <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase">Total Weight</div>
                  <div className="text-2xl font-bold">{results.weight.toFixed(1)} lbs</div>
              </div>
               <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase">Center of Gravity</div>
                  <div className="text-2xl font-bold">{results.cg.toFixed(2)} in</div>
              </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveToBooking} size="lg">
                <Save className="mr-2" /> Save to Booking
            </Button>
          </div>
        </div>
      </div>
  );
};
