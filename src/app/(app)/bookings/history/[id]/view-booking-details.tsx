'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, doc, arrayUnion } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useForm } from 'react-hook-form';
import type { Booking, OverrideLog } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Cell } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle, Clock, CheckCircle2, ClipboardCheck, FileClock, History, PencilLine, ShieldAlert, Lock, Edit2, ShieldCheck, UserCheck, Map as NavIcon, FileText } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NavlogBuilder } from '../../navlog-builder';
import { calculateFuelGallonsFromWeight, calculateFuelWeight, gallonsToLitres, getFuelPreset, poundsToKilograms, type FuelType } from '@/lib/fuel';
import { useIsMobile } from '@/hooks/use-mobile';

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

    if (ticks[ticks.length - 1] < end && (end - ticks[ticks.length - 1]) < step * 0.1) {
        ticks.push(end);
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
                const fuelStation = normalizeFuelStation(s);
                const density = Number(fuelStation.densityLbPerGallon) || getFuelPreset(fuelStation.fuelType).densityLbPerGallon;
                const maxGallons = Math.max(Number(fuelStation.maxGallons) || 0, 0);
                const gallons = clamp(calculateFuelGallonsFromWeight(val, density), 0, maxGallons);
                return {
                    ...fuelStation,
                    weight: parseFloat(calculateFuelWeight(gallons, density).toFixed(1)),
                    gallons: parseFloat(gallons.toFixed(1))
                };
            }
            return { ...s, weight: val };
        }));
    };

    const handleFuelGallonsChange = (id: number, gallons: string) => {
        const val = parseFloat(gallons) || 0;
        setStations(prev => prev.map(s => 
            s.id === id
                ? (() => {
                    const fuelStation = normalizeFuelStation(s);
                    const density = Number(fuelStation.densityLbPerGallon) || getFuelPreset(fuelStation.fuelType).densityLbPerGallon;
                    const maxGallons = Math.max(Number(fuelStation.maxGallons) || 0, 0);
                    const clampedGallons = clamp(val, 0, maxGallons);
                    return {
                        ...fuelStation,
                        gallons: parseFloat(clampedGallons.toFixed(1)),
                        weight: parseFloat(calculateFuelWeight(clampedGallons, density).toFixed(1))
                    };
                })()
                : s
        ));
    };

    const handleFuelTypeChange = (id: number, fuelType: FuelType) => {
        setStations(prev => prev.map(s => {
            if (s.id !== id) return s;
            const fuelStation = normalizeFuelStation(s);
            const preset = getFuelPreset(fuelType);
            const gallons = Number(fuelStation.gallons) || 0;
            return {
                ...fuelStation,
                fuelType,
                densityLbPerGallon: preset.densityLbPerGallon,
                weight: parseFloat(calculateFuelWeight(gallons, preset.densityLbPerGallon).toFixed(1))
            };
        }));
    };

    const handleSaveToBooking = () => {
        if (!firestore || !tenantId) return;
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
        if (!firestore || !tenantId) return;
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        const updateData: any = { status: 'Approved' };

        if (userProfile) {
            updateData.approvedById = userProfile.id;
            updateData.approvedByName = `${userProfile.firstName} ${userProfile.lastName}`;
        }

        // Record Override Audit
        if (!booking.preFlight && hasPermission('bookings-approve-override') && userProfile) {
            const reason = window.prompt("A pre-flight checklist has not been recorded. Please provide a reason for overriding this requirement:");
            if (!reason) {
                toast({ variant: 'destructive', title: 'Override Cancelled', description: 'A reason is required to proceed with an override.' });
                return;
            }
            const log: OverrideLog = {
                userId: userProfile.id,
                userName: `${userProfile.firstName} ${userProfile.lastName}`,
                permissionId: 'bookings-approve-override',
                action: 'Flight Approved without recorded pre-flight checklist',
                reason: reason,
                timestamp: new Date().toISOString()
            };
            updateData.overrides = arrayUnion(log);
        }

        updateDocumentNonBlocking(bookingRef, updateData);
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
    const allX = [...envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
    const allY = [...envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
    const paddingX = allX.length > 1 ? (Math.max(...allX) - Math.min(...allX)) * 0.1 : 5;
    const paddingY = allY.length > 1 ? (Math.max(...allY) - Math.min(...allY)) * 0.1 : 100;
    const finalXMin = allX.length > 0 ? Math.min(...allX) - paddingX : 70;
    const finalXMax = allX.length > 0 ? Math.max(...allX) + paddingX : 100;
    const finalYMin = allY.length > 0 ? Math.min(...allY) - paddingY : 1000;
    const finalYMax = allY.length > 0 ? Math.max(...allY) + paddingY : 3000;
    const xAxisTicks = generateNiceTicks(finalXMin, finalXMax, 8);
    const yAxisTicks = generateNiceTicks(finalYMin, finalYMax, 8);
    const canApprove = hasPermission('bookings-approve');
    const canOverride = hasPermission('bookings-approve-override');
    const canLogPre = hasPermission('bookings-preflight-manage');
    const canLogPost = hasPermission('bookings-postflight-manage');
    const canOverrideTechLog = hasPermission('bookings-techlog-override');
    
    const isApprovableState = booking.status !== 'Approved' && booking.status !== 'Completed' && !booking.status.startsWith('Cancelled');
    const isApproved = booking.status === 'Approved' || booking.status === 'Completed';
    const isCompleted = booking.status === 'Completed';

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <Tabs defaultValue="flight-details" className="flex w-full min-h-0 flex-1 flex-col">
                <div className="shrink-0 px-1">
                    <TabsList className="mb-4 h-auto flex-wrap justify-start gap-2 border-b-0 bg-transparent p-0">
                        <TabsTrigger 
                            value="flight-details" 
                            className="gap-2 rounded-full border px-4 py-2 text-xs data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground sm:px-6 sm:text-sm"
                        >
                            <FileText className="h-4 w-4" /> Flight Details
                        </TabsTrigger>
                        <TabsTrigger 
                            value="navlog" 
                            className="gap-2 rounded-full border px-4 py-2 text-xs data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground sm:px-6 sm:text-sm"
                        >
                            <NavIcon className="h-4 w-4" /> Navlog
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <TabsContent value="flight-details" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                        <Card className={cn(
                            "flex min-h-0 flex-col overflow-hidden border shadow-none",
                            isMobile ? "h-full flex-1" : "h-[calc(100vh-240px)]"
                        )}>
                            <CardHeader className="border-b bg-muted/20 shrink-0">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0 space-y-1">
                                        <CardTitle className="flex flex-wrap items-center gap-2">
                                            {booking.type}
                                            <Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge>
                                        </CardTitle>
                                        <CardDescription className="break-words">
                                            Booking Number: {booking.bookingNumber} • {aircraftLabel}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
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
                            
                            <ScrollArea className="min-h-0 flex-1">
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                                    <DetailItem label="Aircraft" value={aircraftLabel} />
                                    <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                    <DetailItem label="Schedule" value={`${formatDateSafe(booking.start, 'p')} - ${formatDateSafe(booking.end, 'p')}`} />
                                    <DetailItem label="Instructor" value={instructorLabel} />
                                    <DetailItem label="Student" value={studentLabel} />
                                    <DetailItem label="Approved By">
                                        {booking.approvedByName ? (
                                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                                                <UserCheck className="h-3.5 w-3.5 text-green-600" />
                                                {booking.approvedByName}
                                            </div>
                                        ) : 'Pending'}
                                    </DetailItem>
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Schedule Notes</p>
                                        <p className="text-sm font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                                    </div>
                                </CardContent>

                                {booking.overrides && booking.overrides.length > 0 && (
                                    <div className="px-6 mb-4">
                                        <h4 className="text-[10px] font-bold uppercase text-amber-600 mb-2 flex items-center gap-1">
                                            <ShieldCheck className="h-3 w-3" /> Audit Log: Overrides Active
                                        </h4>
                                        <div className="space-y-1.5">
                                            {booking.overrides.map((ov, i) => (
                                                <div key={i} className="text-[10px] bg-amber-50 border border-amber-100 p-2 rounded flex flex-col gap-1">
                                                    <div className="flex justify-between items-center">
                                                        <span><span className="font-bold">{ov.userName}</span>: {ov.action}</span>
                                                        <span className="text-muted-foreground">{format(new Date(ov.timestamp), 'dd MMM HH:mm')}</span>
                                                    </div>
                                                    <p className="text-[9px] text-amber-900 border-t border-amber-200/50 pt-1 mt-1">
                                                        <span className="font-bold uppercase opacity-70">Reason:</span> {ov.reason}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Separator className="my-2" />

                                {/* Technical Logs Section */}
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <History className="h-5 w-5 text-primary" />
                                        Flight Technical Log
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-8 pt-2 pb-10">
                                    {isCompleted && (
                                        <div className="bg-muted border border-border p-4 rounded-xl flex items-center gap-3">
                                            <Lock className="h-5 w-5 text-muted-foreground" />
                                            <div className="text-xs text-muted-foreground">
                                                <p className="font-bold">Record Finalized</p>
                                                <p>This technical log is closed and the aircraft airframe hours have been updated. No further edits are possible.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Pre-Flight Data Display/Form */}
                                        <div className={cn("space-y-4 p-4 rounded-xl border bg-muted/10 transition-all", !booking.preFlight && !canLogPre && "opacity-50 grayscale")}>
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                                                    Pre-Flight Record
                                                </h3>
                                                {!booking.preFlight && canLogPre && (!isPreFlightBlocked || canOverrideTechLog) && activeEditView !== 'pre-flight' && (
                                                    <Button size="sm" onClick={() => setActiveEditView('pre-flight')} className="h-7 text-[10px] gap-1 px-2">
                                                        <PencilLine className="h-3 w-3" /> Record
                                                    </Button>
                                                )}
                                                {booking.preFlight && !isCompleted && canOverrideTechLog && activeEditView !== 'pre-flight' && (
                                                    <Button size="sm" variant="ghost" onClick={() => setActiveEditView('pre-flight')} className="h-7 text-[10px] gap-1 px-2">
                                                        <Edit2 className="h-3 w-3" /> Edit
                                                    </Button>
                                                )}
                                                {booking.preFlight && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-green-200">Completed</Badge>}
                                            </div>

                                            {isPreFlightBlocked && !booking.preFlight && !isCompleted && (
                                                <p className="text-[10px] text-destructive bg-destructive/10 p-2 rounded">
                                                    Log restricted: Waiting for Booking #{precedingBooking?.bookingNumber} to finalize.
                                                    {canOverrideTechLog && <span className="block font-bold mt-1 text-primary italic">Override active: You can still record pre-flight.</span>}
                                                </p>
                                            )}

                                            {activeEditView === 'pre-flight' ? (
                                                <PreFlightLogForm 
                                                    booking={booking} 
                                                    aircraft={aircraft!} 
                                                    tenantId={tenantId!} 
                                                    onCancel={() => setActiveEditView('none')} 
                                                    onSuccess={() => setActiveEditView('none')}
                                                    isPreFlightBlocked={isPreFlightBlocked}
                                                />
                                            ) : booking.preFlightData ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <DetailItem label="Start Hobbs" value={booking.preFlightData.hobbs.toFixed(1)} />
                                                    <DetailItem label="Start Tacho" value={booking.preFlightData.tacho.toFixed(1)} />
                                                    <DetailItem label="Fuel Uplifted" value={`${booking.preFlightData.fuelUpliftGallons || 0} Gal / ${booking.preFlightData.fuelUpliftLitres || 0} L`} />
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
                                                {!booking.postFlight && canLogPost && isApproved && activeEditView !== 'post-flight' && !isCompleted && (
                                                    <Button size="sm" onClick={() => setActiveEditView('post-flight')} className="h-7 text-[10px] gap-1 px-2">
                                                        <PencilLine className="h-3 w-3" /> Record
                                                    </Button>
                                                )}
                                                {booking.postFlight && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">Finalized</Badge>}
                                            </div>
                                            
                                            {!isApproved && !booking.postFlight && !isCompleted && (
                                                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded flex items-center gap-2 text-[10px] text-amber-800 dark:text-amber-200">
                                                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                                    <span>Approval required before recording post-flight results.</span>
                                                </div>
                                            )}

                                            {activeEditView === 'post-flight' ? (
                                                <PostFlightLogForm 
                                                    booking={booking} 
                                                    aircraft={aircraft!} 
                                                    tenantId={tenantId!} 
                                                    onCancel={() => setActiveEditView('none')} 
                                                    onSuccess={() => setActiveEditView('none')}
                                                />
                                            ) : booking.postFlightData ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <DetailItem label="End Hobbs" value={booking.postFlightData.hobbs.toFixed(1)} />
                                                    <DetailItem label="End Tacho" value={booking.postFlightData.tacho.toFixed(1)} />
                                                    <DetailItem label="Fuel Uplifted" value={`${booking.postFlightData.fuelUpliftGallons || 0} Gal / ${booking.postFlightData.fuelUpliftLitres || 0} L`} />
                                                    <DetailItem label="Oil Uplift" value={`${booking.postFlightData.oilUplift || 0} Qts`} />
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
                                                    disabled={!booking.preFlight && !canOverride}
                                                    title={!booking.preFlight && !canOverride ? "Requires recorded Pre-Flight Checklist" : canOverride && !booking.preFlight ? "Overriding Checklist Requirement" : ""}
                                                    className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm h-8 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" /> 
                                                    {canOverride && !booking.preFlight ? "Approve (Override)" : "Approve Flight"}
                                                </Button>
                                            )}
                                            {aircraft?.cgEnvelope && !isCompleted && (
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
                                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
                                            <div className={cn("space-y-6", isCompleted && "opacity-70 pointer-events-none")}>
                                                <div className="bg-card border border-border rounded-xl p-3 sm:p-4 md:p-5 relative min-h-[400px] sm:min-h-[500px] md:min-h-[580px] flex flex-col justify-center items-center overflow-hidden shadow-none">
                                                    <div className="w-full max-w-5xl">
                                                        <p className="mb-2 w-full pl-1 text-left text-[11px] font-semibold text-muted-foreground sm:pl-6 md:pl-8">
                                                            Gross Weight (lbs)
                                                        </p>
                                                        <div className="h-[280px] sm:h-[430px] md:h-[520px]">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <ScatterChart margin={{ top: 12, right: 8, bottom: 24, left: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                                    <XAxis
                                                                        type="number"
                                                                        dataKey="x"
                                                                        name="CG"
                                                                        unit=" in"
                                                                        domain={[finalXMin, finalXMax]}
                                                                        ticks={xAxisTicks}
                                                                        allowDataOverflow
                                                                        stroke="hsl(var(--muted-foreground))"
                                                                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                                        dy={10}
                                                                    />
                                                                    <YAxis
                                                                        type="number"
                                                                        dataKey="y"
                                                                        name="Weight"
                                                                        unit=" lbs"
                                                                        domain={[finalYMin, finalYMax]}
                                                                        ticks={yAxisTicks}
                                                                        allowDataOverflow
                                                                        stroke="hsl(var(--muted-foreground))"
                                                                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                                    />
                                                                    <Tooltip
                                                                        cursor={{ strokeDasharray: '3 3' }}
                                                                        contentStyle={{
                                                                            backgroundColor: 'hsl(var(--background))',
                                                                            border: '1px solid hsl(var(--border))',
                                                                            color: 'hsl(var(--foreground))'
                                                                        }}
                                                                    />
                                                                    <Scatter
                                                                        name="Envelope Line"
                                                                        data={envelope}
                                                                        fill="transparent"
                                                                        line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                                                                        shape={() => null}
                                                                        isAnimationActive={false}
                                                                    />
                                                                    <Scatter name="Envelope Points" data={envelope} isAnimationActive={false}>
                                                                        {envelope.map((entry, index) => (
                                                                            <Cell key={`history-envelope-${index}`} fill={POINT_COLORS[index % POINT_COLORS.length]} stroke="white" strokeWidth={1} />
                                                                        ))}
                                                                    </Scatter>
                                                                    <Scatter
                                                                        name="Current Load"
                                                                        data={[{ x: results.cg, y: results.weight }]}
                                                                        fill={results.isSafe ? "#10b981" : "#ef4444"}
                                                                        isAnimationActive={false}
                                                                    >
                                                                        <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={2} />
                                                                    </Scatter>
                                                                </ScatterChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <p className="mt-2 text-center text-xs text-muted-foreground sm:text-sm">
                                                            CG (inches)
                                                        </p>
                                                    </div>

                                                    <p className="mt-3 px-2 text-center text-[10px] leading-tight text-red-600 font-extrabold uppercase tracking-[0.2em] pointer-events-none drop-shadow-md sm:text-sm md:absolute md:bottom-24 md:left-1/2 md:mt-0 md:-translate-x-1/2 md:text-base md:whitespace-nowrap">
                                                        CONSULT AIRCRAFT POH BEFORE FLIGHT
                                                    </p>

                                                    <div className={cn(
                                                        "mt-3 self-end px-4 py-2 text-sm rounded-full font-bold shadow-lg flex items-center gap-2 sm:px-6 md:absolute md:bottom-4 md:right-4 md:mt-0",
                                                        results.isSafe ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'
                                                    )}>
                                                        <div className={cn("w-2 h-2 rounded-full", 'bg-white')} />
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

                                                <div className={cn("space-y-4", isCompleted && "opacity-70 pointer-events-none")}>
                                                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Loading Stations</h4>
                                                        <div className="space-y-3 text-sm">
                                                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                                            <span className="text-muted-foreground">Basic Empty Weight</span>
                                                            <span className="font-bold">{aircraft.emptyWeight} lbs</span>
                                                        </div>
                                                        {stations.map((s) => (
                                                                    <div key={s.id} className="space-y-2 text-sm">
                                                                        <div className="flex justify-between items-center">
                                                                            <UILabel className="text-sm font-semibold">{s.name}</UILabel>
                <span className="text-sm text-muted-foreground">Arm: {s.arm}</span>
                                                                        </div>

                                                                        {s.type === 'fuel' ? (
                                                                            <div className="space-y-2">
                                                                                <Select value={(s.fuelType || 'AVGAS') as FuelType} onValueChange={(value) => handleFuelTypeChange(s.id, value as FuelType)} disabled={isCompleted}>
                                                                                    <SelectTrigger className="h-8 text-sm">
                                                                                        <SelectValue placeholder="Fuel type" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                <SelectItem value="AVGAS">Avgas (6.0 lb/gal)</SelectItem>
                                                                                <SelectItem value="JET_A1">Jet A-1 (6.7 lb/gal)</SelectItem>
                                                                                <SelectItem value="JET_A">Jet A (6.7 lb/gal)</SelectItem>
                                                                                <SelectItem value="MOGAS">Mogas (6.0 lb/gal)</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                        <div className="flex h-8 items-center justify-between gap-4 rounded border border-border bg-background px-3 shadow-inner">
                                                                                            <Input
                                                                                                type="number"
                                                                                                value={s.gallons || ''}
                                                                                                onChange={(e) => handleFuelGallonsChange(s.id, e.target.value)}
                                className="h-auto w-16 border-none bg-transparent p-0 text-right text-sm font-bold shadow-none focus-visible:ring-0"
                                                                                                disabled={isCompleted}
                                                                                            />
                            <span className="shrink-0 text-sm font-medium text-muted-foreground">
                                                                                                {formatLitres(Number(s.gallons) || 0)} L
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex h-8 items-center justify-between gap-4 rounded border border-border bg-background px-3 shadow-inner">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-sm font-bold text-foreground">
                                                                                                    {Number(s.maxGallons) || 0}
                                                                                                </span>
                                <span className="text-sm font-semibold uppercase text-muted-foreground">max gal</span>
                                                                                            </div>
                            <span className="shrink-0 text-sm font-medium text-muted-foreground">
                                                                                                {formatLitres(Number(s.maxGallons) || 0)} L
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="col-span-2 rounded border border-border bg-muted/30 px-2 py-1 text-sm font-semibold text-muted-foreground text-right">
                                                                                            <span className="text-foreground">{s.weight || 0} LB</span>
                                                                                            <span className="mx-1 text-muted-foreground/60">/</span>
                                                                                            <span>{formatKilograms(Number(s.weight) || 0)} KG</span>
                                                                            </div>
                                                                        </div>
                                                                        <input
                                                                            type="range"
                                                                            min="0"
                                                                            max={s.maxGallons || 50}
                                                                            value={s.gallons || 0}
                                                                            onChange={(e) => handleFuelGallonsChange(s.id, e.target.value)}
                                                                            className="w-full h-1 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-yellow-500 block mt-1"
                                                                            disabled={isCompleted}
                                                                        />
                                                                    </div>
            ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_60px] gap-2">
                    <Input 
                        type="number" 
                        value={s.weight} 
                                                                                        onChange={(e) => handleStationWeightChange(s.id, e.target.value)}
                                                                                        className="h-8 text-right text-base"
                                                                                        disabled={isCompleted}
                                                                                    />
                                                                                    <div className="flex h-8 items-center justify-center rounded-md border border-input bg-muted/30 text-sm font-bold tracking-wide text-muted-foreground">
                                                                                        LBS
                                                                                    </div>
                                                                                </div>
            )}
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
                    </TabsContent>

                    <TabsContent value="navlog" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                        <NavlogBuilder booking={booking} tenantId={tenantId!} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function PreFlightLogForm({ booking, aircraft, tenantId, onCancel, onSuccess, isPreFlightBlocked }: { booking: Booking, aircraft: Aircraft, tenantId: string, onCancel: () => void, onSuccess: () => void, isPreFlightBlocked: boolean }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { hasPermission } = usePermissions();
    const { userProfile } = useUserProfile();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        defaultValues: booking.preFlightData || {
            hobbs: aircraft.currentHobbs || 0,
            tacho: aircraft.currentTacho || 0,
            fuelUpliftGallons: 0,
            fuelUpliftLitres: 0,
            oilUplift: 0,
            documentsChecked: false,
        }
    });

    const isDocsVerified = form.watch('documentsChecked');

    const handleSave = async (data: any) => {
        if (!firestore) return;
        
        if (!data.documentsChecked) {
            toast({ variant: 'destructive', title: 'Action Required', description: 'You must verify that all documents are checked.' });
            return;
        }

        setIsSaving(true);
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        
        const updateData: any = {
            preFlight: true,
            preFlightData: data,
        };

        // Record Override Audits
        const logs: OverrideLog[] = [];
        
        if (booking.preFlight && hasPermission('bookings-techlog-override') && userProfile) {
            const reason = window.prompt("You are modifying an already completed pre-flight record. Please provide a reason:");
            if (!reason) {
                toast({ variant: 'destructive', title: 'Save Cancelled', description: 'A reason is required to proceed with this modification.' });
                setIsSaving(false);
                return;
            }
            logs.push({
                userId: userProfile.id,
                userName: `${userProfile.firstName} ${userProfile.lastName}`,
                permissionId: 'bookings-techlog-override',
                action: 'Modified already completed pre-flight technical log',
                reason: reason,
                timestamp: new Date().toISOString()
            });
        }

        if (isPreFlightBlocked && hasPermission('bookings-techlog-override') && userProfile) {
            const reason = window.prompt("The aircraft's previous flight has not been finalized. Please provide a reason for overriding this sequence:");
            if (!reason) {
                toast({ variant: 'destructive', title: 'Save Cancelled', description: 'A reason is required to proceed with this sequence override.' });
                setIsSaving(false);
                return;
            }
            logs.push({
                userId: userProfile.id,
                userName: `${userProfile.firstName} ${userProfile.lastName}`,
                permissionId: 'bookings-techlog-override',
                action: 'Recorded pre-flight log while previous flight was outstanding',
                reason: reason,
                timestamp: new Date().toISOString()
            });
        }

        if (logs.length > 0) {
            updateData.overrides = arrayUnion(...logs);
        }

        updateDocumentNonBlocking(bookingRef, updateData);
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
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Fuel Uplift (Gal)</UILabel>
                    <Input type="number" step="0.1" {...form.register('fuelUpliftGallons', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Fuel Uplift (Litres)</UILabel>
                    <Input type="number" step="0.1" {...form.register('fuelUpliftLitres', { valueAsNumber: true })} className="h-8 text-xs" />
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
                <Button type="submit" size="sm" disabled={isSaving || !isDocsVerified} className="h-7 text-[10px]">Save Pre-Flight</Button>
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
            fuelUpliftGallons: 0,
            fuelUpliftLitres: 0,
            oilUplift: 0,
            defects: '',
        }
    });

    const handleSave = async (data: any) => {
        if (!firestore) return;
        
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
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Fuel Uplift (Gal)</UILabel>
                    <Input type="number" step="0.1" {...form.register('fuelUpliftGallons', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Fuel Uplift (Litres)</UILabel>
                    <Input type="number" step="0.1" {...form.register('fuelUpliftLitres', { valueAsNumber: true })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                    <UILabel className="text-[10px] uppercase font-bold text-muted-foreground">Oil Uplift (Qts)</UILabel>
                    <Input type="number" step="0.5" {...form.register('oilUplift', { valueAsNumber: true })} className="h-8 text-xs" />
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
