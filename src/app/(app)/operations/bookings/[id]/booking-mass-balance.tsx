
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Fuel } from 'lucide-react';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon, cn } from '@/lib/utils';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { Booking, MassAndBalance } from '@/types/booking';
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
  booking: Booking;
  onCalculationChange: (data: Omit<MassAndBalance, 'calculationTime'> | null) => void;
  initialData?: MassAndBalance | null;
}

type Station = {
  id: number;
  name: string;
  weight: number;
  arm: number;
  type: 'standard' | 'fuel' | 'bew';
  gallons?: number;
  maxGallons?: number;
};

const POINT_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#f97316', '#06b6d4', '#84cc16'];

export function BookingMassBalance({ aircraft, booking, onCalculationChange, initialData }: BookingMassBalanceProps) {
  const [basicEmpty, setBasicEmpty] = useState({ weight: 0, moment: 0, arm: 0 });
  const [stations, setStations] = useState<Station[]>([]);
  const [cgEnvelope, setCgEnvelope] = useState<{ x: number, y: number }[]>([]);
  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });
  
  useEffect(() => {
    if (aircraft) {
      // Set Basic Empty Weight from aircraft
      setBasicEmpty({
        weight: aircraft.emptyWeight || 0,
        moment: aircraft.emptyWeightMoment || 0,
        arm: (aircraft.emptyWeight && aircraft.emptyWeight > 0) ? (aircraft.emptyWeightMoment || 0) / aircraft.emptyWeight : 0,
      });

      // Reconstruct stations from aircraft's stationArms
      const reconstructedStations: Station[] = [];
      if (aircraft.stationArms) {
        if(aircraft.stationArms.frontSeats) reconstructedStations.push({ id: 1, name: 'Front Seats', arm: aircraft.stationArms.frontSeats, weight: initialData?.frontSeatWeight || 0, type: 'standard' });
        if(aircraft.stationArms.rearSeats) reconstructedStations.push({ id: 2, name: 'Rear Seats', arm: aircraft.stationArms.rearSeats, weight: initialData?.rearSeatWeight || 0, type: 'standard' });
        if(aircraft.stationArms.baggage1) reconstructedStations.push({ id: 3, name: 'Baggage 1', arm: aircraft.stationArms.baggage1, weight: initialData?.baggage1Weight || 0, type: 'standard' });
        if(aircraft.stationArms.baggage2) reconstructedStations.push({ id: 4, name: 'Baggage 2', arm: aircraft.stationArms.baggage2, weight: initialData?.baggage2Weight || 0, type: 'standard' });
        if(aircraft.stationArms.fuel) {
            const initialGallons = initialData?.fuelGallons || 0;
            reconstructedStations.push({ id: 5, name: 'Fuel', arm: aircraft.stationArms.fuel, weight: initialGallons * FUEL_WEIGHT_PER_GALLON, type: 'fuel', gallons: initialGallons, maxGallons: 50 }); // Assume max 50 gal
        }
      }
      setStations(reconstructedStations);

      // Set CG Envelope, converting from {weight, cg} to {x, y}
      const envelope = (aircraft.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight }));
      setCgEnvelope(envelope);
    }
  }, [aircraft, initialData]);

  useEffect(() => {
    let totalMom = basicEmpty.moment || 0;
    let totalWt = basicEmpty.weight || 0;

    stations.forEach((st) => {
      const wt = parseFloat(String(st.weight)) || 0;
      const arm = parseFloat(String(st.arm)) || 0;
      totalWt += wt;
      totalMom += wt * arm;
    });

    const cg = totalWt > 0 ? totalMom / totalWt : 0;
    const isSafe = cgEnvelope.length > 2 ? isPointInPolygon({ x: cg, y: totalWt }, cgEnvelope) : false;

    const finalResults = {
      cg: parseFloat(cg.toFixed(2)),
      weight: parseFloat(totalWt.toFixed(1)),
      isSafe,
    };
    setResults(finalResults);

    // Propagate changes up
    onCalculationChange({
        frontSeatWeight: stations.find(s => s.name === 'Front Seats')?.weight || 0,
        rearSeatWeight: stations.find(s => s.name === 'Rear Seats')?.weight || 0,
        baggage1Weight: stations.find(s => s.name === 'Baggage 1')?.weight || 0,
        baggage2Weight: stations.find(s => s.name === 'Baggage 2')?.weight || 0,
        fuelGallons: stations.find(s => s.type === 'fuel')?.gallons || 0,
        takeoffWeight: finalResults.weight,
        takeoffCg: finalResults.cg,
    });
  }, [stations, basicEmpty, cgEnvelope, onCalculationChange]);


  const handleStationChange = (id: number, field: keyof Station, value: string | number) => {
    setStations(stations.map(s => {
      if (s.id !== id) return s;
      
      const newStation = { ...s, [field]: value };

      if (s.type === 'fuel') {
        if (field === 'gallons') {
            const gallons = Number(value);
            const finalGallons = Math.min(gallons, s.maxGallons || gallons);
            newStation.gallons = finalGallons;
            newStation.weight = finalGallons * FUEL_WEIGHT_PER_GALLON;
        } else if (field === 'weight') {
            const weight = Number(value);
            const calculatedGallons = parseFloat((weight / FUEL_WEIGHT_PER_GALLON).toFixed(1));
            const finalGallons = Math.min(calculatedGallons, s.maxGallons || calculatedGallons);
            newStation.weight = finalGallons * FUEL_WEIGHT_PER_GALLON;
            newStation.gallons = finalGallons;
        }
      }
      return newStation;
    }));
  };

  const allX = [...cgEnvelope.map(p => p.x), results.cg].filter(n => !isNaN(n));
  const allY = [...cgEnvelope.map(p => p.y), results.weight].filter(n => !isNaN(n));
  const xMin = Math.min(...allX) - 2;
  const xMax = Math.max(...allX) + 2;
  const yMin = Math.min(...allY) - 200;
  const yMax = Math.max(...allY) + 200;

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        {/* LEFT COLUMN: Summary & Graph */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle>Mass & Balance Summary</CardTitle>
                        <div className={cn('px-3 py-1 rounded-full font-bold text-xs shadow-lg flex items-center gap-2', results.isSafe ? 'bg-green-600/90 text-white' : 'bg-destructive text-white')}>
                            <div className={cn('w-2 h-2 rounded-full', results.isSafe ? 'bg-white' : 'bg-white animate-pulse')} />
                            {results.isSafe ? 'WITHIN LIMITS' : 'OUT OF LIMITS'}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left font-medium text-muted-foreground pb-2">Item</th>
                                <th className="text-right font-medium text-muted-foreground pb-2">Weight (lbs)</th>
                                <th className="text-right font-medium text-muted-foreground pb-2">Arm (in)</th>
                                <th className="text-right font-medium text-muted-foreground pb-2">Moment (lbs-in)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="py-2">Basic Empty Weight</td>
                                <td className="text-right py-2">{basicEmpty.weight.toFixed(1)}</td>
                                <td className="text-right py-2">{basicEmpty.arm.toFixed(2)}</td>
                                <td className="text-right py-2">{basicEmpty.moment.toFixed(0)}</td>
                            </tr>
                            {stations.map(st => (
                                <tr key={st.id} className="border-b">
                                    <td className="py-2">{st.name}</td>
                                    <td className="text-right py-2">{Number(st.weight || 0).toFixed(1)}</td>
                                    <td className="text-right py-2">{Number(st.arm || 0).toFixed(2)}</td>
                                    <td className="text-right py-2">{((st.weight || 0) * (st.arm || 0)).toFixed(0)}</td>
                                </tr>
                            ))}
                            <tr className="font-bold">
                                <td className="pt-2">Takeoff Condition</td>
                                <td className="text-right pt-2">{results.weight.toFixed(1)}</td>
                                <td className="text-right pt-2">{results.cg.toFixed(2)}</td>
                                <td className="text-right pt-2">{(results.weight * results.cg).toFixed(0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <div className='h-[400px] w-full'>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[xMin, xMax]} allowDataOverflow={true} />
                        <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[yMin, yMax]} width={80} allowDataOverflow={true} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Envelope" data={cgEnvelope} line={{ stroke: 'hsl(var(--primary))' }} shape={() => null} />
                        <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} stroke="white" strokeWidth={2}>
                            <RechartsLabel value="Takeoff" position="top" offset={10} />
                        </ReferenceDot>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* RIGHT COLUMN: Inputs */}
        <div className="space-y-6">
          {stations.filter(s => s.type !== 'fuel').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Load</CardTitle>
                <CardDescription>Enter weights for each station.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stations.filter(s => s.type === 'standard').map(station => (
                  <div key={station.id} className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor={`weight-${station.id}`}>{station.name}</Label>
                    <Input
                      id={`weight-${station.id}`}
                      type="number"
                      value={station.weight || ''}
                      onChange={(e) => handleStationChange(station.id, 'weight', e.target.value)}
                      className="text-right"
                      placeholder="0 lbs"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {stations.filter(s => s.type === 'fuel').map(station => (
            <Card key={station.id}>
              <CardHeader>
                <CardTitle>Fuel</CardTitle>
                <CardDescription>Enter fuel quantity in gallons.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor={`gallons-${station.id}`}>{station.name} (Gallons)</Label>
                    <Input
                      id={`gallons-${station.id}`}
                      type="number"
                      value={station.gallons || ''}
                      onChange={(e) => handleStationChange(station.id, 'gallons', e.target.value)}
                      className="text-right"
                      placeholder="0 gal"
                    />
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor={`fuel-weight-${station.id}`}>Fuel Weight</Label>
                    <Input
                      id={`fuel-weight-${station.id}`}
                      type="number"
                      value={station.weight || ''}
                      onChange={(e) => handleStationChange(station.id, 'weight', e.target.value)}
                      className="text-right"
                      placeholder="0 lbs"
                    />
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
