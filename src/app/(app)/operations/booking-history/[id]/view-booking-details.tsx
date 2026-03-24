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
import { CheckCircle2, ClipboardCheck, FileClock, History, Clock, PencilLine, Edit2, ShieldCheck, Lock, UserCheck, Map as NavIcon, FileText, AlertTriangle } from 'lucide-react';
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
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        {children ? children : <p className="text-sm font-semibold">{value ?? 'N/A'}</p>}
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

    const [activeEditView, setActiveEditView] = useState<'none' | 'pre-flight' | 'post-flight'>('none');

    const aircraftQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);
    const allBookingsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/bookings`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: personnel, isLoading: loadingPer } = useCollection<Personnel>(personnelQuery);
    const { data: allBookings, isLoading: loadingAllBookings } = useCollection<Booking>(allBookingsQuery);

    const aircraft = useMemo(() => aircrafts?.find(a => a.id === booking.aircraftId), [aircrafts, booking.aircraftId]);
    const isCompleted = booking.status === 'Completed';

    const precedingBooking = useMemo(() => {
        if (!booking || !allBookings) return null;
        const sorted = allBookings
            .filter(b => b.aircraftId === booking.aircraftId && b.status !== 'Cancelled' && b.status !== 'Cancelled with Reason')
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        const currentIndex = sorted.findIndex(b => b.id === booking.id);
        if (currentIndex <= 0) return null;
        return sorted[currentIndex - 1];
    }, [booking, allBookings]);

    const isPreFlightBlocked = precedingBooking ? !precedingBooking.postFlight : false;

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

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <Tabs defaultValue="flight-details" className="flex w-full min-h-0 flex-1 flex-col">
                <div className="shrink-0 px-1">
                    <TabsList className="mb-4 h-auto flex-wrap justify-start gap-2 border-b-0 bg-transparent p-0">
                        <TabsTrigger value="flight-details" className="gap-2 rounded-full border px-4 py-2 text-xs data-[state=active]:bg-button-primary sm:px-6"><FileText className="h-4 w-4" /> Flight Details</TabsTrigger>
                        <TabsTrigger value="navlog" className="gap-2 rounded-full border px-4 py-2 text-xs data-[state=active]:bg-button-primary sm:px-6"><NavIcon className="h-4 w-4" /> Navlog</TabsTrigger>
                    </TabsList>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                    <TabsContent value="flight-details" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border shadow-none">
                            <CardHeader className="border-b bg-muted/20 shrink-0">
                                <CardTitle>{booking.type}</CardTitle>
                                <CardDescription>{booking.bookingNumber} • {aircraft ? aircraft.tailNumber : booking.aircraftId}</CardDescription>
                            </CardHeader>
                            <ScrollArea className="min-h-0 flex-1">
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                                    <DetailItem label="Status"><Badge variant={booking.status === 'Approved' ? 'default' : 'secondary'}>{booking.status}</Badge></DetailItem>
                                    <DetailItem label="Aircraft" value={aircraft ? aircraft.tailNumber : booking.aircraftId} />
                                    <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                </CardContent>
                                <Separator />
                                <CardHeader><CardTitle className="text-xl flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Mass & Balance</CardTitle></CardHeader>
                                <CardContent className="pb-20">
                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                                        <div className="flex flex-col h-full min-h-[500px]">
                                            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar touch-pan-x bg-background rounded-xl border p-4">
                                                <div className="min-w-[800px] h-full relative">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <ScatterChart margin={{ top: 20, right: 60, bottom: 60, left: 60 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis type="number" dataKey="x" name="CG" domain={[fXMin, fXMax]} ticks={generateNiceTicks(fXMin, fXMax, 8)} allowDataOverflow><Label value="CG (in)" offset={-20} position="insideBottom" /></XAxis>
                                                            <YAxis type="number" dataKey="y" name="Weight" domain={[fYMin, fYMax]} ticks={generateNiceTicks(fYMin, fYMax, 8)} allowDataOverflow><Label value="Weight (lbs)" angle={-90} position="insideLeft" offset={-40} /></YAxis>
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
                                            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
                                                <DetailItem label="Total Weight"><p className="text-2xl font-black">{results.weight} lbs</p></DetailItem>
                                                <DetailItem label="Center Gravity"><p className="text-2xl font-black">{results.cg} in</p></DetailItem>
                                            </div>
                                            <ScrollArea className="h-[400px] pr-4">
                                                <div className="space-y-4">
                                                    {stations.map(s => (
                                                        <div key={s.id} className="space-y-1.5 p-3 border rounded-lg bg-background">
                                                            <UILabel className="text-[10px] font-black uppercase text-muted-foreground">{s.name}</UILabel>
                                                            <div className="flex items-center gap-2">
                                                                <Input type="number" value={s.weight} readOnly className="h-8 text-xs font-bold" />
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
                        </Card>
                    </TabsContent>
                    <TabsContent value="navlog" className="m-0 flex h-full min-h-0 flex-1 flex-col"><NavlogBuilder booking={booking} tenantId={tenantId!} /></TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function PreFlightLogForm({ booking, aircraft, tenantId, onCancel, onSuccess }: any) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { userProfile } = useUserProfile();
    const form = useForm({ defaultValues: booking.preFlightData || { hobbs: aircraft.currentHobbs || 0, tacho: aircraft.currentTacho || 0, fuelUpliftGallons: 0, fuelUpliftLitres: 0, oilUplift: 0, documentsChecked: false } });
    const onSubmit = async (data: any) => {
        if (!firestore) return;
        const ref = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        const log: OverrideLog = { userId: userProfile?.id || 'sys', userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Sys', permissionId: 'bookings-preflight-manage', action: 'Recorded pre-flight', reason: 'Normal operations', timestamp: new Date().toISOString() };
        updateDocumentNonBlocking(ref, { preFlight: true, preFlightData: data, overrides: arrayUnion(log) });
        toast({ title: 'Pre-Flight Recorded' });
        onSuccess();
    };
    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4"><Input type="number" step="0.1" {...form.register('hobbs')} placeholder="Start Hobbs" className="h-9" /><Input type="number" step="0.1" {...form.register('tacho')} placeholder="Start Tacho" className="h-9" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.watch('documentsChecked')} onCheckedChange={(v) => form.setValue('documentsChecked', v)} /><Label>Documents Checked</Label></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button><Button size="sm" type="submit">Save</Button></div>
        </form>
    );
}

function PostFlightLogForm({ booking, aircraft, tenantId, onCancel, onSuccess }: any) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const form = useForm({ defaultValues: booking.postFlightData || { hobbs: (booking.preFlightData?.hobbs || aircraft.currentHobbs || 0) + 1, tacho: (booking.preFlightData?.tacho || aircraft.currentTacho || 0) + 0.8, fuelUpliftGallons: 0, fuelUpliftLitres: 0, oilUplift: 0, defects: '' } });
    const onSubmit = async (data: any) => {
        if (!firestore) return;
        const bRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        const aRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        const batch = writeBatch(firestore);
        batch.update(bRef, { postFlight: true, postFlightData: data, status: 'Completed' });
        batch.update(aRef, { currentHobbs: data.hobbs, currentTacho: data.tacho });
        await batch.commit();
        toast({ title: 'Flight Finalized' });
        onSuccess();
    };
    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4"><Input type="number" step="0.1" {...form.register('hobbs')} placeholder="End Hobbs" className="h-9" /><Input type="number" step="0.1" {...form.register('tacho')} placeholder="End Tacho" className="h-9" /></div>
            <Textarea {...form.register('defects')} placeholder="Defects / Notes" />
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button><Button size="sm" type="submit">Complete</Button></div>
        </form>
    );
}
