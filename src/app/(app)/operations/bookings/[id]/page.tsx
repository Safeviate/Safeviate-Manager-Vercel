
'use client';

import { use, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BookingDetailsPageProps {
    params: { id: string };
}

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value || 'N/A'}</p>
    </div>
);

export default function BookingDetailsPage({ params }: BookingDetailsPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;

    const bookingDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null),
        [firestore, tenantId, bookingId]
    );

    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<Booking>(bookingDocRef);

    const aircraftDocRef = useMemoFirebase(
        () => (firestore && booking ? doc(firestore, 'tenants', tenantId, 'aircrafts', booking.aircraftId) : null),
        [firestore, tenantId, booking]
    );
    const pilotDocRef = useMemoFirebase(
        () => (firestore && booking ? doc(firestore, 'tenants', tenantId, 'pilots', booking.pilotId) : null),
        [firestore, tenantId, booking]
    );
    const instructorDocRef = useMemoFirebase(
        () => (firestore && booking?.instructorId ? doc(firestore, 'tenants', tenantId, 'pilots', booking.instructorId) : null),
        [firestore, tenantId, booking]
    );

    const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftDocRef);
    const { data: pilot, isLoading: isLoadingPilot } = useDoc<PilotProfile>(pilotDocRef);
    const { data: instructor, isLoading: isLoadingInstructor } = useDoc<PilotProfile>(instructorDocRef);

    const isLoading = isLoadingBooking || isLoadingAircraft || isLoadingPilot || isLoadingInstructor;

    if (isLoading) {
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        );
    }
    
    if (bookingError || !booking) {
        return <div className="text-destructive text-center">Error: {bookingError?.message || 'Booking not found.'}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                 <Button asChild variant="outline" size="sm">
                    <Link href="/operations/maintenance">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Bookings
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div>
                            <CardTitle>Booking #{booking.bookingNumber}</CardTitle>
                            <CardDescription>
                                Details for the booking on {format(booking.startTime.toDate(), 'PPP')}.
                            </CardDescription>
                        </div>
                         <Badge variant={booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason' ? 'destructive' : 'secondary'}
                            className={cn(booking.status === 'Confirmed' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100', 'text-base')}
                        >
                            {booking.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem label="Aircraft" value={aircraft?.tailNumber} />
                    <DetailItem label="Pilot" value={pilot ? `${pilot.firstName} ${pilot.lastName}` : '...'} />
                    {booking.instructorId && <DetailItem label="Instructor" value={instructor ? `${instructor.firstName} ${instructor.lastName}` : '...'} />}
                    <DetailItem label="Booking Type" value={booking.type} />
                    <DetailItem label="Start Time" value={format(booking.startTime.toDate(), 'HH:mm')} />
                    <DetailItem label="End Time" value={format(booking.endTime.toDate(), 'HH:mm')} />
                    {booking.cancellationReason && (
                        <div className="md:col-span-2 lg:col-span-3">
                           <DetailItem label="Cancellation Reason" value={booking.cancellationReason} />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
