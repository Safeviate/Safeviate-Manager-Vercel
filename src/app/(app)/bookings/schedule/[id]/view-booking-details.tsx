'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking, NavlogLeg } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle, Map as MapIcon, Loader2, X, RotateCcw, Trash2, FileText, Settings2, Scale, Map as NavIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { NavlogBuilder } from '../../navlog-builder';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { BookingDetailHeader } from '@/components/booking-detail-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';
import { createNavlogLegFromCoordinates } from '@/lib/flight-planner';

// Dynamic import for Leaflet to avoid SSR issues
const AeronauticalMap = dynamic(
  () => import('@/components/flight-planner/aeronautical-map'),
  { 
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto" />
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">Initializing Chart Engine...</p>
            </div>
        </div>
    )
  }
);

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

function stripUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => stripUndefinedDeep(item)).filter((item) => item !== undefined) as T;
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, any>)
                .filter(([, nested]) => nested !== undefined)
                .map(([key, nested]) => [key, stripUndefinedDeep(nested)])
        ) as T;
    }

    return value;
}

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const { tenantId } = useUserProfile();
    const [activeTab, setActiveTab] = useState('navlog');
    const [isSaving, setIsSaving] = useState(false);
    const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
    const [personnel, setPersonnel] = useState<any[]>([]);
    const [loadingAc, setLoadingAc] = useState(true);
    const [loadingPeople, setLoadingPeople] = useState(true);

    const aircraft = useMemo(() => aircrafts?.find(a => a.id === booking.aircraftId), [aircrafts, booking.aircraftId]);
    const [stations, setStations] = useState<any[]>([]);
    const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

    // Planning state
    const [plannedLegs, setPlannedLegs] = useState<NavlogLeg[]>(booking.navlog?.legs || []);
    const [departureLegId, setDepartureLegId] = useState<string | null>(booking.navlog?.legs?.[0]?.id || null);
    const [arrivalLegId, setArrivalLegId] = useState<string | null>(booking.navlog?.legs?.[booking.navlog?.legs.length ? booking.navlog.legs.length - 1 : 0]?.id || null);
    const [depIcao, setDepIcao] = useState(booking.navlog?.departureIcao || '');
    const [arrIcao, setArrIcao] = useState(booking.navlog?.arrivalIcao || '');
    const [depLat, setDepLat] = useState(booking.navlog?.departureLatitude?.toString() || '');
    const [depLon, setDepLon] = useState(booking.navlog?.departureLongitude?.toString() || '');
    const [arrLat, setArrLat] = useState(booking.navlog?.arrivalLatitude?.toString() || '');
    const [arrLon, setArrLon] = useState(booking.navlog?.arrivalLongitude?.toString() || '');

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            if (!tenantId) {
                setLoadingAc(false);
                setLoadingPeople(false);
                return;
            }

            try {
                const [scheduleRes, personnelRes] = await Promise.all([
                    fetch('/api/schedule-data'),
                    fetch('/api/personnel'),
                ]);

                if (!scheduleRes.ok) throw new Error('Failed to load aircraft data.');
                if (!personnelRes.ok) throw new Error('Failed to load personnel data.');

                const scheduleData = await scheduleRes.json();
                const peopleData = await personnelRes.json();

                if (!cancelled) {
                    setAircrafts(scheduleData.aircraft || []);
                    setPersonnel(peopleData.personnel || []);
                }
            } catch {
                if (!cancelled) {
                    setAircrafts([]);
                    setPersonnel([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingAc(false);
                    setLoadingPeople(false);
                }
            }
        };

        loadData();
        return () => {
            cancelled = true;
        };
    }, [tenantId]);

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

    // ── Fuel sync between M&B and NavLog ──
    const fuelStation = useMemo(() => stations.find(s => s.type === 'fuel'), [stations]);
    const fuelWeightLbs = fuelStation ? (parseFloat(String(fuelStation.weight)) || 0) : undefined;

    const handleNavlogFuelSync = useCallback((weightLbs: number) => {
        setStations(prev => prev.map(s => {
            if (s.type !== 'fuel') return s;
            return { ...s, weight: weightLbs, gallons: parseFloat((weightLbs / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
        }));
    }, []);

    const handleSaveToBooking = () => {
        void fetch('/api/bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking: {
                    ...booking,
                    massAndBalance: stripUndefinedDeep({
                        takeoffWeight: results.weight,
                        takeoffCg: results.cg,
                        isWithinLimits: results.isSafe,
                        stations,
                    }),
                },
            }),
        }).then(async (res) => {
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Save failed.');
            }
            toast({ title: 'M&B Saved' });
        }).catch((error: any) => {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        });
    };

    const handleAddWaypoint = (lat: number, lon: number, identifier: string = 'WP', frequencies?: string, layerInfo?: string) => {
        setPlannedLegs(current => [...current, createNavlogLegFromCoordinates(current, lat, lon, identifier, frequencies, layerInfo)]);
    };

    const handleSetDeparture = (leg: NavlogLeg) => {
        setDepartureLegId(leg.id);
        setArrivalLegId((current) => (current === leg.id ? null : current));
        setDepIcao(leg.waypoint);
        setDepLat(leg.latitude?.toString() || '');
        setDepLon(leg.longitude?.toString() || '');
    };

    const handleSetArrival = (leg: NavlogLeg) => {
        setArrivalLegId(leg.id);
        setDepartureLegId((current) => (current === leg.id ? null : current));
        setArrIcao(leg.waypoint);
        setArrLat(leg.latitude?.toString() || '');
        setArrLon(leg.longitude?.toString() || '');
    };

    const handleCommitRoute = async () => {
        setIsSaving(true);
        try {
            const sanitizedLegs = stripUndefinedDeep(plannedLegs);
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        navlog: {
                            ...(booking.navlog || {}),
                            legs: sanitizedLegs,
                            departureIcao: depIcao,
                            arrivalIcao: arrIcao,
                            departureLatitude: depLat ? parseFloat(depLat) : null,
                            departureLongitude: depLon ? parseFloat(depLon) : null,
                            arrivalLatitude: arrLat ? parseFloat(arrLat) : null,
                            arrivalLongitude: arrLon ? parseFloat(arrLon) : null,
                        },
                    },
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Commit failed.');
            }
            toast({ title: "Route Committed", description: "The navigation log has been updated." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Commit Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingAc || loadingPeople) return <Skeleton className="h-64 w-full" />;

    const envelope = aircraft?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
    const allX = [...envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
    const allY = [...envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
    const padX = allX.length > 1 ? (Math.max(...allX) - Math.min(...allX)) * 0.1 : 5;
    const padY = allY.length > 1 ? (Math.max(...allY) - Math.min(...allY)) * 0.1 : 100;
    const fXMin = Math.min(...allX) - padX;
    const fXMax = Math.max(...allX) + padX;
    const fYMin = Math.min(...allY) - padY;
    const fYMax = Math.max(...allY) + padY;

    return (
        <Card className="flex h-full min-h-0 flex-1 flex-col shadow-none border overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-1 flex-col">
                <BookingDetailHeader
                    title={booking.type}
                    subtitle={`${booking.bookingNumber} - ${aircraft ? aircraft.tailNumber : booking.aircraftId}`}
                    status={booking.status}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    tabRowAction={
                        activeTab === 'planning' ? (
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setPlannedLegs([])}
                                    className="h-8 text-[10px] font-black uppercase border-slate-300"
                                    disabled={plannedLegs.length === 0}
                                >
                                    <RotateCcw className="h-3 w-3 mr-1.5" /> Clear
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md font-black uppercase text-[10px] h-8 px-4 gap-2 shrink-0"
                                    onClick={handleCommitRoute}
                                    disabled={isSaving || plannedLegs.length === 0}
                                >
                                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Commit Route
                                </Button>
                            </div>
                        ) : null
                    }
                    />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <TabsContent value="flight-details" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <ScrollArea className="min-h-0 flex-1">
                            <CardContent className="pt-4 pb-20 space-y-6">
                                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Flight Overview</p>
                                            <p className="text-sm font-black uppercase">Quick Reference</p>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase">Visible in Scroll</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
                                        <DetailItem label="Status"><Badge variant={booking.status === 'Approved' ? 'default' : 'secondary'}>{booking.status}</Badge></DetailItem>
                                        <DetailItem label="Aircraft" value={aircraft ? aircraft.tailNumber : booking.aircraftId} />
                                        <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                        <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                                        <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                                    </div>
                                </div>
                            </CardContent>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="planning" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden relative">
                            <div className="flex-1 min-h-0 w-full relative z-0">
                                <AeronauticalMap 
                                    legs={plannedLegs} 
                                    onAddWaypoint={handleAddWaypoint}
                                />
                                
                                {/* Absolute positioned leg summary cards - higher Z index */}
                                <div className="absolute top-4 right-4 z-[1000] w-[300px] hidden lg:block max-h-[calc(100%-2rem)] flex flex-col pointer-events-none">
                                    <Card className="shadow-2xl border bg-background/95 backdrop-blur flex flex-col min-h-0 max-h-full pointer-events-auto">
                                        <CardHeader className="p-4 border-b shrink-0">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-xs font-black uppercase tracking-widest">Route Summary</CardTitle>
                                                <Badge variant="secondary" className="text-[9px] font-black">{plannedLegs.length} WP</Badge>
                                            </div>
                                        </CardHeader>
                                        <ScrollArea className="flex-1">
                                            <div className="p-2 space-y-2">
                                                {plannedLegs.map((leg, i) => (
                                                    <div key={leg.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10 group transition-colors hover:bg-muted/20">
                                                        <div className="flex-1 min-w-0">
         <div className="flex justify-between items-center">
             <span className="font-black text-[11px] uppercase truncate">{leg.waypoint}</span>
             <span className="font-mono text-[9px] text-muted-foreground">{leg.latitude?.toFixed(2)}, {leg.longitude?.toFixed(2)}</span>
         </div>
         {leg.frequencies && (
             <p className="mt-1 text-[9px] font-semibold text-emerald-700">
                 {leg.frequencies}
             </p>
         )}
         {leg.layerInfo && (
             <p className="mt-1 text-[9px] font-semibold text-primary">
                 {leg.layerInfo}
             </p>
         )}
         <div className="flex gap-3 mt-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-bold uppercase text-muted-foreground">Dist</span>
                                                                    <span className="text-[10px] font-black">{leg.distance?.toFixed(1)} NM</span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-bold uppercase text-muted-foreground">HDG</span>
                                                                    <span className="text-[10px] font-black">{leg.magneticHeading?.toFixed(0)}°</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setPlannedLegs(plannedLegs.filter(l => l.id !== leg.id))}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {plannedLegs.length === 0 && (
                                                    <div className="py-12 text-center">
                                                        <p className="text-[10px] font-black uppercase text-muted-foreground italic opacity-40">Click the map to add waypoints</p>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="mass-balance" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                            <ScrollArea className="min-h-0 flex-1">
                                <CardHeader><CardTitle className="text-xl flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Mass & Balance</CardTitle></CardHeader>
                                <CardContent className="min-h-full pb-20">
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
                                                <div className={cn("relative w-full", isMobile ? "h-[280px]" : "h-[420px]")}>
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
                                            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
                                                <DetailItem label="Total Weight"><p className="text-2xl font-black">{results.weight} lbs</p></DetailItem>
                                                <DetailItem label="Center Gravity"><p className="text-2xl font-black">{results.cg} in</p></DetailItem>
                                                <Button size="sm" onClick={handleSaveToBooking} className="w-full h-10 uppercase text-xs font-black bg-emerald-700">Save Load config</Button>
                                            </div>
                                            <ScrollArea className="h-[400px] pr-4">
                                                <div className="space-y-4">
                                                    {stations.map(s => (
                                                        <div key={s.id} className="space-y-1.5 p-3 border rounded-lg bg-background">
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
                        </div>
                    </TabsContent>

                    <TabsContent value="navlog" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <div className="min-h-0 flex-1 overflow-hidden">
                            <NavlogBuilder booking={booking} tenantId={tenantId!} fuelWeightLbs={fuelWeightLbs} onFuelWeightChange={handleNavlogFuelSync} />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </Card>
    );
}
