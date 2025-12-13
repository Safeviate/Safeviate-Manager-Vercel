
'use client';

import { use, useMemo, useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
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
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WeightAndBalancePageProps {
    params: { id: string };
}

const FUEL_WEIGHT_PER_GALLON = 6; // lbs

// --- Helper function to check if a point is inside a polygon ---
function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  if (polygon.length === 0) return false;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}


export default function WeightAndBalancePage({ params }: WeightAndBalancePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;

    // --- State for Inputs ---
    const [frontSeatWeight, setFrontSeatWeight] = useState(0);
    const [rearSeatWeight, setRearSeatWeight] = useState(0);
    const [baggage1Weight, setBaggage1Weight] = useState(0);
    const [baggage2Weight, setBaggage2Weight] = useState(0);
    const [fuelGallons, setFuelGallons] = useState(0);
    
    // --- Data Fetching ---
    const bookingDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null), [firestore, tenantId, bookingId]);
    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<Booking>(bookingDocRef);

    const aircraftDocRef = useMemoFirebase(() => (firestore && booking ? doc(firestore, 'tenants', tenantId, 'aircrafts', booking.aircraftId) : null), [firestore, tenantId, booking]);
    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftDocRef);
    
    const isLoading = isLoadingBooking || isLoadingAircraft;
    const error = bookingError || aircraftError;
    
    // --- Calculations ---
    const calculation = useMemo(() => {
        if (!aircraft || !aircraft.stationArms) return null;

        const emptyWeight = aircraft.emptyWeight || 0;
        const emptyMoment = aircraft.emptyWeightMoment || 0;
        const arms = aircraft.stationArms;

        // Zero Fuel Condition
        const zeroFuelWeight = emptyWeight + frontSeatWeight + rearSeatWeight + baggage1Weight + baggage2Weight;
        const frontSeatMoment = frontSeatWeight * (arms.frontSeats || 0);
        const rearSeatMoment = rearSeatWeight * (arms.rearSeats || 0);
        const baggage1Moment = baggage1Weight * (arms.baggage1 || 0);
        const baggage2Moment = baggage2Weight * (arms.baggage2 || 0);
        const zeroFuelMoment = emptyMoment + frontSeatMoment + rearSeatMoment + baggage1Moment + baggage2Moment;
        const zeroFuelCg = zeroFuelMoment / (zeroFuelWeight || 1);

        // Takeoff Condition
        const fuelWeight = fuelGallons * FUEL_WEIGHT_PER_GALLON;
        const takeoffWeight = zeroFuelWeight + fuelWeight;
        const fuelMoment = fuelWeight * (arms.fuel || 0);
        const takeoffMoment = zeroFuelMoment + fuelMoment;
        const takeoffCg = takeoffMoment / (takeoffWeight || 1);

        return {
            emptyWeight, emptyMoment, arms,
            zeroFuelWeight, zeroFuelCg, zeroFuelMoment,
            takeoffWeight, takeoffCg, takeoffMoment,
        };
    }, [aircraft, frontSeatWeight, rearSeatWeight, baggage1Weight, baggage2Weight, fuelGallons]);

    const cgEnvelopePoints = useMemo(() => aircraft?.cgEnvelope?.map(([weight, cg]) => ({ weight, cg })) || [], [aircraft]);

    const takeoffPoint = useMemo(() => ({ x: calculation?.takeoffCg || 0, y: calculation?.takeoffWeight || 0 }), [calculation]);

    const isTakeoffWeightOk = calculation && aircraft?.maxTakeoffWeight ? calculation.takeoffWeight <= aircraft.maxTakeoffWeight : true;
    const polygonForCheck = useMemo(() => cgEnvelopePoints.map(p => ({ x: p.cg, y: p.weight })), [cgEnvelopePoints]);
    const isTakeoffCgOk = calculation ? isPointInPolygon(takeoffPoint, polygonForCheck) : true;
    const isTakeoffOk = isTakeoffWeightOk && isTakeoffCgOk;


    if (isLoading) {
        return <div className="max-w-7xl mx-auto space-y-6"><Skeleton className="h-[80vh] w-full" /></div>;
    }
    
    if (error || !booking || !aircraft) {
        return <div className="text-destructive text-center">Error: {error?.message || 'Booking or Aircraft data could not be loaded.'}</div>;
    }
    
    const renderRow = (label: string, weight: number, arm: number | undefined, moment: number | undefined) => {
        return (
             <div className="grid grid-cols-4 items-center gap-2">
                <div className="p-2 text-sm">{label}</div>
                <div className="p-2 text-sm text-right">{weight.toFixed(1)}</div>
                <div className="p-2 text-sm text-right">{arm?.toFixed(2) || 'N/A'}</div>
                <div className="p-2 text-sm text-right">{moment?.toFixed(1) || 'N/A'}</div>
            </div>
        );
    }
    
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <Button asChild variant="outline" size="sm">
                <Link href={`/operations/bookings/${bookingId}/checklist`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Checklist
                </Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Load</CardTitle>
                            <CardDescription>Enter the weight for each station.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="front-seat">Front Seats (lbs)</Label>
                                <Input type="number" id="front-seat" value={frontSeatWeight || ''} onChange={(e) => setFrontSeatWeight(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rear-seat">Rear Seats (lbs)</Label>
                                <Input type="number" id="rear-seat" value={rearSeatWeight || ''} onChange={(e) => setRearSeatWeight(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="baggage-1">Baggage 1 (lbs)</Label>
                                <Input type="number" id="baggage-1" value={baggage1Weight || ''} onChange={(e) => setBaggage1Weight(Number(e.target.value))} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="baggage-2">Baggage 2 (lbs)</Label>
                                <Input type="number" id="baggage-2" value={baggage2Weight || ''} onChange={(e) => setBaggage2Weight(Number(e.target.value))} />
                            </div>
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

                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Weight & Balance Summary</CardTitle>
                            <CardDescription>Review the calculated weight and center of gravity.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="border rounded-lg">
                                <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/40 rounded-t-lg">
                                    <div className="p-2">Item</div>
                                    <div className="p-2 text-right">Weight (lbs)</div>
                                    <div className="p-2 text-right">Arm (in)</div>
                                    <div className="p-2 text-right">Moment (lb-in)</div>
                                </div>
                                <div className="divide-y">
                                    {renderRow("Basic Empty Weight", calculation?.emptyWeight || 0, (calculation?.emptyMoment || 0) / (calculation?.emptyWeight || 1), calculation?.emptyMoment)}
                                    {renderRow("Front Seats", frontSeatWeight, calculation?.arms.frontSeats, frontSeatWeight * (calculation?.arms.frontSeats || 0))}
                                    {renderRow("Rear Seats", rearSeatWeight, calculation?.arms.rearSeats, rearSeatWeight * (calculation?.arms.rearSeats || 0))}
                                    {renderRow("Baggage 1", baggage1Weight, calculation?.arms.baggage1, baggage1Weight * (calculation?.arms.baggage1 || 0))}
                                    {renderRow("Baggage 2", baggage2Weight, calculation?.arms.baggage2, baggage2Weight * (calculation?.arms.baggage2 || 0))}
                                     <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/20">
                                        <div className="p-2">Zero Fuel Condition</div>
                                        <div className="p-2 text-right">{calculation?.zeroFuelWeight.toFixed(1)}</div>
                                        <div className="p-2 text-right">{calculation?.zeroFuelCg.toFixed(2)}</div>
                                        <div className="p-2 text-right">{calculation?.zeroFuelMoment.toFixed(1)}</div>
                                    </div>
                                    {renderRow("Fuel", fuelGallons * FUEL_WEIGHT_PER_GALLON, calculation?.arms.fuel, (fuelGallons * FUEL_WEIGHT_PER_GALLON) * (calculation?.arms.fuel || 0))}
                                    <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/20">
                                        <div className="p-2">Takeoff Condition</div>
                                        <div className="p-2 text-right">{calculation?.takeoffWeight.toFixed(1)}</div>
                                        <div className="p-2 text-right">{calculation?.takeoffCg.toFixed(2)}</div>
                                        <div className="p-2 text-right">{calculation?.takeoffMoment.toFixed(1)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className='flex justify-center'>
                                <Badge className={cn(isTakeoffOk ? 'bg-green-600 hover:bg-green-600' : 'bg-destructive hover:bg-destructive', 'text-lg text-white px-6 py-2')}>
                                    {isTakeoffOk ? 'Takeoff Within Limits' : 'Takeoff Out of Limits'}
                                </Badge>
                            </div>
                            <ResponsiveContainer width="100%" height={400}>
                                <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="cg" name="CG" unit=" in" domain={['dataMin - 1', 'dataMax + 1']} tickCount={8}>
                                        <RechartsLabel value="Center of Gravity (inches)" offset={-25} position="insideBottom" />
                                    </XAxis>
                                    <YAxis type="number" dataKey="weight" name="Weight" unit=" lbs" domain={['dataMin - 100', 'dataMax + 100']}>
                                         <RechartsLabel value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                    </YAxis>
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Area type="linear" dataKey="weight" data={cgEnvelopePoints} name="CG Limit" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} strokeWidth={2} />
                                    <Scatter name="Takeoff CG" data={[ { weight: takeoffPoint.y, cg: takeoffPoint.x } ]} fill={isTakeoffOk ? "#22c55e" : "#ef4444"} shape="star" size={150} />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
