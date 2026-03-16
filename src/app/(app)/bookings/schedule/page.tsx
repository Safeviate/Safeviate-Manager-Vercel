'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { format, startOfDay, getHours, getMinutes, differenceInMinutes, isSameDay, setHours, setMinutes, isBefore, addDays, subDays, startOfToday, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Lock } from 'lucide-react';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { BookingForm } from './booking-form';
import type { Booking } from '@/types/booking';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const HOUR_HEIGHT_PX = 60;
const TOTAL_HOURS = 24;
const TIME_COL_WIDTH_CLASS = "w-20";
const LANE_WIDTH_CLASS = "w-[150px]";
const LANE_FLEX_CLASS = "flex-[0_0_150px]";

const combineDateAndTime = (dateStr: string, timeStr: string): Date => {
    if (!dateStr || !timeStr) {
        return new Date('invalid');
    }
    return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
};

const BookingItem = ({ booking, onBookingClick, selectedDate }: { booking: Booking, onBookingClick: (booking: Booking) => void, selectedDate: Date }) => {
    const segments = [];

    segments.push({
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.isOvernight ? '23:59' : booking.endTime
    });
    
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
            const durationMinutes = Math.max(0, differenceInMinutes(endTime, startTime));
            const height = Math.max(durationMinutes, 40) * (HOUR_HEIGHT_PX / 60); 
            
            const isCancelled = booking.status === 'Cancelled' || booking.status === 'Cancelled with Reason';

            return (
                <div
                    key={`${booking.id}-${index}`}
                    className={cn(
                        'absolute left-1 right-1 p-2 text-[10px] md:text-xs leading-tight shadow-md flex flex-col justify-center z-10 border border-gray-400/50 cursor-pointer hover:opacity-90 transition-opacity rounded',
                        isCancelled && 'bg-muted text-muted-foreground opacity-60',
                        booking.status === 'Completed' && 'bg-muted text-muted-foreground border-slate-300',
                        booking.status === 'Approved' && 'bg-green-600 text-white border-green-700',
                        booking.status === 'Confirmed' && booking.preFlight && !booking.postFlight && 'bg-amber-500 text-primary-foreground',
                        booking.status === 'Confirmed' && !booking.preFlight && 'bg-primary text-primary-foreground'
                    )}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(booking);
                    }}
                >
                    <p className="font-semibold truncate">#{booking.bookingNumber} - {booking.type}</p>
                    {isCancelled && <p className="font-bold uppercase text-[8px] mt-0.5">Cancelled</p>}
                    {booking.status === 'Completed' && <p className="font-bold uppercase text-[8px] mt-0.5">Completed</p>}
                    {booking.status === 'Approved' && <p className="font-bold uppercase text-[8px] mt-0.5">Approved</p>}
                </div>
            )
        })}
      </>
    )
}

export default function SchedulePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const [selectedDate, setSelectedDate] = useState(startOfToday());

  const [now, setNow] = useState(new Date());
  const [nowLinePosition, setNowLinePosition] = useState(0);
  const [showNowLine, setShowNowLine] = useState(false);
  
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<{ aircraft: Aircraft; startTime: Date; allBookingsForAircraft: Booking[]; booking?: Booking } | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // PERMISSIONS
  const canManageSchedule = hasPermission('bookings-schedule-manage');

  const aircraftQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );
  
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    const today = format(selectedDate, 'yyyy-MM-dd');
    const yesterday = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    return query(
        collection(firestore, `tenants/${tenantId}/bookings`),
        where('date', 'in', [today, yesterday]),
    );
  }, [firestore, tenantId, selectedDate, dataVersion]); 

  const allBookingsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
    [firestore, tenantId, dataVersion]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useCollection<Aircraft>(aircraftQuery);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: allBookings, isLoading: isLoadingAllBookings } = useCollection<Booking>(allBookingsQuery);

  const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/instructors`) || '') : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/students`) || '') : null), [firestore, tenantId]);
  const privatePilotsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/private-pilots`) || '') : null), [firestore, tenantId]);

  const { data: personnel } = useCollection<Personnel>(personnelQuery);
  const { data: instructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students } = useCollection<PilotProfile>(studentsQuery);
  const { data: privatePilots } = useCollection<PilotProfile>(privatePilotsQuery);

  const allPilots = useMemo(() => {
      return [...(personnel || []), ...(students || []), ...(instructors || []), ...(privatePilots || [])];
  }, [personnel, students, instructors, privatePilots]);

  const isLoading = isLoadingAircraft || isLoadingBookings || isLoadingAllBookings;

  const refreshBookings = useCallback(() => {
    setDataVersion(v => v + 1);
  }, []);

  useEffect(() => {
    const calculateNowLine = () => {
        const currentTime = new Date();
        setNow(currentTime);
        const isToday = isSameDay(currentTime, selectedDate);
        setShowNowLine(isToday);

        if (isToday) {
            const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
            const position = minutes * (HOUR_HEIGHT_PX / 60);
            setNowLinePosition(position);
        }
    };
    
    calculateNowLine();
    const interval = setInterval(calculateNowLine, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);
  
  const handleSlotClick = (ac: Aircraft, hour: number) => {
    if (!canManageSchedule) {
        toast({
            variant: 'destructive',
            title: 'Access Restricted',
            description: 'You do not have permission to create bookings on the schedule.',
        });
        return;
    }

    const slotTime = setMinutes(setHours(selectedDate, hour), 0);
    const currentTime = new Date();
    
    // Block clicks strictly in the past
    if (isSameDay(selectedDate, currentTime) && hour < getHours(currentTime)) {
        return; 
    }
    if (isBefore(selectedDate, startOfDay(currentTime))) {
        return;
    }

    // If clicking current hour, default start time to 'now' to satisfy future-booking validation
    const isCurrentHourSlot = isSameDay(slotTime, currentTime) && getHours(slotTime) === getHours(currentTime);
    const startTime = isCurrentHourSlot ? currentTime : slotTime;
    
    const allBookingsForAircraft = allBookings?.filter(b => b.aircraftId === ac.id) || [];

    setBookingFormData({ aircraft: ac, startTime, allBookingsForAircraft });
    setIsBookingFormOpen(true);
  };
  
  const handleBookingClick = (booking: Booking) => {
    const aircraftForBooking = aircraft?.find(a => a.id === booking.aircraftId);
    if (aircraftForBooking) {
      const allBookingsForAircraft = allBookings?.filter(b => b.aircraftId === aircraftForBooking.id) || [];
      const updatedBooking = allBookings?.find(b => b.id === booking.id) || booking;
      setBookingFormData({ aircraft: aircraftForBooking, startTime: combineDateAndTime(updatedBooking.date, updatedBooking.startTime), allBookingsForAircraft, booking: updatedBooking });
      setIsBookingFormOpen(true);
    }
  };
  
  const extraLanes = ['', '', ''];

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const isTodaySelected = isSameDay(selectedDate, startOfToday());
  const isPastDaySelected = isBefore(selectedDate, startOfToday());

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Daily Schedule</h1>
                    <p className="text-muted-foreground">
                        Fleet timeline for {format(selectedDate, 'PPP')}.
                    </p>
                </div>
                {!canManageSchedule && (
                    <Badge variant="outline" className="h-6 gap-1.5 text-muted-foreground bg-muted/20 border-border">
                        <Lock className="h-3 w-3" /> Read Only
                    </Badge>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>Previous Day</Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
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
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>Next Day</Button>
            </div>
        </div>

        <Card className="overflow-hidden flex-grow flex flex-col shadow-none border">
            <CardContent className="p-0 flex-grow flex flex-col overflow-hidden">
                <div className="w-full flex-grow overflow-auto bg-card custom-scrollbar" style={{ height: 'calc(100vh - 220px)' }}>
                    <div className="min-w-full w-fit">
                        
                        {/* Headers Row */}
                        <div className="flex sticky top-0 z-50 bg-swimlane-header border-b border-white/10">
                            <div className={cn(TIME_COL_WIDTH_CLASS, "flex-shrink-0 flex items-center justify-center font-bold text-[10px] text-swimlane-header-foreground uppercase tracking-wider h-12 bg-swimlane-header border-r")}>
                                TIME
                            </div>
                            {(aircraft || []).map((ac) => (
                                <div 
                                    key={ac.id} 
                                    className={cn(LANE_FLEX_CLASS, LANE_WIDTH_CLASS, "border-r flex items-center justify-center font-bold text-xs px-2 text-center text-swimlane-header-foreground h-12 bg-swimlane-header whitespace-normal leading-tight")}
                                >
                                    {ac.tailNumber}
                                </div>
                            ))}
                            {extraLanes.map((_, laneIdx) => (
                                <div 
                                    key={`extra-h-${laneIdx}`} 
                                    className={cn(LANE_FLEX_CLASS, LANE_WIDTH_CLASS, "border-r bg-swimlane-header h-12")}
                                />
                            ))}
                        </div>

                        {/* Schedule Body */}
                        <div className="flex relative">
                            
                            {/* Time Column Body */}
                            <div className={cn(TIME_COL_WIDTH_CLASS, "flex-shrink-0 border-r bg-swimlane-header/5")}>
                                {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
                                    <div 
                                        key={hour} 
                                        className="flex items-center justify-center border-b text-[10px] md:text-xs font-mono font-bold text-muted-foreground bg-muted/5"
                                        style={{ height: `${HOUR_HEIGHT_PX}px` }}
                                    >
                                        {format(new Date(0, 0, 0, hour), 'HH:mm')}
                                    </div>
                                ))}
                            </div>

                            {/* Main Grid Area */}
                            {(aircraft || []).map((ac) => {
                                const relevantBookings = (bookings || []).filter(b => {
                                    if (b.isOvernight) {
                                        return (b.aircraftId === ac.id) && (b.date === format(selectedDate, 'yyyy-MM-dd') || b.overnightBookingDate === format(selectedDate, 'yyyy-MM-dd'));
                                    }
                                    return (b.aircraftId === ac.id) && (b.date === format(selectedDate, 'yyyy-MM-dd'));
                                });

                                return (
                                    <div 
                                        key={ac.id} 
                                        className={cn(LANE_FLEX_CLASS, LANE_WIDTH_CLASS, "border-r relative")}
                                    >
                                        {Array.from({ length: TOTAL_HOURS }).map((_, hour) => {
                                            const isPast = isPastDaySelected || (isTodaySelected && hour < getHours(now));
                                            return (
                                                <div 
                                                    key={hour} 
                                                    className={cn(
                                                        "border-b relative transition-colors",
                                                        isPast ? "bg-red-500/[0.02] cursor-not-allowed" : "cursor-pointer hover:bg-accent/50",
                                                        !canManageSchedule && !isPast && "cursor-default"
                                                    )} 
                                                    style={{ height: `${HOUR_HEIGHT_PX}px` }}
                                                    onClick={() => !isPast && handleSlotClick(ac, hour)}
                                                />
                                            )
                                        })}
                                        {relevantBookings.map((booking) => (
                                            <BookingItem 
                                                key={booking.id} 
                                                booking={booking}
                                                onBookingClick={handleBookingClick}
                                                selectedDate={selectedDate}
                                            />
                                        ))}
                                    </div>
                                );
                            })}

                            {extraLanes.map((_, laneIdx) => (
                                <div 
                                    key={`extra-${laneIdx}`} 
                                    className={cn(LANE_FLEX_CLASS, LANE_WIDTH_CLASS, "border-r bg-muted/5 opacity-50")}
                                >
                                    {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
                                        <div 
                                            key={hour} 
                                            className="border-b"
                                            style={{ height: `${HOUR_HEIGHT_PX}px` }}
                                        />
                                    ))}
                                </div>
                            ))}

                            {/* Precise Past Mask & Red Line */}
                            {showNowLine && (
                                <>
                                    <div 
                                        className="absolute left-0 right-0 bg-red-500/[0.08] z-20 pointer-events-none" 
                                        style={{ top: 0, height: `${nowLinePosition}px` }}
                                    />
                                    <div 
                                        className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 pointer-events-none" 
                                        style={{ top: `${nowLinePosition}px` }}
                                    >
                                        <div className="absolute -left-1.5 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {bookingFormData && tenantId && (
            <BookingForm 
                isOpen={isBookingFormOpen}
                setIsOpen={setIsBookingFormOpen}
                aircraft={bookingFormData.aircraft}
                startTime={bookingFormData.startTime}
                tenantId={tenantId}
                pilots={allPilots}
                allBookingsForAircraft={bookingFormData.allBookingsForAircraft}
                existingBooking={bookingFormData.booking}
                refreshBookings={refreshBookings}
            />
        )}
    </div>
  );
}
