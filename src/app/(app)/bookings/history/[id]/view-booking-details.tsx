'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, doc, arrayUnion, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useForm } from 'react-hook-form';
import type { Booking, OverrideLog } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Cell, Label } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle, CheckCircle2, ClipboardCheck, FileClock, History, PencilLine, ShieldAlert, Lock, Edit2, ShieldCheck, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { NavlogBuilder } from '../../navlog-builder';
import { calculateFuelGallonsFromWeight, calculateFuelWeight, gallonsToLitres, getFuelPreset, poundsToKilograms, type FuelType } from '@/lib/fuel';
import { useIsMobile } from '@/hooks/use-mobile';
import { BookingDetailHeader } from '@/components/booking-detail-header';

const POINT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];

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

const formatLitres = (gallons: number) => gallonsToLitres(gallons).toFixed(1);
const formatKilograms = (pounds: number) => poundsToKilograms(pounds).toFixed(1);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const normalizeFuelStation = (station: any) => {
    if (station?.type !== 'fuel') return station;
    const preset = getFuelPreset(station.fuelType);
    return {
        ...station,
        fuelType: station.fuelType || 'AVGAS',
        densityLbPerGallon: Number(station.densityLbPerGallon) || preset.densityLbPerGallon,
        maxGallons: Number(station.maxGallons) || 50,
    };
};

interface ViewBookingDetailsProps {
    booking: Booking;
}

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

    const [activeTab, setActiveTab] = useState('flight-details');
    const [activeEditView, setActiveEditView] = useState<'none' | 'pre-flight' | 'post-flight'>('none');

    const aircraftQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);
    const allBookingsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/bookings`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: instructors, isLoading: loadingIns } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: loadingStu } = useCollection<PilotProfile>(studentsQuery);
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
                setStations(booking.massAndBalance.stations.map(normalizeFuelStation));
            } else if (aircraft.stations) {
                setStations(aircraft.stations.map(normalizeFuelStation));
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

    const flightHours = useMemo(() => {
        if (booking.status === 'Completed' && booking.postFlightData?.hobbs !== undefined && booking.preFlightData?.hobbs !== undefined) {
            return (booking.postFlightData.hobbs - booking.preFlightData.hobbs).toFixed(1);
        }
        return null;
    }, [booking]);

    const handleStationWeightChange = (id: number, weight: string) => {
        const val = parseFloat(weight) || 0;
        setStations(prev => prev.map(s => {
            if (s.id !== id) return s;
            if (s.type === 'fuel') {
                const f = normalizeFuelStation(s);
                const density = f.densityLbPerGallon || 6.0;
                const max = f.maxGallons || 50;
                const gal = clamp(val / density, 0, max);
                return { ...f, weight: parseFloat((gal * density).toFixed(1)), gallons: parseFloat(gal.toFixed(1)) };
            }
            return { ...s, weight: val };
        }));
    };

    const handleFuelGallonsChange = (id: number, gallons: string) => {
        const val = parseFloat(gallons) || 0;
        setStations(prev => prev.map(s => s.id === id ? (() => {
            const f = normalizeFuelStation(s);
            const den = f.densityLbPerGallon || 6.0;
            const max = f.maxGallons || 50;
            const gal = clamp(val, 0, max);
            return { ...f, gallons: parseFloat(gal.toFixed(1)), weight: parseFloat((gal * den).toFixed(1)) };
        })() : s));
    };

    const handleSaveToBooking = () => {
        if (!firestore || !tenantId) return;
        const ref = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        updateDocumentNonBlocking(ref, { massAndBalance: { takeoffWeight: results.weight, takeoffCg: results.cg, isWithinLimits: results.isSafe, stations } });
        toast({ title: 'M&B Saved' });
    };

    if (loadingAc || loadingIns || loadingStu || loadingPer || loadingAllBookings) return <Skeleton className="h-64 w-full" />;

    const envelope = aircraft?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
    const allX = [...envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
    const allY = [...envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
    const padX = allX.length > 1 ? (Math.max(...allX) - Math.min(...allX)) * 0.1 : 5;
    const padY = allY.length > 1 ? (Math.max(...allY) - Math.min(...allY)) * 0.1 : 100;
    const fXMin = Math.min(...allX) - padX;
    const fXMax = Math.max(...allX) + padX;
    const fYMin = Math.min(...allY) - padY;
    const fYMax = Math.max(...allY) + padY;

    const canApprove = hasPermission('bookings-approve');
    const canOverride = hasPermission('bookings-approve-override');
    const canLogPre = hasPermission('bookings-preflight-manage');
    const canLogPost = hasPermission('bookings-postflight-manage');
    const canOverrideTechLog = hasPermission('bookings-techlog-override');
    const isApprovable = booking.status !== 'Approved' && !isCompleted && !booking.status.startsWith('Cancelled');

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full min-h-0 flex-1 flex-col">
                <BookingDetailHeader
                    title={booking.type}
                    subtitle={`${booking.bookingNumber} - ${aircraft ? aircraft.tailNumber : booking.aircraftId}`}
                    status={booking.status}
                    flightHours={flightHours}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
                <div className="flex min-h-0 flex-1 flex-col">
                    <TabsContent value="flight-details" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                        <Card className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden border shadow-none", isMobile && "min-h-[calc(100dvh-13rem)]")}>
                            <ScrollArea className="min-h-0 flex-1">
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                                    <DetailItem label="Aircraft" value={aircraft ? aircraft.tailNumber : booking.aircraftId} />
                                    <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                    <DetailItem label="Schedule" value={`${formatDateSafe(booking.start, 'p')} - ${formatDateSafe(booking.end, 'p')}`} />
                                    <DetailItem label="Instructor" value={instructors?.find(i => i.id === booking.instructorId)?.firstName || 'N/A'} />
                                    <DetailItem label="Student" value={students?.find(s => s.id === booking.studentId)?.firstName || 'N/A'} />
                                    <DetailItem label="Approved By" value={booking.approvedByName || 'Pending'} />
                                </CardContent>
                                <Separator />
                                <CardHeader><CardTitle className="text-xl flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Technical Log</CardTitle></CardHeader>
                                <CardContent className="space-y-8 pb-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className={cn("p-4 rounded-xl border bg-muted/10", isPreFlightBlocked && !booking.preFlight && "opacity-50")}>
                                            <h3 className="font-bold text-sm uppercase flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-green-600" /> Pre-Flight</h3>
                                            {activeEditView === 'pre-flight' ? (
                                                <PreFlightLogForm booking={booking} aircraft={aircraft!} tenantId={tenantId!} onCancel={() => setActiveEditView('none')} onSuccess={() => setActiveEditView('none')} />
                                            ) : booking.preFlightData ? (
                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <DetailItem label="Start Hobbs" value={booking.preFlightData.hobbs.toFixed(1)} />
                                                    <DetailItem label="Start Tacho" value={booking.preFlightData.tacho.toFixed(1)} />
                                                </div>
                                            ) : <p className="text-xs text-muted-foreground mt-2 italic">Waiting for log entry.</p>}
                                            {!booking.preFlight && !isCompleted && canLogPre && activeEditView !== 'pre-flight' && (
                                                <Button size="sm" onClick={() => setActiveEditView('pre-flight')} className="mt-4 h-8 text-[10px] uppercase font-black">Record Pre-Flight</Button>
                                            )}
                                        </div>
                                        <div className={cn("p-4 rounded-xl border bg-muted/10", !booking.preFlight && "opacity-50")}>
                                            <h3 className="font-bold text-sm uppercase flex items-center gap-2"><FileClock className="h-4 w-4 text-blue-600" /> Post-Flight</h3>
                                            {activeEditView === 'post-flight' ? (
                                                <PostFlightLogForm booking={booking} aircraft={aircraft!} tenantId={tenantId!} onCancel={() => setActiveEditView('none')} onSuccess={() => setActiveEditView('none')} />
                                            ) : booking.postFlightData ? (
                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <DetailItem label="End Hobbs" value={booking.postFlightData.hobbs.toFixed(1)} />
                                                    <DetailItem label="End Tacho" value={booking.postFlightData.tacho.toFixed(1)} />
                                                </div>
                                            ) : <p className="text-xs text-muted-foreground mt-2 italic">Waiting for completion.</p>}
                                            {booking.preFlight && !isCompleted && canLogPost && activeEditView !== 'post-flight' && (
                                                <Button size="sm" onClick={() => setActiveEditView('post-flight')} className="mt-4 h-8 text-[10px] uppercase font-black">Finalize Flight</Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                                <Separator />
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
                                                            <Scatter data={envelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} />
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
                                                <Button size="sm" onClick={handleSaveToBooking} disabled={isCompleted} className="w-full h-10 uppercase text-xs font-black bg-emerald-700">Save Load config</Button>
                                            </div>
                                            <ScrollArea className="h-[400px] pr-4">
                                                <div className="space-y-4">
                                                    {stations.map(s => (
                                                        <div key={s.id} className="space-y-1.5 p-3 border rounded-lg bg-background">
                                                            <UILabel className="text-[10px] font-black uppercase text-muted-foreground">{s.name}</UILabel>
                                                            <div className="flex items-center gap-2">
                                                                <Input type="number" value={s.weight} onChange={(e) => handleStationWeightChange(s.id, e.target.value)} disabled={isCompleted} className="h-8 text-xs font-bold" />
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
                    <TabsContent value="navlog" className="m-0 flex h-full min-h-0 flex-1 flex-col">
                        <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border shadow-none">
                            <div className="min-h-0 flex-1 overflow-hidden">
                                <NavlogBuilder booking={booking} tenantId={tenantId!} />
                            </div>
                        </Card>
                    </TabsContent>
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
            <div className="grid grid-cols-2 gap-4">
                <Input type="number" step="0.1" {...form.register('hobbs')} placeholder="Start Hobbs" className="h-9" />
                <Input type="number" step="0.1" {...form.register('tacho')} placeholder="Start Tacho" className="h-9" />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
                <Input type="number" step="0.1" {...form.register('hobbs')} placeholder="End Hobbs" className="h-9" />
                <Input type="number" step="0.1" {...form.register('tacho')} placeholder="End Tacho" className="h-9" />
            </div>
            <Textarea {...form.register('defects')} placeholder="Defects / Notes" />
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button><Button size="sm" type="submit">Complete</Button></div>
        </form>
    );
}

