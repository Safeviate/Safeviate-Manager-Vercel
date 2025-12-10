'use client';

import { useState, useMemo } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../users/personnel/page';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BookingsByAircraft = {
  [aircraftId: string]: {
    aircraftDetails: Aircraft;
    bookings: Booking[];
  };
};

const BookingListItem = ({ booking, pilot }: { booking: Booking; pilot?: PilotProfile }) => (
    <div className="flex justify-between items-center p-3 border-b last:border-b-0 bg-secondary/30 hover:bg-secondary/50">
        <div className="flex flex-col gap-1">
            <p className="font-semibold">{booking.type}</p>
            <p className="text-sm text-muted-foreground">
                {pilot ? `${pilot.firstName} ${pilot.lastName}` : 'Unknown Pilot'}
            </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
            <p className="font-mono">{format(booking.startTime.toDate(), 'HH:mm')} - {format(booking.endTime.toDate(), 'HH:mm')}</p>
             <Badge
                className={cn(
                    booking.status === 'Cancelled' && 'bg-destructive text-destructive-foreground',
                    booking.status === 'Confirmed' && 'bg-green-600 text-white',
                    booking.status === 'Pending' && 'bg-yellow-500 text-black'
                )}
            >
                {booking.status}
            </Badge>
        </div>
    </div>
);


export default function BookingsAgendaPage() {
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

  const pilotsMap = useMemo(() => {
      if (!pilots) return new Map();
      return new Map(pilots.map(p => [p.id, p]));
  }, [pilots]);

  const bookingsByAircraft = useMemo(() => {
    if (!bookings || !aircraft) return {};

    const grouped: BookingsByAircraft = {};

    // Initialize with all aircraft to show them even if they have no bookings
    for (const ac of aircraft) {
        grouped[ac.id] = {
            aircraftDetails: ac,
            bookings: [],
        };
    }

    for (const booking of bookings) {
      if (grouped[booking.aircraftId]) {
        grouped[booking.aircraftId].bookings.push(booking);
      }
    }
    
    // Sort bookings within each group
    for (const aircraftId in grouped) {
        grouped[aircraftId].bookings.sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());
    }

    return grouped;
  }, [bookings, aircraft]);

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Agenda / List View</h1>
                <p className="text-muted-foreground">Daily bookings displayed as a list.</p>
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className="w-[280px] justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "PPP")}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <CustomCalendar
                        selectedDate={selectedDate}
                        onDateSelect={(date) => {
                            if (date) setSelectedDate(date);
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>

        <Card className="flex-grow overflow-y-auto">
            <CardContent className="p-4 md:p-6">
                 {isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                 )}
                 {error && <p className="text-center text-destructive">Error: {error.message}</p>}
                 {!isLoading && !error && Object.keys(bookingsByAircraft).length > 0 ? (
                    <Accordion type="multiple" defaultValue={Object.keys(bookingsByAircraft)}>
                        {Object.values(bookingsByAircraft).map(({ aircraftDetails, bookings }) => (
                            <AccordionItem value={aircraftDetails.id} key={aircraftDetails.id}>
                                <AccordionTrigger className="text-lg">
                                    {aircraftDetails.tailNumber}
                                    <span className="text-sm text-muted-foreground ml-2">({bookings.length} bookings)</span>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {bookings.length > 0 ? (
                                        <div className="border rounded-md overflow-hidden">
                                          {bookings.map(b => (
                                              <BookingListItem key={b.id} booking={b} pilot={pilotsMap.get(b.pilotId)} />
                                          ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground p-4">No bookings for this aircraft today.</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 ) : (
                    !isLoading && <p className="text-center text-muted-foreground p-8">No aircraft found.</p>
                 )}
            </CardContent>
        </Card>
    </div>
  );
}
