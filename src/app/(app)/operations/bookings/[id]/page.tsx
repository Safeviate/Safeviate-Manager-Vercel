'use client';

import { useMemo } from 'react';
import { doc, collection } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ViewBookingDetails } from './view-booking-details';

interface BookingDetailPageProps {
    params: { id: string };
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const bookingRef = useMemoFirebase(
        () => firestore ? doc(firestore, `tenants/${tenantId}/bookings`, params.id) : null,
        [firestore, tenantId, params.id]
    );

    const { data: booking, isLoading: isLoadingBooking, error } = useDoc<Booking>(bookingRef);

    const aircraftRef = useMemoFirebase(
        () => (firestore && booking?.resourceId) ? doc(firestore, `tenants/${tenantId}/aircrafts`, booking.resourceId) : null,
        [firestore, tenantId, booking?.resourceId]
    );
    const instructorRef = useMemoFirebase(
        () => (firestore && booking?.instructorId) ? doc(firestore, `tenants/${tenantId}/instructors`, booking.instructorId) : null,
        [firestore, tenantId, booking?.instructorId]
    );
    const studentRef = useMemoFirebase(
        () => (firestore && booking?.studentId) ? doc(firestore, `tenants/${tenantId}/students`, booking.studentId) : null,
        [firestore, tenantId, booking?.studentId]
    );

    const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
    const { data: instructor, isLoading: isLoadingInstructor } = useDoc<PilotProfile>(instructorRef);
    const { data: student, isLoading: isLoadingStudent } = useDoc<PilotProfile>(studentRef);

    const isLoading = isLoadingBooking || isLoadingAircraft || isLoadingInstructor || isLoadingStudent;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (error || !booking) {
        return (
            <div className="text-center py-10">
                <p className="text-destructive mb-4">
                    {error ? `Error: ${error.message}` : "Booking not found."}
                </p>
                <Button asChild variant="outline">
                    <Link href="/operations/bookings">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Bookings
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Button asChild variant="outline">
                <Link href="/operations/bookings">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Schedule
                </Link>
            </Button>
            <ViewBookingDetails
                booking={booking}
                aircraft={aircraft}
                instructor={instructor}
                student={student}
            />
        </div>
    );
}
