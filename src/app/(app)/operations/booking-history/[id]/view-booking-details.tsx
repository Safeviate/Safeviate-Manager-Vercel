'use client';

import { useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { Badge } from '@/components/ui/badge';

interface ViewBookingDetailsProps {
    booking: Booking;
}

const DetailItem = ({ label, value }: { label: string, value: string | undefined | null }) => (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || 'N/A'}</p>
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
    const showApproveButton = canApprove && booking.status !== 'Approved' && booking.status !== 'Completed' && !booking.status.startsWith('Cancelled');

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle>{booking.type}</CardTitle>
                    <CardDescription>
                        Booking Number: {booking.bookingNumber}
                    </CardDescription>
                </div>
                {showApproveButton && (
                    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm">
                        <CheckCircle2 className="h-4 w-4" /> Approve Flight
                    </Button>
                )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                </div>
            </CardContent>
        </Card>
    );
}
