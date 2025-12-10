'use client';

import { useMemo, useState } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../users/personnel/page';
import { format, startOfDay, endOfDay, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const HOUR_HEIGHT_PX = 60; // Represents 60 minutes
const TOTAL_HOURS = 24;

const TimeRuler = () => (
  <div className="relative w-16 text-xs text-right text-muted-foreground flex-shrink-0">
    {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
      <div
        key={hour}
        className="h-[60px] pr-2 border-t border-r flex justify-end items-start"
        style={{ height: `${HOUR_HEIGHT_PX}px` }}
      >
        <span className="-translate-y-1/2">{format(new Date(0, 0, 0, hour), 'HH:mm')}</span>
      </div>
    ))}
  </div>
);

const AircraftColumn = ({ aircraft, bookings, pilots }: { aircraft?: Aircraft; bookings: Booking[]; pilots: PilotProfile[] }) => {
  return (
    <div className="flex-1 relative border-r min-w-[150px]">
      {/* Hour lines for this column */}
      {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
        <div key={hour} className="border-t" style={{ height: `${HOUR_HEIGHT_PX}px` }} />
      ))}

      {/* Booking blocks */}
      {bookings.map((booking) => {
        const startTime = booking.startTime.toDate();
        const endTime = booking.endTime.toDate();

        const top = (getHours(startTime) * 60 + getMinutes(startTime)) * (HOUR_HEIGHT_PX / 60);
        const durationMinutes = differenceInMinutes(endTime, startTime);
        const height = durationMinutes * (HOUR_HEIGHT_PX / 60);
        const pilot = pilots.find(p => p.id === booking.pilotId);

        return (
          <div
            key={booking.id}
            className={cn(
              'absolute w-full p-2 rounded-lg text-xs leading-tight shadow-md flex flex-col justify-center text-primary-foreground',
               booking.status === 'Cancelled' ? 'bg-destructive/80' : 'bg-primary/80'
            )}
            style={{ top: `${top}px`, height: `${height}px` }}
          >
            <p className="font-semibold truncate">{booking.type}</p>
            <p className="truncate">{pilot ? `${pilot.firstName} ${pilot.lastName}` : 'Unknown Pilot'}</p>
            {booking.status === 'Cancelled' && <p className="font-bold uppercase text-[9px] mt-0.5">Cancelled</p>}
          </div>
        );
      })}
    </div>
  );
};


export default function BookingsSwimlanePage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now
  const [selectedDate, setSelectedDate] = useState(new Date());

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const start = Timestamp.fromDate(startOfDay(selectedDate));
    const end = Timestamp.fromDate(endOfDay(selectedDate));
    return query(
        collection(firestore, 'tenants', tenantId, 'bookings'),
        where('startTime', '>=', start),
        where('startTime', '<=', end)
    );
  }, [firestore, tenantId, selectedDate]);

  const pilotsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'pilots')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);

  const isLoading = isLoadingAircraft || isLoadingBookings || isLoadingPilots;
  const error = aircraftError || bookingsError || pilotsError;

  const extraLanes = ['', '', '', '', '']; // Add 5 empty lanes

  return (
    <div className="flex flex-col gap-6 h-full">
      <h1 className="text-3xl font-bold tracking-tight">Bookings Swimlane</h1>

      <Card className="flex-grow flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>Daily Schedule</CardTitle>
          <CardDescription>
            A vertical timeline of all bookings for {format(selectedDate, 'PPP')}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-auto">
          {isLoading && (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <div className="flex gap-4 h-96">
                <Skeleton className="w-16 h-full" />
                <Skeleton className="flex-1 h-full" />
                <Skeleton className="flex-1 h-full" />
                <Skeleton className="flex-1 h-full" />
              </div>
            </div>
          )}
          {error && <p className="p-6 text-destructive">Error loading data: {error.message}</p>}
          {!isLoading && !error && (
            <div className='overflow-x-auto h-full'>
              <div className="min-w-max flex flex-col h-full">
                {/* Header */}
                <div className="flex sticky top-0 z-10 bg-muted/50 flex-shrink-0">
                  <div className="w-16 flex-shrink-0 border-r" />
                  {(aircraft || []).map((ac) => (
                    <div key={ac.id} className="flex-1 p-2 font-semibold text-center border-r min-w-[150px]">
                      {ac.tailNumber}
                    </div>
                  ))}
                  {extraLanes.map((_, index) => (
                    <div key={`extra-header-${index}`} className="flex-1 p-2 font-semibold text-center border-r min-w-[150px] text-muted-foreground">
                      (Empty Lane)
                    </div>
                  ))}
                   {(aircraft || []).length === 0 && extraLanes.length === 0 && <div className="flex-1 p-2 text-center">No Aircraft Found</div>}
                </div>

                {/* Body */}
                <div className="flex flex-grow">
                  <TimeRuler />
                  {(aircraft || []).map((ac) => (
                    <AircraftColumn
                      key={ac.id}
                      aircraft={ac}
                      bookings={(bookings || []).filter(b => b.aircraftId === ac.id)}
                      pilots={pilots || []}
                    />
                  ))}
                  {extraLanes.map((_, index) => (
                     <AircraftColumn
                        key={`extra-lane-${index}`}
                        bookings={[]}
                        pilots={[]}
                    />
                  ))}
                  {(aircraft || []).length === 0 && extraLanes.length === 0 && <div className="flex-1 p-4 text-center text-muted-foreground">Please add aircraft to see the schedule.</div>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
