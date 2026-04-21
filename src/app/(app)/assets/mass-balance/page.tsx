'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { isPointInPolygon } from '@/lib/utils';
import { Save, RotateCcw, Fuel, AlertTriangle, ArrowLeft, Scale, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IndustryRouteGuard } from '@/components/industry-route-guard';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import { MassBalanceEnvelopeChart } from '@/components/mass-balance-envelope-chart';
import { HEADER_ACTION_BUTTON_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';

const FUEL_WEIGHT_PER_GALLON = 6;

function WBCalculatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const aircraftId = searchParams.get('aircraftId');
  const bookingId = searchParams.get('bookingId');

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE ---
  const [graphConfig, setGraphConfig] = useState({
    xMin: 70, xMax: 100, yMin: 1000, yMax: 3000,
    envelope: [] as { x: number, y: number }[]
  });

  const [basicEmpty, setBasicEmpty] = useState({ weight: 0, moment: 0, arm: 0 });
  const [stations, setStations] = useState<any[]>([]);
  const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

  const loadData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      aircraftId ? fetch(`/api/aircraft/${aircraftId}`, { cache: 'no-store' }) : Promise.resolve(null),
      bookingId ? fetch(`/api/bookings`, { cache: 'no-store' }) : Promise.resolve(null),
    ])
      .then(async ([aircraftResponse, bookingsResponse]) => {
        if (aircraftResponse) {
          const payload = await aircraftResponse.json().catch(() => ({ aircraft: null }));
          setAircraft((payload.aircraft as Aircraft | null) || null);
        } else {
          setAircraft(null);
        }

        if (bookingsResponse) {
          const payload = await bookingsResponse.json().catch(() => ({ bookings: [] }));
          const b = (payload.bookings as Booking[]).find(item => item.id === bookingId);
          setBooking(b || null);
        } else {
          setBooking(null);
        }
      })
      .catch((e) => {
        console.error("Failed to load M&B data", e);
        setAircraft(null);
        setBooking(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [aircraftId, bookingId]);

  useEffect(() => {
    loadData();
    window.addEventListener('safeviate-aircrafts-updated', loadData);
    window.addEventListener('safeviate-bookings-updated', loadData);
    return () => {
        window.removeEventListener('safeviate-aircrafts-updated', loadData);
        window.removeEventListener('safeviate-bookings-updated', loadData);
    };
  }, [loadData]);

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

      const arm = aircraft.emptyWeight && aircraft.emptyWeight > 0 ? (aircraft.emptyWeightMoment || 0) / aircraft.emptyWeight : 0;
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
    const roundedCg = parseFloat(cg.toFixed(2));
    const roundedWeight = parseFloat(totalWt.toFixed(1));
    const safe = graphConfig.envelope.length > 2
        ? isPointInPolygon({ x: roundedCg, y: roundedWeight }, graphConfig.envelope)
        : false;

    setResults({
      cg: roundedCg,
      weight: roundedWeight,
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
    if (!booking) return;
    fetch('/api/bookings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking: {
          ...booking,
          massAndBalance: {
            takeoffWeight: results.weight,
            takeoffCg: results.cg,
            isWithinLimits: results.isSafe,
          },
        },
      }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to record M&B data to the booking.');
        window.dispatchEvent(new Event('safeviate-bookings-updated'));
        toast({ title: "M&B Saved to Booking", description: `Takeoff: ${results.weight} lbs @ ${results.cg} in` });
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Failed to record M&B data to the booking.' });
      });
  };

  if (isLoading) return (
    <div className="max-w-[1100px] mx-auto w-full space-y-6 pt-4 px-1">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-[500px]" />
            <Skeleton className="h-[500px]" />
        </div>
    </div>
  );

  if (!aircraft) return (
    <div className="max-w-[1100px] mx-auto w-full text-center py-20 px-1">
        <div className="flex flex-col items-center gap-4 bg-muted/5 p-12 rounded-3xl border-2 border-dashed">
            <Scale className="h-16 w-16 text-muted-foreground opacity-20" />
            <div className="space-y-1">
                <p className="text-xl font-black uppercase tracking-tight">Aircraft Profile Missing</p>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground italic">Select an aircraft from the fleet to perform Mass & Balance calculations.</p>
            </div>
            <Button asChild variant="outline" className={`${HEADER_SECONDARY_BUTTON_CLASS} mt-4`} onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </div>
    </div>
  );

  // Keep the chart bounds anchored to the aircraft envelope so an out-of-limits
  // CG does not expand the graph to make the point fit.
  const finalXMin = graphConfig.xMin;
  const finalXMax = graphConfig.xMax;
  const finalYMin = graphConfig.yMin;
  const finalYMax = graphConfig.yMax;
  return (
    <div className="max-w-[1100px] mx-auto w-full flex flex-col gap-8 pt-4 px-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 border rounded-md bg-background hover:bg-muted shadow-sm" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Scale className="h-7 w-7 text-primary" />
                    Mass & Balance
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">
                    {aircraft.tailNumber} ({aircraft.model}) {booking ? `| OPERATING UNDER BOOKING #${booking.bookingNumber}` : '| QUICK CALCULATION'}
                </p>
            </div>
        </div>
        {booking && (
            <Button onClick={handleSaveToBooking} className={HEADER_ACTION_BUTTON_CLASS}>
                <Save className="h-4 w-4" /> Save to Booking
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-0 shadow-none bg-transparent">
          <CardHeader className="px-2 pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Scale className="h-4 w-4" />
                CG Envelope Visualization
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verification of center of gravity against manufacturer structural limits.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className={cn(
              "w-full relative bg-background border rounded-3xl shadow-sm border-slate-200",
              isMobile ? "aspect-[1.15/1] min-h-[320px] p-1 overflow-visible" : "h-[550px] p-6 overflow-hidden"
            )}>
                <MassBalanceEnvelopeChart
                  envelope={graphConfig.envelope}
                  currentPoint={{ x: results.cg, y: results.weight }}
                  xMin={finalXMin}
                  xMax={finalXMax}
                  yMin={finalYMin}
                  yMax={finalYMax}
                  isSafe={results.isSafe}
                  isMobile={isMobile}
                  className="h-full"
                />
                <div className={cn("absolute bottom-3 right-3 sm:bottom-12 sm:right-12 px-3 sm:px-10 py-1.5 sm:py-3 rounded-2xl font-black shadow-xl text-white text-[9px] sm:text-sm uppercase tracking-widest border-4 border-white animate-in zoom-in duration-300", results.isSafe ? 'bg-emerald-600' : 'bg-red-600')}>
                    {results.isSafe ? "Within Limits" : "DANGER: Out of Limits"}
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
            <Card className="rounded-3xl border-2 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" />
                        Live Calculation
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                    <div className="p-6 rounded-2xl bg-muted/5 border shadow-inner">
                        <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-1">Total Weight</p>
                        <p className="text-4xl font-black font-mono tracking-tighter text-foreground">{results.weight} <span className="text-xs font-bold font-sans text-muted-foreground uppercase tracking-widest">lbs</span></p>
                    </div>
                    <div className="p-6 rounded-2xl bg-muted/5 border shadow-inner">
                        <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-1">Computed CG</p>
                        <p className="text-4xl font-black font-mono tracking-tighter text-foreground">{results.cg} <span className="text-xs font-bold font-sans text-muted-foreground uppercase tracking-widest">inches</span></p>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border-2 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/5 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Loading Stations</CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-widest">Adjust weights to synchronize CG envelope.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-black uppercase tracking-tight">Basic Empty Weight</span>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Fixed Asset Constant</p>
                                </div>
                                <span className="text-sm font-black font-mono">{basicEmpty.weight.toLocaleString()} lbs</span>
                            </div>

                            {stations.map(s => (
                                <div key={s.id} className="space-y-4 pb-6 border-b last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-black uppercase tracking-tight">{s.name}</Label>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Arm: {s.arm} in</p>
                                        </div>
                                        <Input
                                            type="number"
                                            value={s.weight || ''}
                                            onChange={(e) => handleWeightChange(s.id, e.target.value)}
                                            className="w-28 h-10 text-right font-black font-mono bg-background shadow-sm border-2"
                                        />
                                    </div>
                                    {s.type === 'fuel' && (
                                        <div className="space-y-3 bg-yellow-500/5 p-4 rounded-2xl border border-yellow-500/20">
                                            <div className="flex items-center gap-3">
                                                <Fuel className="h-4 w-4 text-yellow-600" />
                                                <Input
                                                    type="number"
                                                    value={s.gallons || ''}
                                                    onChange={(e) => handleGallonsChange(s.id, e.target.value)}
                                                    className="w-20 h-8 text-xs text-right font-black font-mono bg-background border-dashed border-yellow-500/50"
                                                />
                                                <span className="text-[9px] font-black text-yellow-700 uppercase tracking-widest">Gallons</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max={s.maxGallons || 50}
                                                step="0.1"
                                                value={s.gallons || 0}
                                                onChange={(e) => handleGallonsChange(s.id, e.target.value)}
                                                className="w-full h-2 accent-yellow-600 rounded-full cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

export default function WBCalculatorPage() {
    return (
        <IndustryRouteGuard
            sectionLabel="Mass & Balance"
            description="Mass and balance tools are only available for flight-operations tenants."
            backHref="/dashboard"
        >
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <WBCalculatorContent />
            </Suspense>
        </IndustryRouteGuard>
    );
}
