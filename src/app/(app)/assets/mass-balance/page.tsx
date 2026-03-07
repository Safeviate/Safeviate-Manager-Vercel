
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot, Cell } from 'recharts';
import { doc, collection } from "firebase/firestore";
import { useFirestore, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { isPointInPolygon } from '@/lib/utils';
import { Save, RotateCcw, Fuel, AlertTriangle, ArrowLeft, Scale } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];
const FUEL_WEIGHT_PER_GALLON = 6;

const generateNiceTicks = (min: number | string, max: number | string, stepCount = 6) => {
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
  return ticks;
};

function WBCalculatorContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const aircraftId = searchParams.get('aircraftId');
  const bookingId = searchParams.get('bookingId');
  const tenantId = 'safeviate';

  const aircraftRef = useMemo(() => (firestore && aircraftId ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null), [firestore, aircraftId]);
  const bookingRef = useMemo(() => (firestore && bookingId ? doc(firestore, `tenants/${tenantId}/bookings`, bookingId) : null), [firestore, bookingId]);

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

  // --- STATE ---
  const [graphConfig, setGraphConfig] = useState({
    xMin: 70, xMax: 100, yMin: 1000, yMax: 3000,
    envelope: [] as { x: number, y: number }[]
  });

  const [basicEmpty, setBasicEmpty] = useState({ weight: 0, moment: 0, arm: 0 });
  const [stations, setStations] = useState<any[]>([]);
  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

  // Initialize from Aircraft
  useEffect(() => {
    if (aircraft && aircraft.cgEnvelope) {
      const envelope = aircraft.cgEnvelope.map(p => ({ x: p.cg, y: p.weight }));
      setGraphConfig({
        xMin: Math.min(...envelope.map(p => p.x)) - 2,
        xMax: Math.max(...envelope.map(p => p.x)) + 2,
        yMin: Math.min(...envelope.map(p => p.y)) - 200,
        yMax: Math.max(...envelope.map(p => p.y)) + 200,
        envelope,
      });

      const arm = aircraft.emptyWeight && aircraft.emptyWeight > 0 ? aircraft.emptyWeightMoment! / aircraft.emptyWeight : 0;
      setBasicEmpty({
        weight: aircraft.emptyWeight || 0,
        moment: aircraft.emptyWeightMoment || 0,
        arm: parseFloat(arm.toFixed(2)),
      });

      setStations(aircraft.stations || []);
    }
  }, [aircraft]);

  // Calculate Results
  useEffect(() => {
    let totalMom = parseFloat(String(basicEmpty.moment)) || 0;
    let totalWt = parseFloat(String(basicEmpty.weight)) || 0;

    stations.forEach(st => {
      const wt = parseFloat(String(st.weight)) || 0;
      const arm = parseFloat(String(st.arm)) || 0;
      totalWt += wt;
      totalMom += (wt * arm);
    });

    const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
    const safe = graphConfig.envelope.length > 2
        ? isPointInPolygon({ x: cg, y: totalWt }, graphConfig.envelope)
        : false;

    setResults({
      cg: parseFloat(cg.toFixed(2)),
      weight: parseFloat(totalWt.toFixed(1)),
      isSafe: safe
    });
  }, [stations, basicEmpty, graphConfig.envelope]);

  const handleWeightChange = (id: number, value: string) => {
    const val = parseFloat(value) || 0;
    setStations(stations.map(s => {
      if (s.id !== id) return s;
      if (s.type === 'fuel') return { ...s, weight: val, gallons: parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
      return { ...s, weight: val };
    }));
  };

  const handleGallonsChange = (id: number, value: string) => {
    const val = parseFloat(value) || 0;
    setStations(stations.map(s => {
      if (s.id !== id || s.type !== 'fuel') return s;
      return { ...s, gallons: val, weight: val * FUEL_WEIGHT_PER_GALLON };
    }));
  };

  const handleSaveToBooking = () => {
    if (!bookingRef) return;
    updateDocumentNonBlocking(bookingRef, {
        massAndBalance: {
            takeoffWeight: results.weight,
            takeoffCg: results.cg,
            isWithinLimits: results.isSafe,
        }
    });
    toast({ title: "M&B Saved to Booking", description: `Takeoff: ${results.weight} lbs @ ${results.cg} in` });
  };

  if (isLoadingAircraft || isLoadingBooking) return <Skeleton className="h-[600px] w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft profile not found.</div>;

  const allX = [...graphConfig.envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
  const allY = [...graphConfig.envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
  const finalXMin = allX.length > 0 ? Math.min(graphConfig.xMin, ...allX) - 1 : 70;
  const finalXMax = allX.length > 0 ? Math.max(graphConfig.xMax, ...allX) + 1 : 100;
  const finalYMin = allY.length > 0 ? Math.min(graphConfig.yMin, ...allY) - 100 : 1000;
  const finalYMax = allY.length > 0 ? Math.max(graphConfig.yMax, ...allY) + 100 : 3000;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Mass & Balance</h1>
                <p className="text-sm text-muted-foreground">{aircraft.tailNumber} ({aircraft.model}) {booking ? `• Booking #${booking.bookingNumber}` : ''}</p>
            </div>
        </div>
        {booking && (
            <Button onClick={handleSaveToBooking} className="gap-2">
                <Save className="h-4 w-4" /> Save to Booking
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                CG Envelope
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[450px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={[finalXMin, finalXMax]} ticks={generateNiceTicks(finalXMin, finalXMax, 8)} allowDataOverflow={true}>
                            <Label value="CG (inches)" offset={0} position="insideBottom" dy={10} />
                        </XAxis>
                        <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={[finalYMin, finalYMax]} ticks={generateNiceTicks(finalYMin, finalYMax, 8)} allowDataOverflow={true}>
                            <Label value="Weight (lbs)" angle={-90} position="insideLeft" />
                        </YAxis>
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Envelope" data={graphConfig.envelope} fill="transparent" line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} isAnimationActive={false} />
                        <Scatter name="Current Load" data={[{ x: results.cg, y: results.weight }]} isAnimationActive={false}>
                            <ReferenceDot x={results.cg} y={results.weight} r={10} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={3} />
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
                <div className={cn("absolute bottom-12 right-8 px-6 py-2 rounded-full font-bold shadow-lg text-white", results.isSafe ? 'bg-green-600' : 'bg-red-600')}>
                    {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS"}
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Results</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Weight</p>
                        <p className="text-2xl font-bold">{results.weight} <span className="text-sm font-normal">lbs</span></p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">CG</p>
                        <p className="text-2xl font-bold">{results.cg} <span className="text-sm font-normal">in</span></p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Loading Stations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase px-1">
                        <span>Station</span>
                        <span className="w-24 text-right">Weight (lbs)</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-transparent">
                            <span className="text-sm font-medium">Basic Empty Weight</span>
                            <span className="text-sm font-bold">{basicEmpty.weight}</span>
                        </div>
                        {stations.map(s => (
                            <div key={s.id} className="space-y-2 pb-2 border-b last:border-0">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">{s.name}</Label>
                                    <Input
                                        type="number"
                                        value={s.weight || ''}
                                        onChange={(e) => handleWeightChange(s.id, e.target.value)}
                                        className="w-24 h-8 text-right"
                                    />
                                </div>
                                {s.type === 'fuel' && (
                                    <div className="flex items-center gap-2 pl-4">
                                        <Fuel className="h-3 w-3 text-yellow-500" />
                                        <Input
                                            type="number"
                                            value={s.gallons || ''}
                                            onChange={(e) => handleGallonsChange(s.id, e.target.value)}
                                            className="w-16 h-7 text-xs text-right bg-transparent border-dashed"
                                        />
                                        <span className="text-[10px] text-muted-foreground uppercase">Gal</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max={s.maxGallons || 50}
                                            value={s.gallons || 0}
                                            onChange={(e) => handleGallonsChange(s.id, e.target.value)}
                                            className="flex-1 h-1 accent-yellow-500"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

export default function WBCalculatorPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <WBCalculatorContent />
        </Suspense>
    );
}
