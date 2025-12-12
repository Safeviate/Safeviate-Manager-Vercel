
'use client';

import { use, useMemo } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { ChecklistResponse } from '@/types/checklist';
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

const getMeterReading = (responses: ChecklistResponse[], bookingId: string, type: 'pre-flight' | 'post-flight', meter: 'hobbs' | 'tacho'): number | null => {
    const checklist = responses.find(r => r.bookingId === bookingId && r.checklistType === type);
    if (!checklist) return null;
    
    const item = checklist.responses.find(res => res.itemId === `${type}-${meter}`);
    return item?.[meter] ?? null;
};


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

    const checklistResponsesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'checklistResponses'), where('bookingId', '==', bookingId)) : null),
        [firestore, tenantId, bookingId]
    );

    const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftDocRef);
    const { data: pilot, isLoading: isLoadingPilot } = useDoc<PilotProfile>(pilotDocRef);
    const { data: instructor, isLoading: isLoadingInstructor } = useDoc<PilotProfile>(instructorDocRef);
    const { data: checklistResponses, isLoading: isLoadingChecklists } = useCollection<ChecklistResponse>(checklistResponsesQuery);

    const isLoading = isLoadingBooking || isLoadingAircraft || isLoadingPilot || isLoadingInstructor || isLoadingChecklists;

    const { hobbsDuration, tachoDuration } = useMemo(() => {
        if (!checklistResponses || checklistResponses.length === 0) {
            return { hobbsDuration: null, tachoDuration: null };
        }

        const preHobbs = getMeterReading(checklistResponses, bookingId, 'pre-flight', 'hobbs');
        const postHobbs = getMeterReading(checklistResponses, bookingId, 'post-flight', 'hobbs');
        const preTacho = getMeterReading(checklistResponses, bookingId, 'pre-flight', 'tacho');
        const postTacho = getMeterReading(checklistResponses, bookingId, 'post-flight', 'tacho');
  
        const hobbs = (preHobbs !== null && postHobbs !== null) ? postHobbs - preHobbs : null;
        const tacho = (preTacho !== null && postTacho !== null) ? postTacho - preTacho : null;
  
        return { hobbsDuration: hobbs, tachoDuration: tacho };

    }, [checklistResponses, bookingId]);

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
                     <DetailItem label="Hobbs Duration" value={hobbsDuration !== null ? hobbsDuration.toFixed(1) : 'N/A'} />
                    <DetailItem label="Tacho Duration" value={tachoDuration !== null ? tachoDuration.toFixed(1) : 'N/A'} />
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
