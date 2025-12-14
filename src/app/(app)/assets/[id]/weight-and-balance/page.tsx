
'use client';

import { use, useMemo, useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  ReferenceDot,
  Cell,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isPointInPolygon } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface WeightAndBalancePageProps {
    params: { id: string };
}

const FUEL_WEIGHT_PER_GALLON = 6; // lbs
const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];


// --- HELPER 2: Visual Warning Component ---
const OffScreenWarning = ({ direction, value, label }: { direction: string, value: number, label: string }) => (
    <div className={`absolute top-1/2 ${direction === 'left' ? 'left-4' : 'right-4'} transform -translate-y-1/2 bg-destructive/90 border border-red-500 text-white p-3 rounded shadow-xl z-10 flex flex-col items-center animate-pulse`}>
      <AlertTriangle className="text-red-400 mb-1" size={24} />
      <span className="font-bold text-xs uppercase">{label} Off Scale!</span>
      <span className="text-lg font-mono">{value}</span>
      <span className="text-xs text-muted-foreground">
        {direction === 'left' ? '← Move Left' : 'Move Right →'}
      </span>
    </div>
  );


export default function WeightAndBalancePage({ params }: WeightAndBalancePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;

    // --- State for Inputs ---
    const [frontSeatWeight, setFrontSeatWeight] = useState(0);
    const [rearSeatWeight, setRearSeatWeight] = useState(0);
    const [baggage1Weight, setBaggage1Weight] = useState(0);
    const [baggage2Weight, setBaggage2Weight] = useState(0);
    const [fuelGallons, setFuelGallons] = useState(0);
    
    // --- Data Fetching ---
    const aircraftDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null), [firestore, tenantId, aircraftId]);
    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);
    
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
        
        const zeroFuelWeight = emptyWeight + frontSeatWeight + rearSeatWeight + baggage1Weight + baggage2Weight;
        const zeroFuelMoment = emptyMoment + frontSeatMoment + rearSeatMoment + baggage1Moment + baggage2Moment;
        const zeroFuelCg = zeroFuelWeight > 0 ? zeroFuelMoment / zeroFuelWeight : 0;

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

    const cgEnvelopePoints = useMemo(() => aircraft?.cgEnvelope?.map(([weight, cg]) => ({ x: cg, y: weight })) || [], [aircraft]);
    const polygonForCheck = useMemo(() => cgEnvelopePoints.map(p => ({ x: p.x, y: p.y })), [cgEnvelopePoints]);

    const takeoffPoint = useMemo(() => ({ x: calculation?.takeoffCg || 0, y: calculation?.takeoffWeight || 0 }), [calculation]);

    const isTakeoffWeightOk = calculation && aircraft?.maxTakeoffWeight ? calculation.takeoffWeight <= aircraft.maxTakeoffWeight : true;
    const isTakeoffCgOk = calculation ? isPointInPolygon(takeoffPoint, polygonForCheck) : true;
    const isTakeoffOk = isTakeoffWeightOk && isTakeoffCgOk;


    if (isLoading) {
        return <div className="max-w-7xl mx-auto space-y-6"><Skeleton className="h-[80vh] w-full" /></div>;
    }
    
    if (error || !aircraft) {
        return <div className="text-destructive text-center p-6">Error: {error?.message || 'Aircraft data could not be loaded.'}</div>;
    }

    if (!aircraft.stationArms || !aircraft.cgEnvelope || !aircraft.emptyWeight || !aircraft.emptyWeightMoment) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 text-center p-6">
                <h2 className="text-xl font-semibold text-destructive">Incomplete Aircraft Configuration</h2>
                <p className="text-muted-foreground">This aircraft is missing critical weight & balance information (e.g., station arms, CG envelope, empty weight). Please complete the aircraft's profile in the Assets section.</p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href={`/assets/${aircraft.id}`}>Go to Aircraft Profile</Link>
                </Button>
            </div>
        );
    }
    
    const renderRow = (label: string, weight: number, arm: number | undefined, moment: number | undefined) => {
        return (
             <div className="grid grid-cols-4 items-center gap-2">
                <div className="p-2 text-sm">{label}</div>
                <div className="p-2 text-sm text-right">{weight.toFixed(1)}</div>
                <div className="p-2 text-sm text-right">{arm?.toFixed(2) || 'N/A'}</div>
                <div className="p-2 text-sm text-right font-mono">{moment?.toFixed(1) || 'N/A'}</div>
            </div>
        );
    }

    const domainX = [Math.min(...cgEnvelopePoints.map(p => p.x)) - 1, Math.max(...cgEnvelopePoints.map(p => p.x)) + 1];
    const domainY = [Math.min(...cgEnvelopePoints.map(p => p.y)) - 100, Math.max(...cgEnvelopePoints.map(p => p.y)) + 100];
    
    const isOffScreen = () => {
        if (takeoffPoint.x < domainX[0]) return { axis: 'x', dir: 'left', val: takeoffPoint.x };
        if (takeoffPoint.x > domainX[1]) return { axis: 'x', dir: 'right', val: takeoffPoint.x };
        if (takeoffPoint.y < domainY[0]) return { axis: 'y', dir: 'bottom', val: takeoffPoint.y };
        if (takeoffPoint.y > domainY[1]) return { axis: 'y', dir: 'top', val: takeoffPoint.y };
        return null;
    };

    const offScreenStatus = isOffScreen();
    
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <Button asChild variant="outline" size="sm">
                <Link href={`/assets/${aircraftId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Aircraft Details
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
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>Weight & Balance Summary</CardTitle>
                            <CardDescription>Review the calculated weight and center of gravity for {aircraft.tailNumber}.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-grow">
                            <div className="border rounded-lg">
                                <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/40 rounded-t-lg">
                                    <div className="p-2 text-sm">Item</div>
                                    <div className="p-2 text-right text-sm">Weight (lbs)</div>
                                    <div className="p-2 text-right text-sm">Arm (in)</div>
                                    <div className="p-2 text-right text-sm">Moment (lb-in)</div>
                                </div>
                                <div className="divide-y">
                                    {renderRow("Basic Empty Weight", calculation?.emptyWeight || 0, (calculation?.emptyMoment || 0) / (calculation?.emptyWeight || 1), calculation?.emptyMoment)}
                                    {renderRow("Front Seats", frontSeatWeight, calculation?.arms.frontSeats, calculation?.frontSeatMoment)}
                                    {renderRow("Rear Seats", rearSeatWeight, calculation?.arms.rearSeats, calculation?.rearSeatMoment)}
                                    {renderRow("Baggage 1", baggage1Weight, calculation?.arms.baggage1, calculation?.baggage1Moment)}
                                    {renderRow("Baggage 2", baggage2Weight, calculation?.arms.baggage2, calculation?.baggage2Moment)}
                                     <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/20">
                                        <div className="p-2 text-sm">Zero Fuel Condition</div>
                                        <div className="p-2 text-right text-sm">{calculation?.zeroFuelWeight.toFixed(1)}</div>
                                        <div className="p-2 text-right text-sm">{calculation?.zeroFuelCg.toFixed(2)}</div>
                                        <div className="p-2 text-right text-sm font-mono">{calculation?.zeroFuelMoment.toFixed(1)}</div>
                                    </div>
                                    {renderRow("Fuel", calculation?.fuelWeight || 0, calculation?.arms.fuel, calculation?.fuelMoment)}
                                    <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/20 rounded-b-lg">
                                        <div className="p-2 text-sm">Takeoff Condition</div>
                                        <div className="p-2 text-right text-sm">{calculation?.takeoffWeight.toFixed(1)}</div>
                                        <div className="p-2 text-right text-sm">{calculation?.takeoffCg.toFixed(2)}</div>
                                        <div className="p-2 text-right text-sm font-mono">{calculation?.takeoffMoment.toFixed(1)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className='flex justify-center'>
                                <Badge className={cn(isTakeoffOk ? 'bg-green-600 hover:bg-green-600' : 'bg-destructive hover:bg-destructive', 'text-lg text-white px-6 py-2')}>
                                    {isTakeoffOk ? 'Takeoff Within Limits' : 'Takeoff Out of Limits'}
                                </Badge>
                            </div>
                            <div className="relative h-[400px]">
                                {offScreenStatus && (
                                    <OffScreenWarning 
                                        direction={offScreenStatus.dir} 
                                        value={offScreenStatus.val} 
                                        label={offScreenStatus.axis === 'x' ? 'CG' : 'Weight'} 
                                    />
                                )}
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={domainX} allowDataOverflow={true}>
                                            <RechartsLabel value="Center of Gravity (inches)" offset={-25} position="insideBottom" dy={10} />
                                        </XAxis>
                                        <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={domainY} allowDataOverflow={true} >
                                             <RechartsLabel value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                        </YAxis>
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter name="Envelope" data={cgEnvelopePoints} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} fill="transparent" shape={() => null} />
                                        
                                        {cgEnvelopePoints.map((p, index) => (
                                          <ReferenceDot key={`dot-${index}`} x={p.x} y={p.y} r={5} fill={POINT_COLORS[index % POINT_COLORS.length]} stroke="none" />
                                        ))}

                                        <ReferenceDot x={takeoffPoint.x} y={takeoffPoint.y} r={8} fill={isTakeoffOk ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stroke="hsl(var(--primary-foreground))" strokeWidth={2} />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-muted-foreground w-full text-center">Disclaimer: This calculator is for educational purposes only. Always consult the official aircraft POH for flight planning.</p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

