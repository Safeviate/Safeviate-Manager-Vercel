
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../users/personnel/page';
import { format, startOfDay, endOfDay, getHours, getMinutes, differenceInMinutes, isSameDay, setHours, setMinutes, isBefore, addHours, addDays, startOfHour, subDays, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Eye, BookOpen } from 'lucide-react';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { BookingForm } from './booking-form';
import { useRouter } from 'next/navigation';

const HOUR_HEIGHT_PX = 60; // Represents 60 minutes
const TOTAL_HOURS = 24;

const BookingItem = ({ booking, pilots, selectedDate, children }: { booking: Booking, pilots: PilotProfile[], selectedDate: Date, children: React.ReactNode }) => {
    const startTime = booking.startTime.toDate();
    const endTime = booking.endTime.toDate();

    const startsOnSelectedDay = isSameDay(startTime, selectedDate);
    const endsOnSelectedDay = isSameDay(endTime, selectedDate);

    // Calculate top position based on start time or midnight if it's a continuing booking
    const top = startsOnSelectedDay 
        ? (getHours(startTime) * 60 + getMinutes(startTime)) * (HOUR_HEIGHT_PX / 60)
        : 0;

    // Calculate duration and height
    const effectiveStartTime = startsOnSelectedDay ? startTime : startOfDay(selectedDate);
    const effectiveEndTime = endsOnSelectedDay ? endTime : endOfDay(selectedDate);
    const durationMinutes = differenceInMinutes(effectiveEndTime, effectiveStartTime);
    const height = durationMinutes * (HOUR_HEIGHT_PX / 60);

    const pilot = pilots.find(p => p.id === booking.pilotId);
    
    const hasContinuationTop = !startsOnSelectedDay;
    const hasContinuationBottom = !endsOnSelectedDay;
    
    return (
         <Popover>
            <PopoverTrigger asChild>
                <div
                    className={cn(
                    'absolute w-full p-2 text-xs leading-tight shadow-md flex flex-col justify-center text-primary-foreground z-10 min-h-[40px] cursor-pointer border border-gray-400',
                    (booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason') ? 'bg-destructive' : 'bg-primary'
                    )}
                    style={{ top: `${top}px`, height: `${height}px` }}
                >
                    {hasContinuationTop && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-black/20 to-transparent" />}
                    <p className="font-semibold truncate">{booking.type}</p>
                    <p className="truncate">{pilot ? `${pilot.firstName} ${pilot.lastName}` : 'Unknown Pilot'}</p>
                    {booking.status === 'Cancelled' && <p className="font-bold uppercase text-[9px] mt-0.5">Cancelled</p>}
                    {(booking.status === 'Cancelled with Reason') && <p className="font-bold uppercase text-[9px] mt-0.5">Cancelled</p>}
                    {hasContinuationBottom && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-black/20 to-transparent" />}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
                {children}
            </PopoverContent>
        </Popover>
    )
}

const AircraftColumn = ({ aircraft, bookings, pilots, showNowLine, nowLinePosition, selectedDate, onSlotClick, onActionClick }: { aircraft?: Aircraft; bookings: Booking[]; pilots: PilotProfile[]; showNowLine: boolean; nowLinePosition: number; selectedDate: Date; onSlotClick: (aircraft: Aircraft, time: string, booking?: Booking) => void; onActionClick: (action: 'view' | 'open', booking: Booking) => void; }) => {
    const today = startOfToday();
    const isSelectedDateToday = isSameDay(selectedDate, today);
    const isSelectedDateInPast = isBefore(selectedDate, today);

    const handleTimeSlotClick = (hour: number) => {
        if (aircraft) {
            const now = new Date();
            const slotTime = setMinutes(setHours(selectedDate, hour), 0);
            
            // If the selected date is today and the slot is in the past, block it.
            if (isSelectedDateToday && isBefore(slotTime, startOfHour(now))) {
                // Optionally, you can add a toast or some feedback here
                return; 
            }
            if (isSelectedDateInPast) {
                return;
            }

            const time = `${hour.toString().padStart(2, '0')}:00`;
            onSlotClick(aircraft, time);
        }
  };
  
  return (
    <div 
        className="flex-1 relative border-r min-w-[150px]"
    >
      {/* Hour lines and labels for this column */}
      {Array.from({ length: TOTAL_HOURS }).map((_, hour) => {
        const now = new Date();
        const slotTime = setMinutes(setHours(selectedDate, hour), 0);
        const isPast = isSelectedDateInPast || (isSelectedDateToday && isBefore(slotTime, startOfHour(now)));

        return (
            <div 
            key={hour} 
            className={cn(
                "relative border-t",
                isPast ? "bg-muted/30 cursor-not-allowed" : "cursor-pointer"
            )} 
            style={{ height: `${HOUR_HEIGHT_PX}px` }}
            onClick={() => handleTimeSlotClick(hour)}
            >
                <span className="absolute top-1 left-1 text-xs text-muted-foreground pointer-events-none">
                    {format(new Date(0, 0, 0, hour), 'HH:mm')}
                </span>
            </div>
        )
      })}
      
      {/* "Past" Shadow */}
      {showNowLine && (
        <div 
          className="absolute top-0 left-0 right-0 bg-destructive/20 z-0 pointer-events-none"
          style={{ height: `${nowLinePosition}px` }}
        />
      )}

      {/* "Now" Line */}
      {showNowLine && (
        <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none" style={{ top: `${nowLinePosition}px` }}>
          <div className="absolute -left-1.5 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      )}

      {/* Booking blocks */}
      {bookings.map((booking) => (
        <BookingItem 
            key={booking.id} 
            booking={booking}
            pilots={pilots}
            selectedDate={selectedDate}
        >
            <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm" onClick={() => onActionClick('view', booking)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Booking
                </Button>
                <Button variant="outline" size="sm" onClick={() => onActionClick('open', booking)}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Open Booking
                </Button>
            </div>
        </BookingItem>
      ))}
    </div>
  );
};


export default function SchedulePage() {
  const firestore = useFirestore();
  const router = useRouter();
  const tenantId = 'safeviate'; // Hardcoded for now
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [nowLinePosition, setNowLinePosition] = useState(0);
  const [showNowLine, setShowNowLine] = useState(false);

  // State for managing the booking form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<any>(null);
  const [checklistTypeToShow, setChecklistTypeToShow] = useState<'pre-flight' | 'post-flight' | undefined>(undefined);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const start = Timestamp.fromDate(startOfDay(subDays(selectedDate, 1))); // Fetch from start of previous day
    const end = Timestamp.fromDate(endOfDay(addDays(selectedDate, 1))); // Fetch until end of next day
    return query(
        collection(firestore, 'tenants', tenantId, 'bookings'),
        where('startTime', '<=', end),
    );
  }, [firestore, tenantId, selectedDate]); 

  const pilotsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'pilots')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: allBookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);

  const bookings = useMemo(() => {
    if (!allBookings) return [];
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    return allBookings.filter(b => 
        b.startTime.toDate() <= dayEnd && b.endTime.toDate() >= dayStart
    );
  }, [allBookings, selectedDate]);


  const isLoading = isLoadingAircraft || isLoadingBookings || isLoadingPilots;
  const error = aircraftError || bookingsError || pilotsError;

  useEffect(() => {
    const calculateNowLine = () => {
        const now = new Date();
        const isToday = isSameDay(now, selectedDate);
        setShowNowLine(isToday);

        if (isToday) {
            const minutes = now.getHours() * 60 + now.getMinutes();
            const position = minutes * (HOUR_HEIGHT_PX / 60);
            setNowLinePosition(position);
        }
    };
    
    calculateNowLine();
    const interval = setInterval(calculateNowLine, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [selectedDate]);
  
  const handleSlotClick = useCallback((aircraft: Aircraft, time: string, booking?: Booking) => {
    if (booking) {
        return; 
    }
    
    const now = new Date();
    let startTime = time;

    // If it's today and the clicked slot is in the past, default to the current time.
    if (isSameDay(selectedDate, now) && !booking) {
        const [hour, minute] = time.split(':').map(Number);
        const slotDate = setMinutes(setHours(selectedDate, hour), minute);

        if (isBefore(slotDate, now)) {
            startTime = format(now, 'HH:mm');
        }
    }
    
    setFormInitialData({
        aircraft,
        time: startTime,
        date: selectedDate,
        booking: undefined,
    });
    setChecklistTypeToShow(undefined);
    setIsFormOpen(true);
  }, [selectedDate]);

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormInitialData(null);
    setChecklistTypeToShow(undefined);
  };
  
  const handleActionClick = (action: 'view' | 'open', booking: Booking) => {
    if (action === 'open') {
        router.push(`/operations/bookings/${booking.id}`);
        return;
    }

    const aircraftForBooking = aircraft?.find(a => a.id === booking.aircraftId);
    if (!aircraftForBooking) return;

    setFormInitialData({
        aircraft: aircraftForBooking,
        time: format(booking.startTime.toDate(), 'HH:mm'),
        date: booking.startTime.toDate(),
        booking: booking,
    });
    setChecklistTypeToShow(undefined);
    setIsFormOpen(true);
  };

  const extraLanes = ['', '', '', ''];

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex justify-end items-center">
          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                  <CustomCalendar 
                      selectedDate={selectedDate}
                      onDateSelect={(date) => date && setSelectedDate(date)}
                  />
              </PopoverContent>
          </Popover>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Schedule</CardTitle>
            <CardDescription>
              A vertical timeline of all bookings for {format(selectedDate, 'PPP')}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <div className="flex gap-4 h-96">
                  <Skeleton className="flex-1 h-full" />
                  <Skeleton className="flex-1 h-full" />
                  <Skeleton className="flex-1 h-full" />
                </div>
              </div>
            )}
            {error && <p className="p-6 text-destructive">Error loading data: {error.message}</p>}
            {!isLoading && !error && (
              <div className='w-full'>
                  <div className="sticky top-0 z-30 flex bg-swimlane-header text-swimlane-header-foreground flex-shrink-0">
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

                  <div className="flex min-w-max" style={{height: `${TOTAL_HOURS * HOUR_HEIGHT_PX}px`}}>
                    {(aircraft || []).map((ac) => (
                      <AircraftColumn
                        key={ac.id}
                        aircraft={ac}
                        bookings={(bookings || []).filter(b => b.aircraftId === ac.id)}
                        pilots={pilots || []}
                        showNowLine={showNowLine}
                        nowLinePosition={nowLinePosition}
                        selectedDate={selectedDate}
                        onSlotClick={handleSlotClick}
                        onActionClick={handleActionClick}
                      />
                    ))}
                    {extraLanes.map((_, index) => (
                      <AircraftColumn
                          key={`extra-lane-${index}`}
                          bookings={[]}
                          pilots={[]}
                          showNowLine={showNowLine}
                          nowLinePosition={nowLinePosition}
                          selectedDate={selectedDate}
                          onSlotClick={handleSlotClick}
                          onActionClick={handleActionClick}
                      />
                    ))}
                    {(aircraft || []).length === 0 && extraLanes.length === 0 && <div className="flex-1 p-4 text-center text-muted-foreground">Please add aircraft to see the schedule.</div>}
                  </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {isFormOpen && (
        <BookingForm 
            tenantId={tenantId}
            aircraftList={aircraft || []}
            pilotList={pilots || []}
            allBookings={allBookings || []}
            initialData={formInitialData}
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            checklistTypeToShow={checklistTypeToShow}
        />
      )}
    </>
  );
}
