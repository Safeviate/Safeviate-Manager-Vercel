'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';

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
    const { tenantId } = useUserProfile();

    const aircraftQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: instructors, isLoading: loadingIns } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: loadingStu } = useCollection<PilotProfile>(studentsQuery);
    const { data: personnel, isLoading: loadingPer } = useCollection<Personnel>(personnelQuery);

    const isLoading = loadingAc || loadingIns || loadingStu || loadingPer;

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{booking.type}</CardTitle>
                <CardDescription>
                    Booking Number: {booking.bookingNumber}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DetailItem label="Status" value={booking.status} />
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
