
'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import { BookingsTable } from './bookings-table';
import type { ChecklistResponse } from '@/types/checklist';

export default function BookingsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const bookingsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'bookings'), orderBy('startTime', 'desc'))
        : null,
    [firestore]
  );
  
  const aircraftQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
    [firestore]
  );

  const pilotsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'pilots'))
        : null,
    [firestore]
  );

  const checklistResponsesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'checklistResponses'))
        : null,
    [firestore, tenantId]
  );

  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);
  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);
  const { data: checklistResponses, isLoading: isLoadingChecklists, error: checklistsError } = useCollection<ChecklistResponse>(checklistResponsesQuery);

  const isLoading = isLoadingBookings || isLoadingAircraft || isLoadingPilots || isLoadingChecklists;
  const error = bookingsError || aircraftError || pilotsError || checklistsError;

  const aircraftMap = useMemo(() => {
    if (!aircraft) return new Map<string, string>();
    return new Map(aircraft.map(ac => [ac.id, ac.tailNumber]));
  }, [aircraft]);

  const pilotsMap = useMemo(() => {
    if (!pilots) return new Map<string, string>();
    return new Map(pilots.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [pilots]);

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">All Bookings</h1>
                <p className="text-muted-foreground">A complete history of all bookings.</p>
            </div>
        </div>

        <Card>
            <CardContent className="p-0">
                {isLoading && (
                    <div className="text-center p-8">Loading bookings...</div>
                )}
                {!isLoading && error && (
                    <div className="text-center p-8 text-destructive">
                    Error: {error.message}
                    </div>
                )}
                {!isLoading && !error && (
                    <BookingsTable 
                        bookings={bookings || []}
                        checklistResponses={checklistResponses || []}
                        aircraftMap={aircraftMap}
                        pilotsMap={pilotsMap}
                        tenantId={tenantId}
                    />
                )}
            </CardContent>
        </Card>
    </div>
  );
}
