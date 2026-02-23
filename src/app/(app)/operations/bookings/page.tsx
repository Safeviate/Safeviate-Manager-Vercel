
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { format, startOfDay, addDays, subDays, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const HOUR_WIDTH = 120; // width of one hour in pixels
const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const TimeRuler = () => {
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
  return (
    <div className="sticky top-0 z-20 flex bg-muted/50 border-b-2" style={{ paddingLeft: '150px' }}>
      {hours.map(hour => (
        <div key={hour} className="relative flex-shrink-0 text-xs font-mono text-muted-foreground text-center border-l" style={{ width: `${HOUR_WIDTH}px` }}>
          <span className="absolute -top-4">{`${String(hour).padStart(2, '0')}:00`}</span>
        </div>
      ))}
    </div>
  )
};

const BookingBlock = ({ booking }: { booking: Booking }) => {
    const start = new Date(booking.start);
    const end = new Date(booking.end);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();

    const left = ((startMinutes - (START_HOUR * 60)) / 60) * HOUR_WIDTH;
    const width = ((endMinutes - startMinutes) / 60) * HOUR_WIDTH;

    if (left < 0 || width <= 0) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                     <Link href={`/operations/bookings/${booking.id}`} className="absolute top-1 bottom-1 hover:z-10" style={{ left: `${left}px`, width: `${width}px` }}>
                        <div className="h-full bg-primary/20 border-2 border-primary rounded-lg p-2 overflow-hidden hover:bg-primary/30 transition-colors">
                            <p className="text-xs font-semibold truncate text-primary-foreground">{booking.title}</p>
                            <p className="text-xs text-primary-foreground/80">{booking.studentId || 'No student'}</p>
                        </div>
                    </Link>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-semibold">{booking.title}</p>
                    <p>{format(start, 'p')} - {format(end, 'p')}</p>
                    <p>Student: {booking.studentId || 'N/A'}</p>
                    <p>Instructor: {booking.instructorId || 'N/A'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
};


export default function DailySchedulePage() {
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const bookingsQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      const dayStart = Timestamp.fromDate(selectedDate);
      const dayEnd = Timestamp.fromDate(addDays(selectedDate, 1));
      return query(
          collection(firestore, `tenants/${tenantId}/bookings`),
          where('start', '>=', dayStart.toDate().toISOString()),
          where('start', '<', dayEnd.toDate().toISOString())
        );
    },
    [firestore, tenantId, selectedDate]
  );
  
  const aircraftsQuery = useMemoFirebase(
      () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
      [firestore, tenantId]
  );

  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftsQuery);

  const isLoading = isLoadingBookings || isLoadingAircrafts;
  const error = bookingsError || aircraftsError;
  
  const bookingsByAircraft = useMemo(() => {
      if (!bookings) return new Map<string, Booking[]>();
      return bookings.reduce((acc, booking) => {
          if (!acc.has(booking.resourceId)) {
              acc.set(booking.resourceId, []);
          }
          acc.get(booking.resourceId)!.push(booking);
          return acc;
      }, new Map<string, Booking[]>());
  }, [bookings]);

  useEffect(() => {
      // Scroll to current time on initial load for today
      if (scrollContainerRef.current && isSameDay(selectedDate, new Date())) {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const scrollPosition = ((currentMinutes - (START_HOUR * 60)) / 60) * HOUR_WIDTH - (scrollContainerRef.current.offsetWidth / 2);
          scrollContainerRef.current.scrollLeft = scrollPosition;
      }
  }, [selectedDate, isLoading]); // Rerun when data loads for today

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Schedule</h1>
          <div className="flex items-center gap-4 mt-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">{format(selectedDate, 'PPP')}</h2>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setSelectedDate(startOfDay(new Date()))}>Today</Button>
          </div>
        </div>
        <Button asChild>
          <Link href="/operations/bookings/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Booking
          </Link>
        </Button>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          {isLoading && <Skeleton className="h-96 w-full" />}
          {error && <p className="text-destructive text-center p-8">Error loading schedule: {error.message}</p>}
          {!isLoading && !error && (
            <div className="relative flex-1">
              <ScrollArea className="h-full" ref={scrollContainerRef}>
                <div style={{ width: `${TOTAL_HOURS * HOUR_WIDTH + 150}px` }}>
                   <TimeRuler />
                   <div className="relative">
                        {aircrafts?.map((aircraft, index) => (
                           <div key={aircraft.id} className={cn("flex h-24 border-b", index % 2 === 0 ? 'bg-background' : 'bg-muted/30')}>
                               <div className="sticky left-0 z-10 w-[150px] flex-shrink-0 border-r-2 bg-inherit flex items-center justify-center p-2">
                                   <p className="font-semibold text-center">{aircraft.tailNumber}</p>
                               </div>
                               <div className="relative flex-1">
                                   {(bookingsByAircraft.get(aircraft.id) || []).map(booking => (
                                       <BookingBlock key={booking.id} booking={booking} />
                                   ))}
                               </div>
                           </div>
                        ))}
                        {(!aircrafts || aircrafts.length === 0) && (
                            <div className="h-48 flex items-center justify-center text-muted-foreground">
                                No aircraft found to display on the schedule.
                            </div>
                        )}
                   </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
