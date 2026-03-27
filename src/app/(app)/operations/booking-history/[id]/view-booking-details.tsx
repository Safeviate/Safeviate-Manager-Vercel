'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, doc, arrayUnion, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useForm } from 'react-hook-form';
import type { Booking, OverrideLog } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { CheckCircle2, ClipboardCheck, FileClock, History, Clock, PencilLine, Edit2, ShieldCheck, Lock, UserCheck, Map as NavIcon, FileText, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavlogBuilder } from '../../../bookings/navlog-builder';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Cell, Label } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];

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

const DetailItem = ({ label, value, children }: { label: string, value?: string | number | undefined | null, children?: React.ReactNode }) => (
    <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
        {children ? children : <p className="text-sm font-bold text-foreground">{value ?? 'N/A'}</p>}
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
    const { hasPermission } = usePermissions();
    const { tenantId, userProfile } = useUserProfile();

    const [activeTab, setActiveTab] = useState('flight-details');

    const aircraftQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);
    const allBookingsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/bookings`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: personnel, isLoading: loadingPer } = useCollection<Personnel>(personnelQuery);
    const { data: allBookings, isLoading: loadingAllBookings } = useCollection<Booking>(allBookingsQuery);

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
        const poly = aircraft.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
        const safe = poly.length > 2 ? isPointInPolygon({ x: roundedCg, y: roundedWeight }, poly) : false;
        setResults({ cg: roundedCg, weight: roundedWeight, isSafe: safe });
    }, [stations, aircraft]);

    if (loadingAc || loadingPer || loadingAllBookings) return <Skeleton className="h-64 w-full" />;

    const envelope = aircraft?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
    const allX = [...envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
    const allY = [...envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
    const fXMin = Math.min(...allX) - 5;
    const fXMax = Math.max(...allX) + 5;
    const fYMin = Math.min(...allY) - 100;
    const fYMax = Math.max(...allY) + 100;

    const tabs = [
        { value: 'flight-details', label: 'Flight Details', icon: FileText },
        { value: 'navlog', label: 'Navlog', icon: NavIcon },
    ];

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full min-h-0 flex-1 flex-col">
                <div className="shrink-0 px-1">
                    {isMobile ? (
                        <div className="mb-4">
                            <Select value={activeTab} onValueChange={setActiveTab}>
                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase h-9">
                                    <SelectValue placeholder="Select Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tabs.map((tab) => (
                                        <SelectItem key={tab.value} value={tab.value} className="text-[10px] font-bold uppercase">
                                            <div className="flex items-center gap-2">
                                                <tab.icon className="h-3.5 w-3.5" />
                                                {tab.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <TabsList className="mb-4 h-auto flex-wrap justify-start gap-2 border-b-0 bg-transparent p-0">
                            {tabs.map((tab) => (
                                <TabsTrigger 
                                    key={tab.value} 
                                    value={tab.value} 
                                    className="gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase data-[state=active]:bg-button-primary sm:px-6"
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                    <TabsContent value="flight-details" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border shadow-none">
                            <CardHeader className="border-b bg-muted/20 shrink-0">
                                <CardTitle className="text-sm font-black uppercase tracking-tight">{booking.type}</CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase">{booking.bookingNumber} • {aircraft ? aircraft.tailNumber : booking.aircraftId}</CardDescription>
                            </CardHeader>
                            <ScrollArea className="min-h-0 flex-1">
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 pb-10">
                                    <DetailItem label="Status"><Badge variant={booking.status === 'Approved' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase">{booking.status}</Badge></DetailItem>
                                    <DetailItem label="Aircraft" value={aircraft ? aircraft.tailNumber : booking.aircraftId} />
                                    <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                </CardContent>
                                <Separator />
                                <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Mass & Balance Analysis</CardTitle></CardHeader>
                                <CardContent className="pb-32">
                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                                        <div className="flex flex-col h-full min-h-[500px]">
                                            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar touch-pan-x bg-background rounded-xl border p-4">
                                                <div className="min-w-[800px] h-full relative">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <ScatterChart margin={{ top: 20, right: 60, bottom: 60, left: 60 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis type="number" dataKey="x" name="CG" domain={[fXMin, fXMax]} ticks={generateNiceTicks(fXMin, fXMax, 8)} allowDataOverflow><Label value="CG (in)" offset={-20} position="insideBottom" className="text-[10px] font-black uppercase fill-muted-foreground" /></XAxis>
                                                            <YAxis type="number" dataKey="y" name="Weight" domain={[fYMin, fYMax]} ticks={generateNiceTicks(fYMin, fYMax, 8)} allowDataOverflow><Label value="Weight (lbs)" angle={-90} position="insideLeft" offset={-40} className="text-[10px] font-black uppercase fill-muted-foreground" /></YAxis>
                                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                            <Scatter data={envelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} />
                                                            <Scatter data={[{ x: results.cg, y: results.weight }]}>
                                                                <ReferenceDot x={results.cg} y={results.weight} r={10} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={3} />
                                                            </Scatter>
                                                        </ScatterChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-slate-200">
                                                <DetailItem label="Total Weight"><p className="text-2xl font-black text-foreground">{results.weight} lbs</p></DetailItem>
                                                <DetailItem label="Center Gravity"><p className="text-2xl font-black text-foreground">{results.cg} in</p></DetailItem>
                                                <div className={cn(
                                                    "p-2 rounded-lg text-center font-black uppercase text-[10px] tracking-widest",
                                                    results.isSafe ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                                                )}>
                                                    {results.isSafe ? "Safe Loading" : "Outside Envelope"}
                                                </div>
                                            </div>
                                            <ScrollArea className="h-[400px] pr-4">
                                                <div className="space-y-4">
                                                    {stations.map(s => (
                                                        <div key={s.id} className="space-y-1.5 p-3 border rounded-lg bg-background shadow-sm border-slate-200">
                                                            <UILabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{s.name}</UILabel>
                                                            <div className="flex items-center gap-2">
                                                                <Input type="number" value={s.weight} readOnly className="h-8 text-xs font-bold bg-muted/5 border-none shadow-none focus-visible:ring-0" />
                                                                <div className="text-[9px] font-black text-muted-foreground w-8 uppercase">LBS</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </CardContent>
                            </ScrollArea>
                        </Card>
                    </TabsContent>
                    <TabsContent value="navlog" className="m-0 flex h-full min-h-0 flex-1 flex-col"><NavlogBuilder booking={booking} tenantId={tenantId!} /></TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
