'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../users/personnel/page';
import { format, startOfDay, endOfDay, addHours, getHours, getMinutes, differenceInMinutes, isSameDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock } from 'lucide-react';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BookingForm } from '../bookings/booking-form';

const HOURS_IN_DAY = 24;
const HOUR_WIDTH_PX = 80;

interface BookingItemProps {
    booking: Booking;
    pilots: PilotProfile[];
    onClick: () => void;
}

const BookingItem = ({ booking, pilots, onClick }: BookingItemProps) => {
    const pilot = useMemo(() => pilots.find(p => p.id === booking.pilotId), [pilots, booking.pilotId]);

    const startTime = booking.startTime.toDate();
    const endTime = booking.endTime.toDate();

    const startMinutes = getHours(startTime) * 60 + getMinutes(startTime);
    const durationMinutes = differenceInMinutes(endTime, startTime);

    const totalMinutesInDay = HOURS_IN_DAY * 60;
    const totalWidth = HOURS_IN_DAY * HOUR_WIDTH_PX;

    const left = (startMinutes / totalMinutesInDay) * totalWidth;
    const width = (durationMinutes / totalMinutesInDay) * totalWidth;

    return (
         <div
            onClick={onClick}
            className={cn(
                "absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-primary-foreground p-2 shadow z-20 h-10 cursor-pointer",
                booking.status === 'Cancelled' ? 'bg-destructive/80' : 'bg-primary/80'
            )}
            style={{ left: `${left}px`, width: `${width}px` }}
        >
            <div className="flex flex-col text-xs text-center truncate">
                <span className="truncate">{booking.type}</span>
                <span className="truncate">{pilot ? `${pilot.firstName} ${pilot.lastName}` : booking.pilotId}</span>
                {booking.status === 'Cancelled' && <span className="font-bold uppercase text-[9px] mt-0.5">Cancelled</span>}
            </div>
        </div>
    );
};

export default function BookingsSwimlanePage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [nowLine, setNowLine] = useState<number | null>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialState, setFormInitialState] = useState<{ aircraft: Aircraft; time: string; date: Date; booking?: Booking } | null>(null);

  const timeSlots = useMemo(() => {
    return Array.from({ length: HOURS_IN_DAY }, (_, i) => {
      const time = addHours(startOfDay(selectedDate), i);
      return format(time, 'HH:mm');
    });
  }, [selectedDate]);

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

  const handleSlotClick = useCallback((aircraft: Aircraft, time: string, booking?: Booking) => {
    const [hour] = time.split(':').map(Number);
    const bookingDate = hour < 6 ? addDays(selectedDate, 1) : selectedDate;

    setFormInitialState({
        aircraft,
        time,
        date: bookingDate,
        booking: booking
    });
    setIsFormOpen(true);
  }, [selectedDate]);

  useEffect(() => {
    const calculateNowLine = () => {
        const now = new Date();
        if (isSameDay(now, selectedDate)) {
            const minutes = now.getHours() * 60 + now.getMinutes();
            const position = (minutes / (HOURS_IN_DAY * 60)) * (HOURS_IN_DAY * HOUR_WIDTH_PX);
            setNowLine(position);
        } else {
            setNowLine(null);
        }
    };
    calculateNowLine();
    const interval = setInterval(calculateNowLine, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const scrollToNow = useCallback(() => {
    if (nowLine !== null && dataRef.current) {
        dataRef.current.scrollTo({
            left: nowLine - dataRef.current.offsetWidth / 2,
            behavior: 'smooth',
        });
    }
  }, [nowLine]);

  useEffect(() => {
    scrollToNow();
  }, [scrollToNow]);

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
         <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bookings Timetable</h1>
                <p className="text-muted-foreground">A horizontal view of the daily booking schedule.</p>
            </div>
            <div className='flex items-center gap-2'>
                <Button variant="outline" onClick={scrollToNow} disabled={nowLine === null}>
                    <Clock className="mr-2 h-4 w-4" /> Go to Now
                </Button>
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
        </div>

        <Card className="flex-grow overflow-hidden">
            <CardContent className="p-0 h-full">
            {isLoading && <Skeleton className="w-full h-full" />}
            {error && <p className="text-destructive text-center p-4">Error: {error.message}</p>}
            {!isLoading && !error && (
                <div className="flex flex-col h-full border rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="flex border-b bg-muted/50 flex-shrink-0">
                        <div className="w-48 flex-shrink-0 p-2 border-r flex items-center justify-center">
                            <h3 className="font-semibold text-center">Aircraft</h3>
                        </div>
                        <div className="flex-grow overflow-x-hidden">
                            <div className="relative h-full">
                                <div className="flex" style={{ width: `${HOURS_IN_DAY * HOUR_WIDTH_PX}px` }}>
                                    {timeSlots.map((time) => (
                                        <div key={time} style={{ width: `${HOUR_WIDTH_PX}px` }} className="flex-shrink-0 text-center text-sm font-medium p-2 border-r text-muted-foreground">
                                            {time}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-grow relative overflow-auto" ref={dataRef}>
                        <div className="absolute inset-0 grid" style={{ gridTemplateRows: `repeat(${aircraft?.length || 0}, 40px)` }}>
                            {/* Aircraft Rows */}
                            {aircraft?.map((ac, index) => (
                                <div key={ac.id} className="flex border-b">
                                    <div className="w-48 flex-shrink-0 p-2 border-r flex items-center bg-muted/20">
                                        <span className="font-medium">{ac.tailNumber}</span>
                                    </div>
                                    <div className="relative flex-grow">
                                        <div className="absolute inset-0 flex">
                                            {timeSlots.map((time, timeIndex) => (
                                                <div 
                                                    key={time} 
                                                    style={{ width: `${HOUR_WIDTH_PX}px` }} 
                                                    className="flex-shrink-0 border-r h-full hover:bg-primary/10 cursor-pointer" 
                                                    onClick={() => {}}
                                                />
                                            ))}
                                        </div>
                                        {bookings?.filter(b => b.aircraftId === ac.id).map(booking => (
                                            <BookingItem 
                                                key={booking.id} 
                                                booking={booking} 
                                                pilots={pilots || []} 
                                                onClick={() => handleSlotClick(ac, format(booking.startTime.toDate(), 'HH:mm'), booking)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                         {/* "Now" Line */}
                        {nowLine !== null && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30" style={{ left: `${nowLine}px` }}>
                                <div className="absolute -top-1.5 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
                            </div>
                        )}
                    </div>
                </div>
            )}
            </CardContent>
        </Card>
      </div>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
            {formInitialState && (
                <BookingForm
                    tenantId={tenantId}
                    aircraftList={aircraft || []}
                    pilotList={pilots || []}
                    initialData={formInitialState}
                    onClose={() => setIsFormOpen(false)}
                />
            )}
        </DialogContent>
    </Dialog>
    </>
  );
}
