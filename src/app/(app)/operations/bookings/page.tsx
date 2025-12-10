'use client';

import { useState, useMemo } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Aircraft } from '../../assets/page';
import { Booking } from '@/types/booking';
import { BookingCalendar } from './booking-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { CustomCalendar } from '@/components/ui/custom-calendar';

export default function BookingsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const aircraftQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'))
        : null,
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
  
  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);

  const isLoading = isLoadingAircraft || isLoadingBookings;
  const error = aircraftError || bookingsError;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Aircraft Bookings</h1>
                <p className="text-muted-foreground">Schedule and manage aircraft usage.</p>
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
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

      <Card className="flex-grow flex flex-col">
        <CardContent className="p-0 flex-grow overflow-auto">
          {isLoading && <div className="p-4 text-center">Loading calendar...</div>}
          {error && <div className="p-4 text-center text-destructive">Error: {error.message}</div>}
          {!isLoading && !error && (
            <BookingCalendar 
              aircraft={aircraft || []} 
              bookings={bookings || []} 
              selectedDate={selectedDate}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
