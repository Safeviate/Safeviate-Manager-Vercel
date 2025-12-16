'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Booking, MassAndBalance } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    aircraft: Aircraft;
    booking: Booking;
    onCalculationChange: (data: Omit<MassAndBalance, 'calculationTime'>) => void;
    initialData?: MassAndBalance | null;
}

export function BookingMassBalance({ aircraft, booking, onCalculationChange, initialData }: BookingMassBalanceProps) {
    
    // --- State for Inputs ---
    const [frontSeatWeight, setFrontSeatWeight] = useState(initialData?.frontSeatWeight || 0);
    const [rearSeatWeight, setRearSeatWeight] = useState(initialData?.rearSeatWeight || 0);
    const [baggage1Weight, setBaggage1Weight] = useState(initialData?.baggage1Weight || 0);
    const [baggage2Weight, setBaggage2Weight] = useState(initialData?.baggage2Weight || 0);
    const [fuelGallons, setFuelGallons] = useState(initialData?.fuelGallons || 0);

    // --- Effect to update state if initialData changes ---
    useEffect(() => {
        if (initialData) {
            setFrontSeatWeight(initialData.frontSeatWeight || 0);
            setRearSeatWeight(initialData.rearSeatWeight || 0);
            setBaggage1Weight(initialData.baggage1Weight || 0);
            setBaggage2Weight(initialData.baggage2Weight || 0);
            setFuelGallons(initialData.fuelGallons || 0);
        }
    }, [initialData]);
    
    // --- Calculations ---
    const calculation = useMemo(() => {
        if (!aircraft || !aircraft.stationArms) return null;

        const emptyWeight = aircraft.emptyWeight || 0;
        const emptyMoment = aircraft.emptyWeightMoment || 0;
        const arms = aircraft.stationArms;

        const frontSeatMoment = frontSeatWeight * (arms.frontSeats || 0);
        const rearSeatMoment = rearSeatWeight * (arms.rearSeats || 0);
        const baggage1Moment = baggage1Weight * (arms.baggage1 || 0);
        const baggage2Moment = baggage2Weight * (arms.baggage2 || 0);
        
        // Zero Fuel Condition
        const zeroFuelWeight = emptyWeight + frontSeatWeight + rearSeatWeight + baggage1Weight + baggage2Weight;
        const zeroFuelMoment = emptyMoment + frontSeatMoment + rearSeatMoment + baggage1Moment + baggage2Moment;
        const zeroFuelCg = zeroFuelWeight > 0 ? zeroFuelMoment / zeroFuelWeight : 0;

        // Takeoff Condition
        const fuelWeight = fuelGallons * FUEL_WEIGHT_PER_GALLON;
        const fuelMoment = fuelWeight * (arms.fuel || 0);
        const takeoffWeight = zeroFuelWeight + fuelWeight;
        const takeoffMoment = zeroFuelMoment + fuelMoment;
        const takeoffCg = takeoffWeight > 0 ? takeoffMoment / takeoffWeight : 0;

        return {
            emptyWeight, emptyMoment, arms,
            frontSeatMoment, rearSeatMoment, baggage1Moment, baggage2Moment,
            zeroFuelWeight, zeroFuelCg, zeroFuelMoment,
            fuelWeight, fuelMoment,
            takeoffWeight, takeoffCg, takeoffMoment,
        };
    }, [aircraft, frontSeatWeight, rearSeatWeight, baggage1Weight, baggage2Weight, fuelGallons]);
    
    // --- Effect to notify parent of changes ---
    useEffect(() => {
        if (calculation) {
            onCalculationChange({
                frontSeatWeight,
                rearSeatWeight,
                baggage1Weight,
                baggage2Weight,
                fuelGallons,
                takeoffWeight: calculation.takeoffWeight,
                takeoffCg: calculation.takeoffCg,
            })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calculation]);


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
    
    const renderRow = (label: string, weight: number, arm: number | undefined, moment: number | undefined) => {
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
                                {calculation?.arms.frontSeats && renderRow("Front Seats", frontSeatWeight, calculation.arms.frontSeats, calculation.frontSeatMoment)}
                                {calculation?.arms.rearSeats && renderRow("Rear Seats", rearSeatWeight, calculation.arms.rearSeats, calculation.rearSeatMoment)}
                                {calculation?.arms.baggage1 && renderRow("Baggage 1", baggage1Weight, calculation.arms.baggage1, calculation.baggage1Moment)}
                                {calculation?.arms.baggage2 && renderRow("Baggage 2", baggage2Weight, calculation.arms.baggage2, calculation.baggage2Moment)}
                                 <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/20">
                                    <div className="p-2 text-sm">Zero Fuel Condition</div>
                                    <div className="p-2 text-right text-sm">{calculation?.zeroFuelWeight.toFixed(1)}</div>
                                    <div className="p-2 text-right text-sm">{calculation?.zeroFuelCg.toFixed(2)}</div>
                                    <div className="p-2 text-right text-sm font-mono">{calculation?.zeroFuelMoment.toFixed(1)}</div>
                                </div>
                                {renderRow("Fuel", calculation?.fuelWeight || 0, calculation?.arms.fuel, calculation?.fuelMoment || 0)}
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
                                    <Area type="linear" dataKey="y" data={cgEnvelopePoints} name="CG Limit" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
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
                        {aircraft.stationArms?.frontSeats && (
                            <div className="space-y-2">
                                <Label htmlFor="front-seat">Front Seats (lbs)</Label>
                                <Input 
                                    type="number" 
                                    id="front-seat"
                                    value={frontSeatWeight || ''}
                                    onChange={(e) => setFrontSeatWeight(Number(e.target.value))}
                                />
                            </div>
                        )}
                        {aircraft.stationArms?.rearSeats && (
                            <div className="space-y-2">
                                <Label htmlFor="rear-seat">Rear Seats (lbs)</Label>
                                <Input
                                    type="number"
                                    id="rear-seat"
                                    value={rearSeatWeight || ''}
                                    onChange={(e) => setRearSeatWeight(Number(e.target.value))}
                                />
                            </div>
                        )}
                        {aircraft.stationArms?.baggage1 && (
                            <div className="space-y-2">
                                <Label htmlFor="baggage-1">Baggage 1 (lbs)</Label>
                                <Input
                                    type="number"
                                    id="baggage-1"
                                    value={baggage1Weight || ''}
                                    onChange={(e) => setBaggage1Weight(Number(e.target.value))}
                                />
                            </div>
                        )}
                        {aircraft.stationArms?.baggage2 && (
                             <div className="space-y-2">
                                <Label htmlFor="baggage-2">Baggage 2 (lbs)</Label>
                                <Input
                                    type="number"
                                    id="baggage-2"
                                    value={baggage2Weight || ''}
                                    onChange={(e) => setBaggage2Weight(Number(e.target.value))}
                                />
                            </div>
                        )}
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
                            <Input
                                type="number"
                                id="fuel-gallons"
                                value={fuelGallons || ''}
                                onChange={(e) => setFuelGallons(Number(e.target.value))}
                            />
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
