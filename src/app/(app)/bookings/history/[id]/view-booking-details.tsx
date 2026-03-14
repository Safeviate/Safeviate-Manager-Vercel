
'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useForm } from 'react-hook-form';
import type { Booking } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle, Clock, CheckCircle2, ClipboardCheck, FileClock, History, PencilLine, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/use-permissions';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const FUEL_WEIGHT_PER_GALLON = 6;

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
    const { toast } = useToast();
    const { hasPermission } = usePermissions();
    const tenantId = 'safeviate';

    const [activeEditView, setActiveEditView] = useState<'none' | 'pre-flight' | 'post-flight'>('none');

    const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);
    const allBookingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/bookings`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: instructors, isLoading: loadingIns } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: loadingStu } = useCollection<PilotProfile>(studentsQuery);
    const { data: personnel, isLoading: loadingPer } = useCollection<Personnel>(personnelQuery);
    const { data: allBookings, isLoading: loadingAllBookings } = useCollection<Booking>(allBookingsQuery);

    const aircraft = useMemo(() => aircrafts?.find(a => a.id === booking.aircraftId), [aircrafts, booking.aircraftId]);

    // --- Sequential Logic ---
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

    // --- Calculator State ---
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
        const chartPoints = aircraft.cgEnvelope?.map(p => ({ weight: p.weight, cg: p.cg })) || [];
        const polygon = chartPoints.map(p => ({ x: p.cg, y: p.weight }));
        const safe = polygon.length > 2 ? isPointInPolygon({ x: cg, y: totalWt }, polygon) : false;

        setResults({
            cg: parseFloat(cg.toFixed(2)),
            weight: parseFloat(totalWt.toFixed(1)),
            isSafe: safe
        });
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
                return { ...s, weight: val, gallons: parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
            }
            return { ...s, weight: val };
        }));
    };

    const handleFuelGallonsChange = (id: number, gallons: string) => {
        const val = parseFloat(gallons) || 0;
        setStations(prev => prev.map(s => 
            s.id === id ? { ...s, gallons: val, weight: val * FUEL_WEIGHT_PER_GALLON } : s
        ));
    };

    const handleSaveToBooking = () => {
        if (!firestore) return;
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        updateDocumentNonBlocking(bookingRef, {
            massAndBalance: {
                takeoffWeight: results.weight,
                takeoffCg: results.cg,
                isWithinLimits: results.isSafe,
                stations: stations
            }
        });
        toast({ title: 'Mass & Balance Saved' });
    };

    const handleApprove = () => {
        if (!firestore) return;
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        updateDocumentNonBlocking(bookingRef, { status: 'Approved' });
        toast({ title: 'Flight Approved' });
    };

    const aircraftLabel = useMemo(() => {
        return aircraft ? `${aircraft.tailNumber} (${aircraft.model})` : booking.aircraftId;
    }, [aircraft, booking.aircraftId]);

    const instructorLabel = useMemo(() => {
        if (!booking.instructorId) return 'N/A';
        const ins = instructors?.find(i => i.id === booking.instructorId) || personnel?.find(p => p.id === booking.instructorId);
        return ins ? `${ins.firstName} ${ins.lastName}` : booking.instructorId;
    }, [instructors, personnel, booking.instructorId]);

    const studentLabel = useMemo(() => {
        if (!booking.studentId) return 'N/A';
        const stu = students?.find(s => s.id === booking.studentId);
        return stu ? `${stu.firstName} ${stu.lastName}` : booking.studentId;
    }, [students, booking.studentId]);

    if (loadingAc || loadingIns || loadingStu || loadingPer || loadingAllBookings) {
        return <Skeleton className="h-64 w-full" />;
    }

    const envelope = aircraft?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
    const canApprove = hasPermission('bookings-approve');
    const canLogPre = hasPermission('bookings-preflight-manage');
    const canLogPost = hasPermission('bookings-postflight-manage');
    const isApprovableState = booking.status !== 'Approved' && booking.status !== 'Completed' && !booking.status.startsWith('Cancelled');
    const isApproved = booking.status === 'Approved' || booking.status === 'Completed';

    return (
        <Card className="shadow-none border flex flex-col h-[calc(100vh-180px)] overflow-hidden">
            <CardHeader className="border-b bg-muted/20 shrink-0">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            {booking.type}
                            <Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge>
                        </CardTitle>
                        <CardDescription>
                            Booking Number: {booking.bookingNumber} • {aircraftLabel}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        {flightHours !== null && (
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Flight Time</p>
                                <p className="text-3xl font-bold text-primary flex items-center justify-end gap-2">
                                    <Clock className="h-6 w-6" />
                                    {flightHours}h
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            <ScrollArea className="flex-1">
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                    <DetailItem label="Aircraft" value={aircraftLabel} />
                    <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                    <DetailItem label="Schedule" value={`${formatDateSafe(booking.start, 'p')} - ${formatDateSafe(booking.end, 'p')}`} />
                    <DetailItem label="Instructor" value={instructorLabel} />
                    <DetailItem label="Student" value={studentLabel} />
                    <div className="md:col-span-2 lg:col-span-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Schedule Notes</p>
                        <p className="text-sm font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                    </div>
                </CardContent>

                <Separator className="my-2" />

                {/* Technical Logs Section */}
                <CardHeader className="pb-2">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Flight Technical Log
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-2 pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Pre-Flight Data Display/Form */}
                        <div className={cn("space-y-4 p-4 rounded-xl border bg-muted/10 transition-all", !booking.preFlight && !canLogPre && "opacity-50 grayscale")}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                                    Pre-Flight Record
                                </h3>
                                {!booking.preFlight && canLogPre && !isPreFlightBlocked && activeEditView !== 'pre-flight' && (
                                    <Button size="sm" onClick={() => setActiveEditView('pre-flight')} className="h-7 text-[10px] gap-1 px-2">
                                        <PencilLine className="h-3 w-3" /> Record
                                    </Button>
                                )}
                                {booking.preFlight && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-green-200">Completed</Badge>}
                            </div>

                            {isPreFlightBlocked && !booking.preFlight && (
                                <p className="text-[10px] text-destructive bg-destructive/10 p-2 rounded">
                                    Log restricted: Waiting for Booking #{precedingBooking?.bookingNumber} to finalize.
                                </p>
                            )}

                            {activeEditView === 'pre-flight' ? (
                                <PreFlightLogForm 
                                    booking={booking} 
                                    aircraft={aircraft!} 
                                    tenantId={tenantId} 
                                    onCancel={() => setActiveEditView('none')} 
                                    onSuccess={() => setActiveEditView('none')}
                                />
                            ) : booking.preFlightData ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Start Hobbs" value={booking.preFlightData.hobbs.toFixed(1)} />
                                    <DetailItem label="Start Tacho" value={booking.preFlightData.tacho.toFixed(1)} />
                                    <DetailItem label="Fuel on Board" value={`${booking.preFlightData.fuelOnBoard} Gal`} />
                                    <DetailItem label="Oil Uplift" value={`${booking.preFlightData.oilUplift} Qts`} />
                                    <div className="col-span-2">
                                        <DetailItem label="Documents Checked">
                                            <Badge variant={booking.preFlightData.documentsChecked ? "default" : "destructive"} className="text-[10px]">
                                                {booking.preFlightData.documentsChecked ? "Verified" : "Missing/Incomplete"}
                                            </Badge>
                                        </DetailItem>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic py-4">No pre-flight data recorded.</p>
                            )}
                        </div>

                        {/* Post-Flight Data Display/Form */}
                        <div className={cn("space-y-4 p-4 rounded-xl border bg-muted/10 transition-all", !booking.postFlight && (!canLogPost || !isApproved) && "opacity-50 grayscale")}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <FileClock className="h-4 w-4 text-blue-600" />
                                    Post-Flight Record
                                </h3>
                                {!booking.postFlight && canLogPost && isApproved && activeEditView !== 'post-flight' && (
                                    <Button size="sm" onClick={() => setActiveEditView('post-flight')} className="h-7 text-[10px] gap-1 px-2">
                                        <PencilLine className="h-3 w-3" /> Record
                                    </Button>
                                )}
                                {booking.postFlight && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">Finalized</Badge>}
                            </div>
                            
                            {!isApproved && !booking.postFlight && (
                                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded flex items-center gap-2 text-[10px] text-amber-800 dark:text-amber-200">
                                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                    <span>Approval required before recording post-flight results.</span>
                                </div>
                            )}

                            {activeEditView === 'post-flight' ? (
                                <PostFlightLogForm 
                                    booking={booking} 
                                    aircraft={aircraft!} 
                                    tenantId={tenantId} 
                                    onCancel={() => setActiveEditView('none')} 
                                    onSuccess={() => setActiveEditView('none')}
                                />
                            ) : booking.postFlightData ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="End Hobbs" value={booking.postFlightData.hobbs.toFixed(1)} />
                                    <DetailItem label="End Tacho" value={booking.postFlightData.tacho.toFixed(1)} />
                                    <DetailItem label="Fuel Remaining" value={`${booking.postFlightData.fuelRemaining} Gal`} />
                                    <div className="col-span-2">
                                        <DetailItem label="Defects / Observations" value={booking.postFlightData.defects || "None reported."} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic py-4">Waiting for approval and flight completion.</p>
                            )}
                        </div>
                    </div>
                </CardContent>

                <Separator className="my-2" />

                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-primary" />
                            Technical Inspection & Approval
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {canApprove && isApprovableState && (
                                <Button 
                                    onClick={handleApprove} 
                                    disabled={!booking.preFlight}
                                    title={!booking.preFlight ? "Requires recorded Pre-Flight Checklist" : ""}
                                    className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm h-8 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle2 className="h-4 w-4" /> Approve Flight
                                </Button>
                            )}
                            {aircraft?.cgEnvelope && (
                                <Button size="sm" onClick={handleSaveToBooking} variant="outline" className="gap-2 h-8 px-3 text-xs">
                                    <Save className="h-4 w-4" /> Save to Booking
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 pb-10">
                    {!aircraft?.cgEnvelope ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            This aircraft does not have a Mass & Balance profile configured.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                            <div className="space-y-6">
                                <div className="relative border rounded-xl p-4 bg-background overflow-hidden h-[600px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={['auto', 'auto']} allowDataOverflow>
                                                <Label value="CG (inches)" position="insideBottom" offset={-10} />
                                            </XAxis>
                                            <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={['auto', 'auto']} allowDataOverflow>
                                                <Label value="Weight (lbs)" angle={-90} position="insideLeft" />
                                            </YAxis>
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                            <Scatter data={envelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} />
                                            <Scatter data={[{ x: results.cg, y: results.weight }]}>
                                                <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={2} />
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                    
                                    <div className={cn(
                                        "absolute bottom-4 right-4 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-white",
                                        results.isSafe ? 'bg-green-600' : 'bg-red-600'
                                    )}>
                                        {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS"}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <Card className="bg-muted/30 shadow-none border-none">
                                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Weight</p>
                                            <p className="text-xl font-bold">{results.weight} <span className="text-xs font-normal">lbs</span></p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Center Gravity</p>
                                            <p className="text-xl font-bold">{results.cg} <span className="text-xs font-normal">in</span></p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Loading Stations</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm border-b pb-2">
                                            <span className="text-muted-foreground">Basic Empty Weight</span>
                                            <span className="font-bold">{aircraft.emptyWeight} lbs</span>
                                        </div>
                                        {stations.map((s) => (
                                            <div key={s.id} className="space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <UILabel className="text-xs font-semibold">{s.name}</UILabel>
                                                    <span className="text-[10px] text-muted-foreground">Arm: {s.arm}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <Input 
                                                            type="number" 
                                                            value={s.weight} 
                                                            onChange={(e) => handleStationWeightChange(s.id, e.target.value)}
                                                            className="h-8 text-right pr-8 text-xs"
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">LBS</span>
                                                    </div>
                                                    {s.type === 'fuel' && (
                                                        <div className="flex items-center gap-1 w-24">
                                                            <div className="relative">
                                                                <Input 
                                                                    type="number" 
                                                                    value={s.gallons} 
                                                                    onChange={(e) => handleFuelGallonsChange(s.id, e.target.value)}
                                                                    className="h-8 w-full p-1 text-right text-[10px] pr-8"
                                                                />
                                                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground">GAL</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </ScrollArea>
        </Card>
    );
}

function PreFlightLogForm({ booking, aircraft, tenantId, onCancel, onSuccess }: { booking: Booking, aircraft: Aircraft, tenantId: string, onCancel: () => void, onSuccess: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        defaultValues: booking.preFlightData || {
            hobbs: aircraft.currentHobbs || 0,
            tacho: aircraft.currentTacho || 0,
            fuelOnBoard: 0,
            oilUplift: 0,
            documentsChecked: true,
        }
    });

    const handleSave = async (data: any) => {
        if (!firestore) return;
        setIsSaving(true);
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        updateDocumentNonBlocking(bookingRef, {
            preFlight: true,
            preFlightData: data,
        });
        toast({ title: 'Pre-Flight Saved' });
        onSuccess();
        setIsSaving(false);
    }

    return (
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Start Hobbs</UILabel>
                    <Input type="number" step="0.1" {...form.register('hobbs', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Start Tacho</UILabel>
                    <Input type="number" step="0.1" {...form.register('tacho', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Fuel On Board (Gal)</UILabel>
                    <Input type="number" {...form.register('fuelOnBoard', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Oil Uplift (Qts)</UILabel>
                    <Input type="number" step="0.5" {...form.register('oilUplift', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="col-span-full flex items-center space-x-2 pt-1">
                    <Switch checked={form.watch('documentsChecked')} onCheckedChange={(val) => form.setValue('documentsChecked', val)} className="scale-75" />
                    <UILabel className="text-xs">Docs Verified</UILabel>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-7 text-[10px]">Cancel</Button>
                <Button type="submit" size="sm" disabled={isSaving} className="h-7 text-[10px]">Save Pre-Flight</Button>
            </div>
        </form>
    )
}

function PostFlightLogForm({ booking, aircraft, tenantId, onCancel, onSuccess }: { booking: Booking, aircraft: Aircraft, tenantId: string, onCancel: () => void, onSuccess: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        defaultValues: booking.postFlightData || {
            hobbs: (booking.preFlightData?.hobbs || aircraft.currentHobbs || 0) + 1,
            tacho: (booking.preFlightData?.tacho || aircraft.currentTacho || 0) + 0.8,
            fuelRemaining: 0,
            defects: '',
        }
    });

    const handleSave = async (data: any) => {
        if (!firestore) return;
        
        // Simple range validation
        if (data.hobbs < (booking.preFlightData?.hobbs || 0)) {
            toast({ variant: 'destructive', title: 'Invalid Reading', description: 'End Hobbs cannot be less than Start Hobbs.' });
            return;
        }

        setIsSaving(true);
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);

        updateDocumentNonBlocking(bookingRef, {
            postFlight: true,
            postFlightData: data,
            status: 'Completed'
        });

        updateDocumentNonBlocking(aircraftRef, {
            currentHobbs: data.hobbs,
            currentTacho: data.tacho,
        });

        toast({ title: 'Flight Finalized', description: 'Aircraft total hours have been updated.' });
        onSuccess();
        setIsSaving(false);
    }

    return (
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">End Hobbs</UILabel>
                    <Input type="number" step="0.1" {...form.register('hobbs', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">End Tacho</UILabel>
                    <Input type="number" step="0.1" {...form.register('tacho', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Fuel Remaining (Gal)</UILabel>
                    <Input type="number" {...form.register('fuelRemaining', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="col-span-full space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Defects / Observations</UILabel>
                    <Textarea placeholder="Any mechanical issues or findings?" {...form.register('defects')} className="min-h-[60px] text-xs py-1" />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-7 text-[10px]">Cancel</Button>
                <Button type="submit" size="sm" disabled={isSaving} className="h-7 text-[10px]">Finalize Flight</Button>
            </div>
        </form>
    )
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case 'Approved': return 'default'; 
        case 'Completed': return 'secondary';
        case 'Cancelled':
        case 'Cancelled with Reason': return 'destructive';
        case 'Confirmed': return 'outline';
        default: return 'outline';
    }
}
