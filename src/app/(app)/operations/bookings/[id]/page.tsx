
'use client';

import { use, useMemo, useState } from 'react';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../../../assets/page';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../../users/personnel/page';
import { BookingForm } from '../booking-form';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface BookingPageProps {
    params: { id: string };
}

export default function BookingPage({ params }: BookingPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;
    
    // --- Data Fetching ---
    const bookingDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null), [firestore, tenantId, bookingId]);
    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<Booking>(bookingDocRef);

    const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null), [firestore, tenantId]);
    const pilotsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'pilots') : null), [firestore, tenantId]);
    
    const { data: aircraftList, isLoading: isLoadingAircraft } = useCollection<Aircraft>(aircraftQuery);
    const { data: pilotList, isLoading: isLoadingPilots } = useCollection<PilotProfile>(pilotsQuery);
    
    // Need all bookings for overnight logic
    const allBookingsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'tenants', tenantId, 'bookings'));
    }, [firestore, tenantId]);
    const { data: allBookings, isLoading: isLoadingAllBookings } = useCollection<Booking>(allBookingsQuery);

    // --- State and Memos ---
    const [isFormOpen, setIsFormOpen] = useState(true); // Keep it open by default on this page
    
    const isLoading = isLoadingBooking || isLoadingAircraft || isLoadingPilots || isLoadingAllBookings;

    const formInitialData = useMemo(() => {
        if (isLoading || !booking || !aircraftList) return null;

        const aircraft = aircraftList.find(a => a.id === booking.aircraftId);
        if (!aircraft) return null;

        return {
            aircraft,
            time: format(booking.startTime.toDate(), 'HH:mm'),
            date: booking.startTime.toDate(),
            booking,
        };
    }, [isLoading, booking, aircraftList]);

    // This function can be used to redirect or show a message if the window shouldn't be open
    const handleClose = () => {
       if (window.opener) {
         window.close();
       } else {
         // If there's no opener, maybe redirect to the main schedule
         window.location.href = '/operations/bookings';
       }
    };
    
    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (bookingError || !booking || !formInitialData) {
        return (
            <div className="p-6 text-center">
                 <h2 className="text-xl font-semibold text-destructive mb-4">Error Loading Booking</h2>
                <p className="text-muted-foreground">{bookingError?.message || "The booking details could not be found."}</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/operations/bookings">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Schedule
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <BookingForm
                tenantId={tenantId}
                aircraftList={aircraftList || []}
                pilotList={pilotList || []}
                allBookings={allBookings || []}
                initialData={formInitialData}
                isOpen={isFormOpen}
                onClose={handleClose}
            />
        </div>
    );
}
