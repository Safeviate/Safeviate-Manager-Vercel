'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Aircraft } from '@/app/(app)/assets/page';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Fuel, AlertTriangle } from 'lucide-react';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { cn, isPointInPolygon } from '@/lib/utils';
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

interface BookingMassBalanceProps {
  aircraft: Aircraft;
}

const POINT_COLORS = [
    '#ef4444',
    '#3b82f6',
    '#eab308',
    '#a855f7',
    '#ec4899',
    '#f97316',
    '#06b6d4',
    '#84cc16',
];
  

export function BookingMassBalance({ aircraft }: BookingMassBalanceProps) {
  const [stations, setStations] = useState<any[]>([]);
  const [basicEmpty, setBasicEmpty] = useState({ weight: 0, moment: 0, arm: 0 });
  const [cgEnvelope, setCgEnvelope] = useState<{ x: number, y: number }[]>([]);
  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (aircraft) {
        setBasicEmpty({
            weight: aircraft.emptyWeight || 0,
            moment: aircraft.emptyWeightMoment || 0,
            arm: (aircraft.emptyWeight && aircraft.emptyWeight > 0) ? (aircraft.emptyWeightMoment || 0) / aircraft.emptyWeight : 0,
        });

        const reconstructedStations: any[] = [];
        if (aircraft.stationArms) {
            if(aircraft.stationArms.frontSeats) reconstructedStations.push({ id: Date.now() + 1, name: 'Front Seats', arm: aircraft.stationArms.frontSeats, weight: 0, type: 'standard' });
            if(aircraft.stationArms.rearSeats) reconstructedStations.push({ id: Date.now() + 2, name: 'Rear Seats', arm: aircraft.stationArms.rearSeats, weight: 0, type: 'standard' });
            if(aircraft.stationArms.baggage1) reconstructedStations.push({ id: Date.now() + 3, name: 'Baggage 1', arm: aircraft.stationArms.baggage1, weight: 0, type: 'standard' });
            if(aircraft.stationArms.baggage2) reconstructedStations.push({ id: Date.now() + 4, name: 'Baggage 2', arm: aircraft.stationArms.baggage2, weight: 0, type: 'standard' });
            // Assume max 50 gal for fuel if not specified
            if(aircraft.stationArms.fuel) reconstructedStations.push({ id: Date.now() + 5, name: 'Fuel', arm: aircraft.stationArms.fuel, weight: 0, type: 'fuel', gallons: 0, maxGallons: 50 });
        }
        setStations(reconstructedStations);

        const envelope = (aircraft.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight }));
        setCgEnvelope(envelope);
    }
  }, [aircraft]);

  useEffect(() => {
    let totalMom = parseFloat(String(basicEmpty.moment)) || 0;
    let totalWt = parseFloat(String(basicEmpty.weight)) || 0;

    stations.forEach((st) => {
      const wt = parseFloat(st.weight) || 0;
      const arm = parseFloat(st.arm) || 0;
      totalWt += wt;
      totalMom += wt * arm;
    });

    const cg = totalWt > 0 ? totalMom / totalWt : 0;
    const safe = cgEnvelope.length > 2 ? isPointInPolygon({ x: cg, y: totalWt }, cgEnvelope) : false;

    setResults({
      cg: parseFloat(cg.toFixed(2)),
      weight: parseFloat(totalWt.toFixed(1)),
      isSafe: safe,
    });
  }, [stations, basicEmpty, cgEnvelope]);

  const updateStationWeight = (id: number, newWeight: string) => {
    setStations(stations.map(s => s.id === id ? { ...s, weight: parseFloat(newWeight) || 0 } : s));
  };
  
  const handleFuelChange = (id: number, field: string, value: string) => {
    const val = parseFloat(value) || 0;
    setStations(
      stations.map((s) => {
        if (s.id !== id) return s;

        if (field === 'gallons') {
            const finalGallons = Math.min(val, s.maxGallons || val);
            return { ...s, gallons: finalGallons, weight: finalGallons * FUEL_WEIGHT_PER_GALLON };
        }
        if (field === 'weight') {
            const calculatedGallons = parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1));
            const finalGallons = Math.min(calculatedGallons, s.maxGallons || calculatedGallons);
            const finalWeight = finalGallons * FUEL_WEIGHT_PER_GALLON;
            return {
                ...s,
                weight: finalWeight,
                gallons: finalGallons,
            };
        }
        return s;
      })
    );
  };

  const addStation = (type = 'standard') => {
    const newStation = {
      id: Date.now(),
      name: type === 'fuel' ? 'New Fuel Tank' : 'New Item',
      weight: 0,
      arm: 0,
      type: type,
      ...(type === 'fuel' ? { gallons: 0, maxGallons: 50 } : {}),
    };
    setStations([...stations, newStation]);
  };

  const removeStation = (id: number) => {
    setStations(stations.filter(s => s.id !== id));
  };

  const allX = useMemo(() => [...cgEnvelope.map(p => p.x), results.cg].filter(n => !isNaN(n)), [cgEnvelope, results.cg]);
  const allY = useMemo(() => [...cgEnvelope.map(p => p.y), results.weight].filter(n => !isNaN(n)), [cgEnvelope, results.weight]);
  const chartDomain = useMemo(() => {
    if (allX.length === 0 || allY.length === 0) return { xMin: 0, xMax: 100, yMin: 0, yMax: 3000 };
    return {
        xMin: Math.floor(Math.min(...allX) - 2),
        xMax: Math.ceil(Math.max(...allX) + 2),
        yMin: Math.floor(Math.min(...allY) - 200),
        yMax: Math.ceil(Math.max(...allY) + 200),
    };
  }, [allX, allY]);

  if (!isClient) {
    return null; // or a skeleton loader
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Mass &amp; Balance</CardTitle>
                <CardDescription>Calculate the mass and balance for this booking.</CardDescription>
            </div>
             <div
                className={cn(
                'px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-2 text-xs',
                results.isSafe
                    ? 'bg-green-600/90 text-white'
                    : 'bg-destructive text-white'
                )}
            >
                <div
                className={cn(
                    'w-2 h-2 rounded-full',
                    results.isSafe ? 'bg-white' : 'bg-white animate-pulse'
                )}
                ></div>
                <span>
                {results.isSafe ? 'WITHIN LIMITS' : 'OUT OF LIMITS'}
                </span>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Mass &amp; Balance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Empty Weight</p>
                            <p className="text-xl font-bold">{basicEmpty.weight.toFixed(1)} lbs</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Weight</p>
                            <p className="text-xl font-bold">{results.weight.toFixed(1)} lbs</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Center of Gravity</p>
                            <p className="text-xl font-bold">{results.cg.toFixed(2)} in</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className='min-h-[400px]'>
                <CardHeader>
                    <CardTitle>CG Envelope</CardTitle>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="CG"
                            unit=" in"
                            domain={[chartDomain.xMin, chartDomain.xMax]}
                            allowDataOverflow={true}
                        >
                             <RechartsLabel value="CG (inches)" offset={-25} position="insideBottom" />
                        </XAxis>
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Weight"
                            unit=" lbs"
                            domain={[chartDomain.yMin, chartDomain.yMax]}
                             allowDataOverflow={true}
                             width={80}
                        >
                            <RechartsLabel value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                        </YAxis>
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Envelope" data={cgEnvelope} fill="transparent" line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} isAnimationActive={false} />
                        <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} stroke="hsl(var(--primary-foreground))" strokeWidth={2}>
                             <RechartsLabel value={`(${results.cg}, ${results.weight})`} position="top" fill="hsl(var(--foreground))" fontSize="12" offset={10} />
                        </ReferenceDot>
                    </ScatterChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Load</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => addStation('standard')}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                     {stations.filter(s => s.type === 'standard').map(station => (
                        <div key={station.id} className="space-y-2">
                             <Label htmlFor={`weight-${station.id}`}>{station.name} (Arm: {station.arm} in)</Label>
                            <div className="flex items-center gap-2">
                                <Input id={`weight-${station.id}`} type="number" placeholder="Weight (lbs)" value={station.weight || ''} onChange={(e) => updateStationWeight(station.id, e.target.value)} />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeStation(station.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Fuel</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-3">
                     {stations.filter(s => s.type === 'fuel').map(station => (
                        <div key={station.id} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor={`gallons-${station.id}`}>Gallons (Arm: {station.arm} in, Max: {station.maxGallons} gal)</Label>
                                <Input id={`gallons-${station.id}`} type="number" placeholder="Gallons" value={station.gallons || ''} onChange={(e) => handleFuelChange(station.id, 'gallons', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`weight-${station.id}`}>Weight ({FUEL_WEIGHT_PER_GALLON} lbs/gal)</Label>
                                <Input id={`weight-${station.id}`} type="number" placeholder="Weight (lbs)" value={station.weight || ''} onChange={(e) => handleFuelChange(station.id, 'weight', e.target.value)} />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
