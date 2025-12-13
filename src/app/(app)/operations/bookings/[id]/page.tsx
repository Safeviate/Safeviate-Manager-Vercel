
'use client';

import { use, useMemo, useState } from 'react';
import { collection, query, doc, where } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../../../assets/page';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../../users/personnel/page';
import type { ChecklistResponse } from '@/types/checklist';
import { BookingForm } from '../booking-form';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import { ViewBookingDetails } from './view-booking-details';

interface BookingPageProps {
    params: { id: string };
}

export default function BookingPage({ params }: BookingPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;
    
    const [isEditing, setIsEditing] = useState(false);

    // --- Data Fetching ---
    const bookingDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null), [firestore, tenantId, bookingId]);
    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<Booking>(bookingDocRef);

    const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null), [firestore, tenantId]);
    const pilotsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'pilots') : null), [firestore, tenantId]);
    
    const { data: aircraftList, isLoading: isLoadingAircraft } = useCollection<Aircraft>(aircraftQuery);
    const { data: pilotList, isLoading: isLoadingPilots } = useCollection<PilotProfile>(pilotsQuery);
    
    const allBookingsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'bookings')) : null), [firestore, tenantId]);
    const { data: allBookings, isLoading: isLoadingAllBookings } = useCollection<Booking>(allBookingsQuery);

    const checklistsQuery = useMemoFirebase(
      () => (firestore && bookingId ? query(collection(firestore, 'tenants', tenantId, 'checklistResponses'), where('bookingId', '==', bookingId)) : null),
      [firestore, tenantId, bookingId]
    );
    const { data: checklists, isLoading: isLoadingChecklists } = useCollection<ChecklistResponse>(checklistsQuery);


    const isLoading = isLoadingBooking || isLoadingAircraft || isLoadingPilots || isLoadingAllBookings || isLoadingChecklists;

    const aircraft = useMemo(() => {
        if (!booking || !aircraftList) return null;
        return aircraftList.find(a => a.id === booking.aircraftId);
    }, [booking, aircraftList]);

    const pilot = useMemo(() => {
        if (!booking || !pilotList) return null;
        return pilotList.find(p => p.id === booking.pilotId);
    }, [booking, pilotList]);

    const instructor = useMemo(() => {
        if (!booking || !booking.instructorId || !pilotList) return null;
        return pilotList.find(p => p.id === booking.instructorId);
    }, [booking, pilotList]);
    
    
    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (bookingError || !booking || !aircraft) {
        return (
            <div className="p-6 text-center">
                 <h2 className="text-xl font-semibold text-destructive mb-4">Error Loading Booking</h2>
                <p className="text-muted-foreground">{bookingError?.message || "The booking details could not be found."}</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/operations/bookings-history">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to History
                    </Link>
                </Button>
            </div>
        )
    }

    const formInitialData = {
        aircraft,
        time: '00:00', // Placeholder
        date: booking.startTime.toDate(),
        booking,
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/operations/bookings-history">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to History
                        </Link>
                    </Button>
                </div>
                {!isEditing && (
                     <Button onClick={() => setIsEditing(true)}>
                        <Pencil className='mr-2 h-4 w-4' /> Edit Booking
                    </Button>
                )}
            </div>

            {isEditing ? (
                <BookingForm
                    tenantId={tenantId}
                    aircraftList={aircraftList || []}
                    pilotList={pilotList || []}
                    allBookings={allBookings || []}
                    initialData={formInitialData}
                    isOpen={true} // The form is now part of the page flow
                    onClose={() => setIsEditing(false)} // This will now act as a "cancel"
                />
            ) : (
                <ViewBookingDetails 
                    booking={booking} 
                    aircraft={aircraft} 
                    pilot={pilot} 
                    instructor={instructor} 
                    checklists={checklists || []}
                />
            )}
        </div>
    );
}
