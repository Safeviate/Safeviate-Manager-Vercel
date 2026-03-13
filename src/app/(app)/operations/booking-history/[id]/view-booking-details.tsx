'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { CheckCircle2, ClipboardCheck, FileClock, History, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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

    const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: instructors, isLoading: loadingIns } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: loadingStu } = useCollection<PilotProfile>(studentsQuery);
    const { data: personnel, isLoading: loadingPer } = useCollection<Personnel>(personnelQuery);

    const isLoading = loadingAc || loadingIns || loadingStu || loadingPer;

    const flightHours = useMemo(() => {
        if (booking.status === 'Completed' && booking.postFlightData?.hobbs && booking.preFlightData?.hobbs) {
            return (booking.postFlightData.hobbs - booking.preFlightData.hobbs).toFixed(1);
        }
        return null;
    }, [booking]);

    const handleApprove = () => {
        if (!firestore) return;
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        updateDocumentNonBlocking(bookingRef, { status: 'Approved' });
        toast({
            title: 'Flight Approved',
            description: `Booking #${booking.bookingNumber} has been approved.`
        });
    };

    const aircraftLabel = useMemo(() => {
        const ac = aircrafts?.find(a => a.id === booking.aircraftId);
        return ac ? `${ac.tailNumber} (${ac.model})` : booking.aircraftId;
    }, [aircrafts, booking.aircraftId]);

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
                        {flightHours && (
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
                                disabled={!booking.preFlight}
                                title={!booking.preFlight ? "Requires recorded Pre-Flight Checklist" : ""}
                                className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                            >
                                <CheckCircle2 className="h-4 w-4" /> Approve Flight
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
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 pb-10">
                    {/* Pre-Flight Data */}
                    <div className={cn("space-y-4 p-4 rounded-xl border bg-muted/10", !booking.preFlight && "opacity-50 grayscale")}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-green-600" />
                                Pre-Flight Record
                            </h3>
                            {booking.preFlight ? <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-green-200">Completed</Badge> : <Badge variant="outline" className="text-[10px]">Pending</Badge>}
                        </div>
                        {booking.preFlightData ? (
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
                            <p className="text-xs text-muted-foreground italic py-4">No pre-flight data recorded yet.</p>
                        )}
                    </div>

                    {/* Post-Flight Data */}
                    <div className={cn("space-y-4 p-4 rounded-xl border bg-muted/10", !booking.postFlight && "opacity-50 grayscale")}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                <FileClock className="h-4 w-4 text-blue-600" />
                                Post-Flight Record
                            </h3>
                            {booking.postFlight ? <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">Finalized</Badge> : <Badge variant="outline" className="text-[10px]">Pending</Badge>}
                        </div>
                        {booking.postFlightData ? (
                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="End Hobbs" value={booking.postFlightData.hobbs.toFixed(1)} />
                                <DetailItem label="End Tacho" value={booking.postFlightData.tacho.toFixed(1)} />
                                <DetailItem label="Fuel Remaining" value={`${booking.postFlightData.fuelRemaining} Gal`} />
                                <div className="col-span-2">
                                    <DetailItem label="Defects / Observations" value={booking.postFlightData.defects || "None reported."} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic py-4">No post-flight data recorded yet.</p>
                        )}
                    </div>
                </CardContent>
            </ScrollArea>
        </Card>
    );
}
