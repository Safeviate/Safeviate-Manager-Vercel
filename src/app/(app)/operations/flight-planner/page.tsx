
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import type { Booking } from '@/types/booking';
import { Skeleton } from '@/components/ui/skeleton';
import { FlightPlannerForm } from './flight-planner-form';


export default function FlightPlannerPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  // --- Data Fetching ---
  const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null), [firestore, tenantId]);
  const pilotsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'pilots') : null), [firestore, tenantId]);
  const bookingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'tenants', tenantId, 'bookings') : null), [firestore, tenantId]);

  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftQuery);
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);
  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);

  const isLoading = isLoadingAircrafts || isLoadingPilots || isLoadingBookings;
  const error = aircraftsError || pilotsError || bookingsError;

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading data: {error.message}</p>;
  }

  return (
    <div className="flex flex-col gap-6 h-full">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Flight Planner</h1>
                <p className="text-muted-foreground">Create and manage VFR/IFR flight plans and navigation logs.</p>
            </div>
        </div>

      <FlightPlannerForm 
        aircrafts={aircrafts || []}
        pilots={pilots || []}
        bookings={bookings || []}
      />
    </div>
  );
}
