'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Booking, MassAndBalance } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label as RechartsLabel,
  Area,
  ReferenceDot,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { cn, isPointInPolygon } from '@/lib/utils';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';

interface BookingMassBalanceProps {
    aircraft: Aircraft | null;
    booking: Booking | null;
    onCalculationChange: (data: Omit<MassAndBalance, 'calculationTime'>) => void;
    initialData?: MassAndBalance | null;
}

export function BookingMassBalance({ aircraft, booking, onCalculationChange, initialData }: BookingMassBalanceProps) {

    type Station = {
        name: string;
        weight: number;
        arm: number;
    };
    
    // --- State for Inputs ---
    const [stations, setStations] = useState<Station[]>([]);
    const [fuelGallons, setFuelGallons] = useState(initialData?.fuelGallons || 0);

    // --- Effect to initialize stations from aircraft data ---
    useEffect(() => {
        if (!aircraft || !aircraft.stationArms) {
            setStations([]);
            return;
        }

        const initialStations: Station[] = [];
        if (aircraft.stationArms.frontSeats) {
            initialStations.push({ name: 'Front Seats', arm: aircraft.stationArms.frontSeats, weight: initialData?.frontSeatWeight || 0 });
        }
        if (aircraft.stationArms.rearSeats) {
            initialStations.push({ name: 'Rear Seats', arm: aircraft.stationArms.rearSeats, weight: initialData?.rearSeatWeight || 0 });
        }
        if (aircraft.stationArms.baggage1) {
            initialStations.push({ name: 'Baggage 1', arm: aircraft.stationArms.baggage1, weight: initialData?.baggage1Weight || 0 });
        }
        if (aircraft.stationArms.baggage2) {
            initialStations.push({ name: 'Baggage 2', arm: aircraft.stationArms.baggage2, weight: initialData?.baggage2Weight || 0 });
        }
        setStations(initialStations);
        setFuelGallons(initialData?.fuelGallons || 0);

    }, [aircraft, initialData]);
    
    // --- Calculations ---
    const calculation = useMemo(() => {
        if (!aircraft) return null;

        const emptyWeight = aircraft.emptyWeight || 0;
        const emptyMoment = aircraft.emptyWeightMoment || 0;
        
        const loadItems = stations.map(s => ({ ...s, moment: s.weight * s.arm }));
        
        // Zero Fuel Condition
        const totalLoadWeight = loadItems.reduce((sum, item) => sum + item.weight, 0);
        const totalLoadMoment = loadItems.reduce((sum, item) => sum + item.moment, 0);

        const zeroFuelWeight = emptyWeight + totalLoadWeight;
        const zeroFuelMoment = emptyMoment + totalLoadMoment;
        const zeroFuelCg = zeroFuelWeight > 0 ? zeroFuelMoment / zeroFuelWeight : 0;

        // Takeoff Condition
        const fuelWeight = fuelGallons * FUEL_WEIGHT_PER_GALLON;
        const fuelMoment = fuelWeight * (aircraft.stationArms?.fuel || 0);
        const takeoffWeight = zeroFuelWeight + fuelWeight;
        const takeoffMoment = zeroFuelMoment + fuelMoment;
        const takeoffCg = takeoffWeight > 0 ? takeoffMoment / takeoffWeight : 0;

        return {
            emptyWeight, emptyMoment,
            loadItems,
            zeroFuelWeight, zeroFuelCg, zeroFuelMoment,
            fuelWeight, fuelMoment, fuelArm: aircraft.stationArms?.fuel || 0,
            takeoffWeight, takeoffCg, takeoffMoment,
        };
    }, [aircraft, stations, fuelGallons]);
    
    // --- Effect to notify parent of changes ---
    useEffect(() => {
        if (calculation) {
            onCalculationChange({
                frontSeatWeight: stations.find(s => s.name === 'Front Seats')?.weight || 0,
                rearSeatWeight: stations.find(s => s.name === 'Rear Seats')?.weight || 0,
                baggage1Weight: stations.find(s => s.name === 'Baggage 1')?.weight || 0,
                baggage2Weight: stations.find(s => s.name === 'Baggage 2')?.weight || 0,
                fuelGallons,
                takeoffWeight: calculation.takeoffWeight,
                takeoffCg: calculation.takeoffCg,
            })
        }
    }, [calculation, stations, fuelGallons, onCalculationChange]);


    const cgEnvelopePoints = useMemo(() => aircraft?.cgEnvelope?.map(p => ({ y: p.weight, x: p.cg })) || [], [aircraft]);

    const takeoffPoint = useMemo(() => ({ x: calculation?.takeoffCg || 0, y: calculation?.takeoffWeight || 0 }), [calculation]);

    const isTakeoffWeightOk = calculation && aircraft?.maxTakeoffWeight ? calculation.takeoffWeight <= aircraft.maxTakeoffWeight : true;
    const isTakeoffCgOk = calculation ? isPointInPolygon(takeoffPoint, cgEnvelopePoints) : true;
    const isTakeoffOk = isTakeoffWeightOk && isTakeoffCgOk;

    const domain = useMemo(() => {
        if (!aircraft?.cgEnvelope || aircraft.cgEnvelope.length === 0) return { x: [0, 100], y: [0, 3000] };
        
        const xValues = aircraft.cgEnvelope.map(p => p.cg);
        const yValues = aircraft.cgEnvelope.map(p => p.weight);

        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...yValues);

        const xPadding = (maxX - minX) * 0.1;
        const yPadding = (maxY - minY) * 0.1;
        
        return {
            x: [minX - xPadding, maxX + xPadding],
            y: [minY - yPadding, maxY + yPadding],
        };
    }, [aircraft?.cgEnvelope]);

    const handleStationWeightChange = (stationName: string, weight: number) => {
        setStations(prev => prev.map(s => s.name === stationName ? { ...s, weight } : s));
    };
    
    if (!aircraft || !booking) {
        return <Skeleton className="h-96 w-full" />
    }

    if (!aircraft.stationArms || !aircraft.cgEnvelope || aircraft.cgEnvelope.length === 0 || !aircraft.emptyWeight || !aircraft.emptyWeightMoment) {
        return (
            <div className="text-center p-6 border rounded-lg">
                <h2 className="text-xl font-semibold text-destructive">Incomplete Aircraft Configuration</h2>
                <p className="text-muted-foreground mt-2">This aircraft is missing critical mass &amp; balance information (e.g., station arms, CG envelope, empty weight). Please complete the aircraft's profile in the Assets section.</p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href={`/assets/${aircraft.id}`}>Go to Aircraft Profile</Link>
                </Button>
            </div>
        );
    }
    
    const renderRow = (label: string, weight: number, arm: number, moment: number) => {
        const displayArm = arm !== undefined && weight > 0 ? arm.toFixed(2) : 'N/A';
        const displayMoment = moment !== undefined && weight > 0 ? moment.toFixed(1) : '0.0';
        return (
             <div className="grid grid-cols-4 items-center gap-2">
                <div className="p-2 text-sm">{label}</div>
                <div className="p-2 text-sm text-right">{weight.toFixed(1)}</div>
                <div className="p-2 text-sm text-right">{displayArm}</div>
                <div className="p-2 text-sm text-right font-mono">{displayMoment}</div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 order-last lg:order-none">
                <Card>
                    <CardHeader>
                        <CardTitle>Mass &amp; Balance Summary</CardTitle>
                        <CardDescription>Review the calculated mass and center of gravity for booking #{booking.bookingNumber} on aircraft {aircraft.tailNumber}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border rounded-lg">
                            <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/40 rounded-t-lg">
                                <div className="p-2 text-sm">Item</div>
                                <div className="p-2 text-right text-sm">Weight (lbs)</div>
                                <div className="p-2 text-right text-sm">Arm (in)</div>
                                <div className="p-2 text-right text-sm">Moment (lb-in)</div>
                            </div>
                            <div className="divide-y">
                                {renderRow("Basic Empty Weight", calculation?.emptyWeight || 0, (calculation?.emptyMoment || 0) / (calculation?.emptyWeight || 1), calculation?.emptyMoment || 0)}
                                {calculation?.loadItems.map(item => renderRow(item.name, item.weight, item.arm, item.moment))}
                                 <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/20">
                                    <div className="p-2 text-sm">Zero Fuel Condition</div>
                                    <div className="p-2 text-right text-sm">{calculation?.zeroFuelWeight.toFixed(1)}</div>
                                    <div className="p-2 text-right text-sm">{calculation?.zeroFuelCg.toFixed(2)}</div>
                                    <div className="p-2 text-right text-sm font-mono">{calculation?.zeroFuelMoment.toFixed(1)}</div>
                                </div>
                                {renderRow("Fuel", calculation?.fuelWeight || 0, calculation?.fuelArm || 0, calculation?.fuelMoment || 0)}
                                <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/20 rounded-b-lg">
                                    <div className="p-2 text-sm">Takeoff Condition</div>
                                    <div className="p-2 text-right text-sm">{calculation?.takeoffWeight.toFixed(1)}</div>
                                    <div className="p-2 text-right text-sm">{calculation?.takeoffCg.toFixed(2)}</div>
                                    <div className="p-2 text-right text-sm font-mono">{calculation?.takeoffMoment.toFixed(1)}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative h-[400px]">
                            <ResponsiveContainer width="100%" height={400}>
                                <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 30 }} className="text-xs">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[domain.x[0], domain.x[1]]} allowDataOverflow={true} tickCount={8}>
                                        <RechartsLabel value="Center of Gravity (inches)" offset={-25} position="insideBottom" />
                                    </XAxis>
                                    <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[domain.y[0], domain.y[1]]} allowDataOverflow={true} tickCount={8}>
                                        <RechartsLabel value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                    </YAxis>
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Area type="linear" dataKey="y" data={cgEnvelopePoints} name="CG Limit" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} strokeWidth={2} />
                                    <Scatter name="Takeoff CG" data={[ { y: takeoffPoint.y, x: takeoffPoint.x } ]} fill={isTakeoffOk ? "#22c55e" : "#ef4444"}>
                                        {takeoffPoint &&
                                            <ReferenceDot
                                                x={takeoffPoint.x}
                                                y={takeoffPoint.y}
                                                r={8}
                                                fill={isTakeoffOk ? "#22c55e" : "#ef4444"}
                                                stroke="#fff"
                                                strokeWidth={2}
                                            >
                                                 <RechartsLabel 
                                                    value={`(${takeoffPoint.x.toFixed(2)}, ${takeoffPoint.y.toFixed(1)})`} 
                                                    position="top" 
                                                    fill="hsl(var(--foreground))"
                                                    fontSize="12"
                                                    offset={10}
                                                />
                                            </ReferenceDot>
                                        }
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                            <div className="absolute top-4 right-4">
                              <Badge className={cn(isTakeoffOk ? 'bg-green-600 hover:bg-green-600' : 'bg-destructive hover:bg-destructive', 'text-xs text-white px-2 py-0.5')}>
                                  {isTakeoffOk ? 'Within Limits' : 'Out of Limits'}
                              </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Load</CardTitle>
                        <CardDescription>Enter the weight for each station.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stations.map(station => (
                            <div key={station.name} className="space-y-2">
                                <Label htmlFor={station.name.replace(/\s+/g, '-')}>{station.name} (lbs)</Label>
                                <Input 
                                    type="number" 
                                    id={station.name.replace(/\s+/g, '-')} 
                                    value={station.weight || ''} 
                                    onChange={(e) => handleStationWeightChange(station.name, Number(e.target.value))} 
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Fuel</CardTitle>
                        <CardDescription>Enter fuel quantity for takeoff.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fuel-gallons">Fuel (Gallons)</Label>
                            <Input type="number" id="fuel-gallons" value={fuelGallons || ''} onChange={(e) => setFuelGallons(Number(e.target.value))} />
                        </div>
                         <div className="p-2 border rounded-md text-sm text-center bg-muted">
                            Fuel Weight: <strong>{(fuelGallons * FUEL_WEIGHT_PER_GALLON).toFixed(1)} lbs</strong>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
