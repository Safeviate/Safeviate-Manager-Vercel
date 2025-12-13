'use client';

import { use, useMemo, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Polygon, ComposedChart, Scatter } from 'recharts';
import { cn } from '@/lib/utils';

interface WeightAndBalancePageProps {
    params: { id: string };
}

const FUEL_WEIGHT_PER_GALLON = 6; // lbs

export default function WeightAndBalancePage({ params }: WeightAndBalancePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;
    
    // Form state
    const [frontSeatsWeight, setFrontSeatsWeight] = useState(0);
    const [rearSeatsWeight, setRearSeatsWeight] = useState(0);
    const [baggage1Weight, setBaggage1Weight] = useState(0);
    const [baggage2Weight, setBaggage2Weight] = useState(0);
    const [fuelGallons, setFuelGallons] = useState(0);
    const [tripFuelGallons, setTripFuelGallons] = useState(0);

    const bookingDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null),
        [firestore, tenantId, bookingId]
    );

    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<Booking>(bookingDocRef);

    const aircraftDocRef = useMemoFirebase(
        () => (firestore && booking ? doc(firestore, 'tenants', tenantId, 'aircrafts', booking.aircraftId) : null),
        [firestore, tenantId, booking]
    );
    
    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftDocRef);
    
    const isLoading = isLoadingBooking || isLoadingAircraft;
    const error = bookingError || aircraftError;
    
    const calculation = useMemo(() => {
        if (!aircraft || !aircraft.stationArms) return null;

        const emptyWeight = aircraft.emptyWeight || 0;
        const emptyMoment = aircraft.emptyWeightMoment || 0;
        const arms = aircraft.stationArms || {};
        
        const fuelWeight = fuelGallons * FUEL_WEIGHT_PER_GALLON;
        const tripFuelWeight = tripFuelGallons * FUEL_WEIGHT_PER_GALLON;

        const stations = [
            { name: 'Empty Weight', weight: emptyWeight, arm: emptyMoment / (emptyWeight || 1), moment: emptyMoment },
            { name: 'Front Seats', weight: frontSeatsWeight, arm: arms.frontSeats || 0, moment: frontSeatsWeight * (arms.frontSeats || 0) },
            { name: 'Rear Seats', weight: rearSeatsWeight, arm: arms.rearSeats || 0, moment: rearSeatsWeight * (arms.rearSeats || 0) },
            { name: 'Baggage 1', weight: baggage1Weight, arm: arms.baggage1 || 0, moment: baggage1Weight * (arms.baggage1 || 0) },
            { name: 'Baggage 2', weight: baggage2Weight, arm: arms.baggage2 || 0, moment: baggage2Weight * (arms.baggage2 || 0) },
            { name: 'Fuel', weight: fuelWeight, arm: arms.fuel || 0, moment: fuelWeight * (arms.fuel || 0) },
        ];

        const takeoffWeight = stations.reduce((acc, s) => acc + s.weight, 0);
        const takeoffMoment = stations.reduce((acc, s) => acc + s.moment, 0);
        const takeoffCg = takeoffMoment / (takeoffWeight || 1);

        const landingWeight = takeoffWeight - tripFuelWeight;
        const landingMoment = takeoffMoment - (tripFuelWeight * (arms.fuel || 0));
        const landingCg = landingMoment / (landingWeight || 1);

        // Check if within limits
        const isPointInPolygon = (point: [number, number], polygon: [number, number][]) => {
            let [x, y] = point; // CG, Weight
            let isInside = false;
             if (!polygon || polygon.length === 0) return false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                let [yi, xi] = polygon[i]; // Weight, CG
                let [yj, xj] = polygon[j]; // Weight, CG
                let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) isInside = !isInside;
            }
            return isInside;
        };
        
        const cgEnvelope = aircraft.cgEnvelope || [];
        // The points are stored as [weight, cg] but the function expects [cg, weight]
        const isTakeoffCgOk = isPointInPolygon([takeoffCg, takeoffWeight], cgEnvelope.map(p => [p[1], p[0]]));
        const isLandingCgOk = isPointInPolygon([landingCg, landingWeight], cgEnvelope.map(p => [p[1], p[0]]));
        const isTakeoffWeightOk = takeoffWeight <= (aircraft.maxTakeoffWeight || Infinity);
        const isLandingWeightOk = landingWeight <= (aircraft.maxLandingWeight || Infinity);

        return {
            stations,
            takeoffWeight, takeoffMoment, takeoffCg,
            landingWeight, landingMoment, landingCg,
            isTakeoffCgOk, isLandingCgOk, isTakeoffWeightOk, isLandingWeightOk,
        };
    }, [aircraft, frontSeatsWeight, rearSeatsWeight, baggage1Weight, baggage2Weight, fuelGallons, tripFuelGallons]);

    const chartData = useMemo(() => {
        if (!calculation || !aircraft?.cgEnvelope) return { envelope: [], points: [] };
        // cgEnvelope is [weight, cg], recharts needs it as object with keys
        const envelope = aircraft.cgEnvelope.map(([weight, cg]) => ({ cg, weight }));

        return {
            envelope: [...envelope, envelope[0]], // Close the polygon
            points: [
                { name: 'Takeoff', cg: calculation.takeoffCg, weight: calculation.takeoffWeight, fill: '#8884d8' },
                { name: 'Landing', cg: calculation.landingCg, weight: calculation.landingWeight, fill: '#82ca9d' }
            ]
        }
    }, [calculation, aircraft]);


    if (isLoading) {
        return <div className="max-w-6xl mx-auto space-y-6"><Skeleton className="h-[80vh] w-full" /></div>;
    }
    
    if (error || !booking || !aircraft) {
        return <div className="text-destructive text-center">Error: {error?.message || 'Booking or Aircraft data could not be loaded.'}</div>;
    }

    if (!aircraft.stationArms || !aircraft.cgEnvelope || aircraft.cgEnvelope.length < 3) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/operations/bookings/${bookingId}/checklist`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Checklist
                        </Link>
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Configuration Incomplete</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">The weight and balance parameters (station arms, CG envelope) have not been configured for this aircraft ({aircraft.tailNumber}). Please edit the aircraft in the Assets section to add this information.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const ResultIndicator = ({ isOk, label }: { isOk: boolean, label: string }) => (
        <div className={cn("flex items-center gap-2 p-3 rounded-lg text-lg font-semibold", isOk ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300')}>
            {isOk ? <CheckCircle2 /> : <AlertTriangle />}
            <span>{label}: {isOk ? 'Within Limits' : 'OUT OF LIMITS'}</span>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
             <div>
                 <Button asChild variant="outline" size="sm">
                    <Link href={`/operations/bookings/${bookingId}/checklist`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Checklist
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Weight &amp; Balance Calculator</CardTitle>
                    <CardDescription>For aircraft {aircraft.tailNumber} on booking #{booking.bookingNumber}.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className='text-lg'>Load Distribution</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="front-seats">Front Seats (lbs)</Label>
                                    <Input id="front-seats" type="number" value={frontSeatsWeight} onChange={e => setFrontSeatsWeight(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rear-seats">Rear Seats (lbs)</Label>
                                    <Input id="rear-seats" type="number" value={rearSeatsWeight} onChange={e => setRearSeatsWeight(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="baggage1">Baggage 1 (lbs)</Label>
                                    <Input id="baggage1" type="number" value={baggage1Weight} onChange={e => setBaggage1Weight(Number(e.target.value))} />
                               </div>
                               <div className="space-y-2">
                                    <Label htmlFor="baggage2">Baggage 2 (lbs)</Label>
                                    <Input id="baggage2" type="number" value={baggage2Weight} onChange={e => setBaggage2Weight(Number(e.target.value))} />
                               </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle className='text-lg'>Fuel Calculation</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fuel">Fuel (Gallons)</Label>
                                    <Input id="fuel" type="number" value={fuelGallons} onChange={e => setFuelGallons(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="trip-fuel">Trip Fuel (Gallons)</Label>
                                    <Input id="trip-fuel" type="number" value={tripFuelGallons} onChange={e => setTripFuelGallons(Number(e.target.value))} />
                                </div>
                            </CardContent>
                        </Card>
                   </div>
                   <div className="space-y-6">
                       <Card>
                           <CardHeader><CardTitle className='text-lg'>Calculation Summary</CardTitle></CardHeader>
                           <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Station</TableHead>
                                            <TableHead className='text-right'>Weight (lbs)</TableHead>
                                            <TableHead className='text-right'>Arm (in)</TableHead>
                                            <TableHead className='text-right'>Moment (lb-in)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {calculation?.stations.map(s => (
                                            <TableRow key={s.name}>
                                                <TableCell>{s.name}</TableCell>
                                                <TableCell className='text-right'>{s.weight.toFixed(2)}</TableCell>
                                                <TableCell className='text-right'>{s.arm.toFixed(2)}</TableCell>
                                                <TableCell className='text-right'>{s.moment.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="font-bold bg-muted/50">
                                            <TableCell>Takeoff</TableCell>
                                            <TableCell className='text-right'>{calculation?.takeoffWeight.toFixed(2)}</TableCell>
                                            <TableCell className='text-right'>{calculation?.takeoffCg.toFixed(2)}</TableCell>
                                            <TableCell className='text-right'>{calculation?.takeoffMoment.toFixed(2)}</TableCell>
                                        </TableRow>
                                         <TableRow className="font-bold bg-muted/50">
                                            <TableCell>Landing</TableCell>
                                            <TableCell className='text-right'>{calculation?.landingWeight.toFixed(2)}</TableCell>
                                            <TableCell className='text-right'>{calculation?.landingCg.toFixed(2)}</TableCell>
                                            <TableCell className='text-right'>{calculation?.landingMoment.toFixed(2)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                           </CardContent>
                       </Card>
                       {calculation && (
                           <Card>
                               <CardHeader><CardTitle className='text-lg'>Results</CardTitle></CardHeader>
                               <CardContent className='space-y-2'>
                                   <ResultIndicator isOk={calculation.isTakeoffWeightOk} label="Takeoff Weight" />
                                   <ResultIndicator isOk={calculation.isLandingWeightOk} label="Landing Weight" />
                                   <ResultIndicator isOk={calculation.isTakeoffCgOk} label="Takeoff CG" />
                                   <ResultIndicator isOk={calculation.isLandingCgOk} label="Landing CG" />
                               </CardContent>
                           </Card>
                       )}
                   </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Center of Gravity Envelope</CardTitle>
                </CardHeader>
                <CardContent className="h-96 w-full pr-8">
                   <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                             margin={{
                                top: 20, right: 20, bottom: 20, left: 20,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                             <XAxis 
                                dataKey="cg" 
                                type="number" 
                                name="CG (in)" 
                                unit=" in"
                                domain={['dataMin - 1', 'dataMax + 1']}
                                label={{ value: "Center of Gravity (inches from datum)", position: 'insideBottom', offset: -15 }}
                            />
                            <YAxis 
                                dataKey="weight" 
                                type="number" 
                                name="Weight (lbs)" 
                                unit=" lbs"
                                domain={['dataMin - 200', 'dataMax + 200']}
                                width={80}
                                label={{ value: "Weight (lbs)", angle: -90, position: 'insideLeft' }}
                             />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                            
                            <Polygon 
                                data={chartData.envelope} 
                                dataKey="weight" 
                                stroke="#a0aec0" 
                                fill="#a0aec0" 
                                fillOpacity={0.2}
                                points={chartData.envelope.map(p => ({x: p.cg, y: p.weight}))}
                                name="CG Envelope" 
                            />
                           
                            <Scatter name="Takeoff" data={chartData.points.filter(p => p.name === 'Takeoff')} fill="#8884d8" shape="cross" />
                            <Scatter name="Landing" data={chartData.points.filter(p => p.name === 'Landing')} fill="#82ca9d" shape="triangle" />
                            
                            {aircraft.maxTakeoffWeight && <ReferenceLine y={aircraft.maxTakeoffWeight} label={{ value: `Max Takeoff: ${aircraft.maxTakeoffWeight} lbs`, position: 'insideTopLeft' }} stroke="red" strokeDasharray="3 3" />}
                            {aircraft.maxLandingWeight && <ReferenceLine y={aircraft.maxLandingWeight} label={{ value: `Max Landing: ${aircraft.maxLandingWeight} lbs`, position: 'insideTopLeft' }} stroke="orange" strokeDasharray="3 3" />}
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );

    