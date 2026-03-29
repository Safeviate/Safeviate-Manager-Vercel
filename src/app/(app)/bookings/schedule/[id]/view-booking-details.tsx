'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { NavlogBuilder } from '../../navlog-builder';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { BookingDetailHeader } from '@/components/booking-detail-header';

const FUEL_WEIGHT_PER_GALLON = 6;

interface ViewBookingDetailsProps {
    booking: Booking;
}

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

const DetailItem = ({ label, value, children }: { label: string, value?: string | undefined | null, children?: React.ReactNode }) => (
    <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        {children ? children : <p className="text-sm font-semibold">{value || 'N/A'}</p>}
    </div>
);

const formatDateSafe = (dateString: string | undefined, formatString: string): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return format(date, formatString);
    } catch (e) {
        return 'Invalid Date';
    }
};

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    const firestore = useFirestore();
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const { tenantId } = useUserProfile();
    const [activeTab, setActiveTab] = useState('flight-details');

    const aircraftQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: instructors, isLoading: loadingIns } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: loadingStu } = useCollection<PilotProfile>(studentsQuery);
    const { data: personnel } = useCollection<Personnel>(personnelQuery);

    const aircraft = useMemo(() => aircrafts?.find(a => a.id === booking.aircraftId), [aircrafts, booking.aircraftId]);

    const [stations, setStations] = useState<any[]>([]);
    const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

    useEffect(() => {
        if (aircraft) {
            if (booking.massAndBalance?.stations && booking.massAndBalance.stations.length > 0) {
                setStations(booking.massAndBalance.stations);
            } else if (aircraft.stations) {
                setStations(aircraft.stations);
            }
        }
    }, [aircraft, booking.massAndBalance?.stations]);

    useEffect(() => {
        if (!aircraft || !aircraft.emptyWeight || !aircraft.emptyWeightMoment) return;
        let totalMom = aircraft.emptyWeightMoment;
        let totalWt = aircraft.emptyWeight;
        stations.forEach(st => {
            const wt = parseFloat(String(st.weight)) || 0;
            const arm = parseFloat(String(st.arm)) || 0;
            totalWt += wt;
            totalMom += (wt * arm);
        });
        const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
        const roundedCg = parseFloat(cg.toFixed(2));
        const roundedWeight = parseFloat(totalWt.toFixed(1));
        const envelope = aircraft.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
        const safe = envelope.length > 2 ? isPointInPolygon({ x: roundedCg, y: roundedWeight }, envelope) : false;
        setResults({ cg: roundedCg, weight: roundedWeight, isSafe: safe });
    }, [stations, aircraft]);

    const handleStationWeightChange = (id: number, weight: string) => {
        const val = parseFloat(weight) || 0;
        setStations(prev => prev.map(s => {
            if (s.id !== id) return s;
            if (s.type === 'fuel') {
                return { ...s, weight: val, gallons: parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
            }
            return { ...s, weight: val };
        }));
    };

    const handleSaveToBooking = () => {
        if (!firestore || !tenantId) return;
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        updateDocumentNonBlocking(bookingRef, { massAndBalance: { takeoffWeight: results.weight, takeoffCg: results.cg, isWithinLimits: results.isSafe, stations } });
        toast({ title: 'M&B Saved' });
    };

    if (loadingAc || loadingIns || loadingStu) return <Skeleton className="h-64 w-full" />;

    const envelope = aircraft?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
    const allX = [...envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
    const allY = [...envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
    const padX = allX.length > 1 ? (Math.max(...allX) - Math.min(...allX)) * 0.2 : 5;
    const padY = allY.length > 1 ? (Math.max(...allY) - Math.min(...allY)) * 0.2 : 100;
    const fXMin = Math.min(...allX) - padX;
    const fXMax = Math.max(...allX) + padX;
    const fYMin = Math.min(...allY) - padY;
    const fYMax = Math.max(...allY) + padY;

    return (
        <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden shadow-none border">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full min-h-0 flex-1 flex-col">
                <BookingDetailHeader
                    title={booking.type}
                    subtitle={`${booking.bookingNumber} - ${aircraft ? aircraft.tailNumber : booking.aircraftId}`}
                    status={booking.status}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <TabsContent value="flight-details" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <ScrollArea className="flex-1 min-h-0">
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                                <DetailItem label="Status" value={booking.status} />
                                <DetailItem label="Aircraft" value={aircraft ? aircraft.tailNumber : booking.aircraftId} />
                                <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                                <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                            </CardContent>
                            <Separator />
                            <CardHeader><CardTitle className="text-xl flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Mass & Balance Analysis</CardTitle></CardHeader>
                            <CardContent className="pb-6">
                                <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                                    <div className="flex flex-col">
                                        <div className={cn("rounded-xl border bg-background p-3 sm:p-4", isMobile && "mx-auto w-full max-w-[430px]")}>
                                            <div className="mb-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Envelope</p>
                                                    <p className="text-xs font-semibold text-muted-foreground">Current position against approved limits</p>
                                                </div>
                                                <Badge variant={results.isSafe ? 'default' : 'destructive'} className="text-[10px] font-black uppercase">
                                                    {results.isSafe ? 'Within Limits' : 'Out Of Limits'}
                                                </Badge>
                                            </div>
                                            <div className={cn("relative w-full", isMobile ? "h-[280px]" : "h-[1000px]")}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ScatterChart margin={isMobile ? { top: 12, right: 16, bottom: 16, left: 4 } : { top: 20, right: 28, bottom: 32, left: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                        <XAxis
                                                            type="number"
                                                            dataKey="x"
                                                            name="CG"
                                                            domain={[fXMin, fXMax]}
                                                            ticks={generateNiceTicks(fXMin, fXMax, isMobile ? 5 : 8)}
                                                            allowDataOverflow
                                                            tick={{ fontSize: isMobile ? 10 : 11 }}
                                                            tickMargin={6}
                                                        >
                                                            {!isMobile ? <Label value="CG (in)" offset={-10} position="insideBottom" /> : null}
                                                        </XAxis>
                                                        <YAxis
                                                            type="number"
                                                            dataKey="y"
                                                            name="Weight"
                                                            domain={[fYMin, fYMax]}
                                                            ticks={generateNiceTicks(fYMin, fYMax, isMobile ? 5 : 8)}
                                                            allowDataOverflow
                                                            width={isMobile ? 38 : 52}
                                                            tick={{ fontSize: isMobile ? 10 : 11 }}
                                                            tickMargin={4}
                                                        >
                                                            {!isMobile ? <Label value="Weight (lbs)" angle={-90} position="insideLeft" offset={-8} /> : null}
                                                        </YAxis>
                                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                        <Scatter data={envelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => <g />} />
                                                        <Scatter data={[{ x: results.cg, y: results.weight }]}>
                                                            <ReferenceDot x={results.cg} y={results.weight} r={isMobile ? 7 : 10} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={3} />
                                                        </Scatter>
                                                    </ScatterChart>
                                                </ResponsiveContainer>
                                            </div>
                                            {isMobile ? (
                                                <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                                                    <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CG</p>
                                                        <p className="text-sm font-black">{results.cg} in</p>
                                                    </div>
                                                    <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Weight</p>
                                                        <p className="text-sm font-black">{results.weight} lbs</p>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="p-4 bg-muted/30 rounded-xl space-y-4 border shadow-sm">
                                            <DetailItem label="Total Weight"><p className="text-2xl font-black">{results.weight} lbs</p></DetailItem>
                                            <DetailItem label="Center Gravity"><p className="text-2xl font-black">{results.cg} in</p></DetailItem>
                                            <Button size="sm" onClick={handleSaveToBooking} className="w-full h-10 uppercase text-xs font-black bg-emerald-700 shadow-md hover:bg-emerald-800">Save Load config</Button>
                                        </div>
                                        <ScrollArea className="h-[600px] pr-4">
                                            <div className="space-y-4">
                                                {stations.map(s => (
                                                    <div key={s.id} className="space-y-1.5 p-3 border rounded-lg bg-background shadow-sm">
                                                        <UILabel className="text-[10px] font-black uppercase text-muted-foreground">{s.name}</UILabel>
                                                        <div className="flex items-center gap-2">
                                                            <Input type="number" value={s.weight} onChange={(e) => handleStationWeightChange(s.id, e.target.value)} className="h-8 text-xs font-bold" />
                                                            <div className="text-[10px] font-bold text-muted-foreground w-8">LBS</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </CardContent>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="navlog" className="m-0 flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                        <NavlogBuilder booking={booking} tenantId={tenantId!} />
                    </TabsContent>
                </div>
            </Tabs>
        </Card>
    );
}
