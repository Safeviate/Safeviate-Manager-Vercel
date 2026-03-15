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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { CheckCircle2, ClipboardCheck, FileClock, History, Clock, PencilLine, Edit2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

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

    const isLoading = loadingAc || loadingIns || loadingStu || loadingPer || loadingAllBookings;

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

    const flightHours = useMemo(() => {
        if (booking.status === 'Completed' && booking.postFlightData?.hobbs !== undefined && booking.preFlightData?.hobbs !== undefined) {
            return (booking.postFlightData.hobbs - booking.preFlightData.hobbs).toFixed(1);
        }
        return null;
    }, [booking]);

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

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />;
    }

    const canApprove = hasPermission('bookings-approve');
    const canOverride = hasPermission('bookings-approve-override');
    const canLogPre = hasPermission('bookings-preflight-manage');
    const canLogPost = hasPermission('bookings-postflight-manage');
    const canOverrideTechLog = hasPermission('bookings-techlog-override');
    
    const isApprovableState = booking.status !== 'Approved' && booking.status !== 'Completed' && !booking.status.startsWith('Cancelled');

    return (
        <Card className="shadow-none border flex flex-col h-[calc(100vh-180px)] overflow-hidden">
            <CardHeader className="border-b bg-muted/20 shrink-0">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle>{booking.type}</CardTitle>
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
                        {canApprove && isApprovableState && (
                            <Button 
                                onClick={handleApprove} 
                                disabled={!booking.preFlight && !canOverride}
                                title={!booking.preFlight && !canOverride ? "Requires recorded Pre-Flight Checklist" : canOverride && !booking.preFlight ? "Overriding Checklist Requirement" : ""}
                                className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                            >
                                <CheckCircle2 className="h-4 w-4" /> 
                                {canOverride && !booking.preFlight ? "Approve (Override)" : "Approve Flight"}
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <ScrollArea className="flex-1">
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                    <DetailItem label="Status">
                        <Badge variant={booking.status === 'Approved' ? 'default' : 'secondary'}>{booking.status}</Badge>
                    </DetailItem>
                    <DetailItem label="Aircraft" value={aircraftLabel} />
                    <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                    <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                    <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                    <DetailItem label="Instructor" value={instructorLabel} />
                    <DetailItem label="Student" value={studentLabel} />
                    <div className="md:col-span-2 lg:col-span-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
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
                        <div className={cn("space-y-4 p-4 rounded-xl border bg-muted/10", !booking.preFlight && !canLogPre && "opacity-50 grayscale")}>
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
                                {booking.preFlight && booking.status !== 'Completed' && canOverrideTechLog && activeEditView !== 'pre-flight' && (
                                    <Button size="sm" variant="ghost" onClick={() => setActiveEditView('pre-flight')} className="h-7 text-[10px] gap-1 px-2">
                                        <Edit2 className="h-3 w-3" /> Edit
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
                        <div className={cn("space-y-4 p-4 rounded-xl border bg-muted/10", !booking.postFlight && (!canLogPost || !booking.preFlight) && "opacity-50 grayscale")}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <FileClock className="h-4 w-4 text-blue-600" />
                                    Post-Flight Record
                                </h3>
                                {!booking.postFlight && canLogPost && booking.preFlight && activeEditView !== 'post-flight' && (
                                    <Button size="sm" onClick={() => setActiveEditView('post-flight')} className="h-7 text-[10px] gap-1 px-2">
                                        <PencilLine className="h-3 w-3" /> Record
                                    </Button>
                                )}
                                {booking.postFlight && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">Finalized</Badge>}
                            </div>
                            
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
                                <p className="text-xs text-muted-foreground italic py-4">No post-flight data recorded.</p>
                            )}
                        </div>
                    </div>
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

        toast({ title: 'Flight Finalized', description: 'Aircraft hours updated.' });
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
                    <Textarea placeholder="Any issues?" {...form.register('defects')} className="min-h-[60px] text-xs py-1" />
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
