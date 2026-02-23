
'use client';

import { useState, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDays, subDays, format, startOfDay, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';

const HOUR_HEIGHT = 60; // pixels per hour

export default function DailySchedulePage() {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null,
    [firestore, tenantId]
  );
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);

  const bookingsQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      const startOfDayTimestamp = currentDate.toISOString();
      const endOfDayDate = new Date(currentDate);
      endOfDayDate.setHours(23, 59, 59, 999);
      const endOfDayTimestamp = endOfDayDate.toISOString();

      return query(
        collection(firestore, `tenants/${tenantId}/bookings`),
        where('start', '>=', startOfDayTimestamp),
        where('start', '<=', endOfDayTimestamp)
      );
    },
    [firestore, tenantId, currentDate]
  );
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);

  const isLoading = isLoadingAircrafts || isLoadingBookings;

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const renderBooking = (booking: Booking) => {
    const start = new Date(booking.start);
    const end = new Date(booking.end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return null; // Don't render invalid bookings
    }

    const top = (getHours(start) * HOUR_HEIGHT) + (getMinutes(start) / 60 * HOUR_HEIGHT);
    const durationMinutes = differenceInMinutes(end, start);
    const height = (durationMinutes / 60) * HOUR_HEIGHT;

    return (
        <Link href={`/operations/bookings/${booking.id}`} key={booking.id}>
            <div
                className="absolute w-full p-2 rounded-lg border bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80"
                style={{ top: `${top}px`, height: `${height}px` }}
            >
                <p className="font-semibold text-xs truncate">{booking.title}</p>
                <p className="text-xs opacity-80">{booking.status}</p>
            </div>
        </Link>
    );
  };
  
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Daily Schedule</h1>
                <p className="text-muted-foreground">
                    A vertical timeline of all bookings for {format(currentDate, 'PPP')}.
                </p>
            </div>
            <div className='flex items-center gap-2'>
                <Button variant="outline" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous Day
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(currentDate, 'PPP')}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CustomCalendar selectedDate={currentDate} onDateSelect={(date) => date && setCurrentDate(startOfDay(date))} />
                    </PopoverContent>
                </Popover>
                <Button variant="outline" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                    Next Day
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                 <Button asChild>
                    <Link href="/operations/bookings/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Booking
                    </Link>
                </Button>
            </div>
        </div>
        
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <div className="relative grid" style={{ gridTemplateColumns: `60px repeat(${aircrafts?.length || 4}, 1fr)` }}>
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-swimlane-header text-swimlane-header-foreground p-2 border-b border-r font-semibold text-sm">&nbsp;</div>
                        {(aircrafts || []).map(ac => (
                            <div key={ac.id} className="sticky top-0 z-10 bg-swimlane-header text-swimlane-header-foreground p-2 border-b border-r text-center font-semibold text-sm">
                                {ac.tailNumber}
                            </div>
                        ))}
                        {(!aircrafts || aircrafts.length === 0) && Array.from({length: 4}).map((_, i) => (
                             <div key={`empty-lane-${i}`} className="sticky top-0 z-10 bg-swimlane-header text-swimlane-header-foreground p-2 border-b border-r text-center font-semibold text-sm">
                                (Empty Lane)
                            </div>
                        ))}

                        {/* Time Gutter */}
                        <div className="row-start-2 border-r">
                            {hours.map(hour => (
                                <div key={hour} className="relative h-[60px] text-right pr-2 text-xs text-muted-foreground -top-2">
                                    {hour}
                                </div>
                            ))}
                        </div>

                        {/* Schedule Lanes */}
                        {(aircrafts || []).map(ac => (
                            <div key={ac.id} className="row-start-2 relative border-r">
                                {hours.map((_, index) => (
                                    <div key={index} className="h-[60px] border-b" />
                                ))}
                                {bookings?.filter(b => b.resourceId === ac.id).map(renderBooking)}
                            </div>
                        ))}
                         {(!aircrafts || aircrafts.length === 0) && Array.from({length: 4}).map((_, laneIndex) => (
                            <div key={`empty-schedule-${laneIndex}`} className="row-start-2 relative border-r">
                                {hours.map((_, index) => (
                                    <div key={index} className="h-[60px] border-b" />
                                ))}
                            </div>
                        ))}
                        
                        {isLoading && <Skeleton className="absolute inset-0 bg-muted/50" />}
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
