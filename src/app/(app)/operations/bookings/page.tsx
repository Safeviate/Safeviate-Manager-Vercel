
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import { format, startOfDay, endOfDay, getHours, getMinutes, differenceInMinutes, isSameDay, setHours, setMinutes, isBefore, addDays, subDays, startOfToday, endOfHour, parse, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { useRouter } from 'next/navigation';
import { BookingForm } from './booking-form';
import type { Booking } from '@/types/booking';


const combineDateAndTime = (dateStr: string, timeStr: string): Date => {
    if (!dateStr || !timeStr) {
        return new Date('invalid');
    }
    return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
};

const BookingItem = ({ booking, pilots, onBookingClick, selectedDate }: { booking: Booking, pilots: PilotProfile[], onBookingClick: (booking: Booking) => void, selectedDate: Date }) => {
    
    const pilot = pilots.find(p => p.id === booking.pilotId);
    
    const segments = [];

    // First segment (always exists)
    segments.push({
        date: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.isOvernight ? '23:59' : booking.endTime
    });
    
    // Second segment for overnight booking
    if (booking.isOvernight && booking.overnightBookingDate && booking.overnightEndTime) {
        segments.push({
            date: booking.overnightBookingDate,
            startTime: '00:00',
            endTime: booking.overnightEndTime
        });
    }

    const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
    
    return (
      <>
        {segments.map((segment, index) => {
            if (segment.date !== formattedSelectedDate) {
                return null;
            }

            const startTime = combineDateAndTime(segment.date, segment.startTime);
            const endTime = combineDateAndTime(segment.date, segment.endTime);

            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return null;

            const top = (getHours(startTime) * 60 + getMinutes(startTime)) * (HOUR_HEIGHT_PX / 60);
            const durationMinutes = differenceInMinutes(endTime, startTime);
            const height = Math.max(durationMinutes, 0) * (HOUR_HEIGHT_PX / 60);
            
            return (
                <div
                    key={`${booking.id}-${index}`}
                    className={cn(
                        'absolute w-full p-2 text-xs leading-tight shadow-md flex flex-col justify-center text-primary-foreground z-10 min-h-[40px] border border-gray-400 cursor-pointer hover:opacity-90 transition-opacity',
                        (booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason') && 'bg-destructive',
                        booking.status === 'Completed' && 'bg-green-600',
                        booking.status === 'Confirmed' && booking.preFlight && !booking.postFlight && 'bg-amber-500',
                        booking.status === 'Confirmed' && !booking.preFlight && 'bg-primary'
                    )}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    onClick={() => onBookingClick(booking)}
                >
                    <p className="font-semibold truncate">#{booking.bookingNumber} - {booking.type}</p>
                    <p className="truncate">{pilot ? `${pilot.firstName} ${pilot.lastName}` : 'Unknown Pilot'}</p>
                    {booking.status === 'Cancelled' && <p className="font-bold uppercase text-[9px] mt-0.5">Cancelled</p>}
                    {(booking.status === 'Cancelled with Reason') && <p className="font-bold uppercase text-[9px] mt-0.5">Cancelled</p>}
                    {booking.status === 'Completed' && <p className="font-bold uppercase text-[9px] mt-0.5">Completed</p>}
                </div>
            )
        })}
      </>
    )
}

const AircraftColumn = ({ 
    aircraft,
    bookings, 
    pilots, 
    showNowLine, 
    nowLinePosition, 
    selectedDate,
    onSlotClick,
    onBookingClick,
}: { 
    aircraft?: Aircraft; 
    bookings: Booking[]; 
    pilots: PilotProfile[]; 
    showNowLine: boolean; 
    nowLinePosition: number; 
    selectedDate: Date; 
    onSlotClick: (aircraft: Aircraft, time: Date) => void;
    onBookingClick: (booking: Booking) => void;
}) => {
    const today = startOfToday();
    const isSelectedDateInPast = isBefore(selectedDate, today);

    const relevantBookings = useMemo(() => {
        return bookings.filter(b => {
          if (b.isOvernight) {
            // Include if selectedDate is the start date or the overnight end date
            return b.bookingDate === format(selectedDate, 'yyyy-MM-dd') || b.overnightBookingDate === format(selectedDate, 'yyyy-MM-dd');
          }
          return b.bookingDate === format(selectedDate, 'yyyy-MM-dd');
        });
      }, [bookings, selectedDate]);

  return (
    <div 
        className="flex-1 relative border-r min-w-[150px]"
    >
      {Array.from({ length: TOTAL_HOURS }).map((_, hour) => {
        const slotTime = setMinutes(setHours(selectedDate, hour), 0);
        const endOfSlot = endOfHour(slotTime);
        const isPast = isSelectedDateInPast || (isSameDay(selectedDate, new Date()) && isBefore(endOfSlot, new Date()));
        
        const isDisabled = isPast;

        return (
            <div 
                key={hour} 
                className={cn(
                    "relative border-t",
                    isDisabled ? "bg-muted/30" : "cursor-pointer hover:bg-accent/50 transition-colors"
                )} 
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                onClick={() => !isDisabled && aircraft && onSlotClick(aircraft, slotTime)}
            >
                <span className="absolute top-1 left-1 text-xs text-muted-foreground pointer-events-none">
                    {format(new Date(0, 0, 0, hour), 'HH:mm')}
                </span>
            </div>
        )
      })}
      
      {showNowLine && (
        <div 
          className="absolute top-0 left-0 right-0 bg-destructive/20 z-0 pointer-events-none"
          style={{ height: `${nowLinePosition}px` }}
        />
      )}

      {showNowLine && (
        <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none" style={{ top: `${nowLinePosition}px` }}>
          <div className="absolute -left-1.5 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      )}

      {relevantBookings.map((booking) => (
        <BookingItem 
            key={booking.id} 
            booking={booking}
            pilots={pilots}
            onBookingClick={onBookingClick}
            selectedDate={selectedDate}
        />
      ))}
    </div>
  );
};

const HOUR_HEIGHT_PX = 60;
const TOTAL_HOURS = 24;


export default function SchedulePage() {
  const firestore = useFirestore();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(startOfToday());

  const [nowLinePosition, setNowLinePosition] = useState(0);
  const [showNowLine, setShowNowLine] = useState(false);
  
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<{ aircraft: Aircraft; startTime: Date; allBookingsForAircraft: Booking[]; booking?: Booking } | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const yesterday = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    const today = format(selectedDate, 'yyyy-MM-dd');
    
    return query(
        collection(firestore, 'tenants', tenantId, 'bookings'),
        where('bookingDate', 'in', [yesterday, today]),
    );
  }, [firestore, tenantId, selectedDate, dataVersion]); 

  const allBookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'bookings')) : null),
    [firestore, tenantId, dataVersion]
  );

  const pilotsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'pilots')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useCollection<Aircraft>(aircraftQuery);
  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);
  const { data: allBookings, isLoading: isLoadingAllBookings, error: allBookingsError } = useCollection<Booking>(allBookingsQuery);
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);

  const isLoading = isLoadingAircraft || isLoadingBookings || isLoadingPilots || isLoadingAllBookings;
  const error = aircraftError || bookingsError || pilotsError || allBookingsError;

  const refreshBookings = useCallback(() => {
    setDataVersion(v => v + 1);
  }, []);

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
  
  const handleSlotClick = (aircraft: Aircraft, time: Date) => {
    const now = new Date();
    const isCurrentHourSlot = isSameDay(time, now) && getHours(time) === getHours(now);
    const startTime = isCurrentHourSlot && isAfter(now, time) ? now : time;
    const allBookingsForAircraft = allBookings?.filter(b => b.aircraftId === aircraft.id) || [];

    setBookingFormData({ aircraft, startTime, allBookingsForAircraft });
    setIsBookingFormOpen(true);
  };
  
  const handleBookingClick = (booking: Booking) => {
    const aircraftForBooking = aircraft?.find(a => a.id === booking.aircraftId);
    if (aircraftForBooking) {
      const allBookingsForAircraft = allBookings?.filter(b => b.aircraftId === aircraftForBooking.id) || [];
      const updatedBooking = allBookings?.find(b => b.id === booking.id) || booking;
      setBookingFormData({ aircraft: aircraftForBooking, startTime: combineDateAndTime(updatedBooking.bookingDate, updatedBooking.startTime), allBookingsForAircraft, booking: updatedBooking });
      setIsBookingFormOpen(true);
    }
  };
  
  const extraLanes = ['', '', '', ''];

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex justify-end items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>Previous Day</Button>
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
                      onDateSelect={(date) => date && setSelectedDate(startOfDay(date))}
                  />
              </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>Next Day</Button>
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
              <div className='w-full overflow-x-auto'>
                  <div className="sticky top-0 z-30 flex bg-swimlane-header text-swimlane-header-foreground flex-shrink-0">
                    {(aircraft || []).map((ac) => (
                      <div key={ac.id} className="flex-1 p-2 font-semibold text-center border-r min-w-[150px] flex items-center justify-center gap-2">
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
                        onBookingClick={handleBookingClick}
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
                          onSlotClick={() => {}}
                          onBookingClick={() => {}}
                      />
                    ))}
                    {(aircraft || []).length === 0 && extraLanes.length === 0 && <div className="flex-1 p-4 text-center text-muted-foreground">Please add aircraft to see the schedule.</div>}
                  </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {bookingFormData && (
          <BookingForm 
            isOpen={isBookingFormOpen}
            setIsOpen={setIsBookingFormOpen}
            aircraft={bookingFormData.aircraft}
            startTime={bookingFormData.startTime}
            tenantId={tenantId}
            pilots={pilots || []}
            allBookingsForAircraft={bookingFormData.allBookingsForAircraft}
            existingBooking={bookingFormData.booking}
            refreshBookings={refreshBookings}
          />
      )}
    </>
  );
}
