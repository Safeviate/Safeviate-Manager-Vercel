'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
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
import { Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { getBlockingBookingForTracking, isBookingEligibleForTracking } from '@/lib/booking-tracking';

const HOUR_HEIGHT_PX = 60;
const TOTAL_HOURS = 24;
const TIME_COL_WIDTH_CLASS = "w-20";
const LANE_WIDTH_CLASS = "w-[150px]";
const LANE_FLEX_CLASS = "flex-[0_0_150px]";
const REQUIRED_CHECK_APPROVAL_KEYS = ['massAndBalance', 'navlog', 'preFlight', 'postFlight', 'photos', 'fuelUplift'] as const;

const combineDateAndTime = (dateStr: string, timeStr: string): Date => {
    if (!dateStr || !timeStr) {
        return new Date('invalid');
    }
    return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
};

const BookingItem = ({
    booking,
    onBookingClick,
    onManualApprove,
    canManualApprove,
    isApproving,
    selectedDate,
    peopleMap,
    allBookingsForAircraft,
}: {
    booking: Booking;
    onBookingClick: (booking: Booking) => void;
    onManualApprove: (booking: Booking) => void;
    canManualApprove: (booking: Booking) => boolean;
    isApproving: boolean;
    selectedDate: Date;
    peopleMap: Map<string, string>;
    allBookingsForAircraft: Booking[];
}) => {
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
            const statusLabel = booking.status === 'Completed' ? 'Complete' : booking.status;
            const trackEligible = (booking.navlog?.legs?.length || 0) > 0 && isBookingEligibleForTracking(allBookingsForAircraft, booking);
            const blockingBooking = trackEligible ? null : getBlockingBookingForTracking(allBookingsForAircraft, booking);

            return (
                <div
                    key={`${booking.id}-${index}`}
                    className={cn(
                        'absolute left-1 right-1 px-1 py-0.5 text-[9px] leading-none shadow-md flex flex-col justify-between items-stretch z-10 border border-gray-400/50 cursor-pointer hover:opacity-90 transition-opacity rounded overflow-hidden',
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
                    <div className="flex w-full flex-1 flex-col justify-evenly text-center">
                        <p className="w-full truncate text-[8px] font-medium leading-tight">
                            #{booking.bookingNumber} - {booking.type}
                        </p>
                        <p className="w-full truncate text-[8px] font-normal leading-tight opacity-90">
                            Inst: {booking.instructorId ? (peopleMap.get(booking.instructorId) || booking.instructorId) : 'N/A'}
                        </p>
                        <p className="w-full truncate text-[8px] font-normal leading-tight opacity-90">
                            Stud: {booking.studentId ? (peopleMap.get(booking.studentId) || booking.studentId) : 'N/A'}
                        </p>
                    </div>
                    <div className="mt-0.5 flex w-full items-center justify-center">
                        {booking.status !== 'Approved' && booking.status !== 'Completed' && !isCancelled && canManualApprove(booking) ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-5 w-full rounded-md border-input bg-background px-1.5 text-[7px] font-medium uppercase tracking-[0.18em] text-foreground shadow-sm hover:bg-accent justify-center"
                                disabled={isApproving}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onManualApprove(booking);
                                }}
                            >
                                {isApproving ? <Loader2 className="mr-1 h-2 w-2 animate-spin" /> : <CheckCircle2 className="mr-1 h-2 w-2" />}
                                Approve Booking
                            </Button>
                        ) : (
                            <div className="flex w-full flex-col items-center justify-center gap-0.5 text-center">
                                {isCancelled && <p className="text-[7px] font-medium uppercase tracking-wide">Cancelled</p>}
                                {booking.status === 'Completed' && <p className="text-[7px] font-medium uppercase tracking-wide">{statusLabel}</p>}
                                {booking.status === 'Approved' && (
                                    <p className="text-[7px] font-medium uppercase tracking-wide">
                                        {booking.approvedByName ? `Approved by ${booking.approvedByName}` : 'Approved'}
                                    </p>
                                )}
                                {booking.status === 'Approved' && booking.approvedAt ? (
                                    <p className="text-[7px] font-normal leading-none opacity-80">{format(new Date(booking.approvedAt), 'PPP p')}</p>
                                ) : null}
                                {booking.status !== 'Approved' && booking.status !== 'Completed' && !isCancelled && !canManualApprove(booking) ? (
                                    <p className="text-[7px] font-medium uppercase tracking-wide opacity-80">Awaiting instructor approval</p>
                                ) : null}
                                {blockingBooking ? (
                                    <Badge variant="outline" className="h-4 rounded-md border-amber-200 bg-amber-50 px-1.5 text-[6px] font-black uppercase tracking-[0.12em] text-amber-800">
                                        <Lock className="mr-0.5 h-2 w-2" />
                                        Locked #{blockingBooking.bookingNumber}
                                    </Badge>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            )
        })}
      </>
    )
}

export default function SchedulePage() {
  const { toast } = useToast();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission, isLoading: isPermissionsLoading } = usePermissions();
  const [selectedDate, setSelectedDate] = useState(startOfToday());

  const [now, setNow] = useState(new Date());
  const [nowLinePosition, setNowLinePosition] = useState(0);
  const [showNowLine, setShowNowLine] = useState(false);
  
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<{ aircraft: Aircraft; startTime: Date; allBookingsForAircraft: Booking[]; booking?: Booking } | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // PERMISSIONS
  const canManageSchedule = hasPermission('bookings-schedule-manage');

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [instructors, setInstructors] = useState<PilotProfile[]>([]);
  const [students, setStudents] = useState<PilotProfile[]>([]);
  const [privatePilots, setPrivatePilots] = useState<PilotProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingBookingId, setApprovingBookingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [scheduleResponse, summaryResponse] = await Promise.all([
          fetch('/api/schedule-data', { cache: 'no-store' }),
          fetch('/api/dashboard-summary', { cache: 'no-store' }),
        ]);

        const schedulePayload = await scheduleResponse.json();
        const summaryPayload = await summaryResponse.json();
        if (!cancelled) {
          const scheduleBookings = schedulePayload.bookings ?? [];
          const apiAircraft = schedulePayload.aircraft ?? [];
          setAircraft(apiAircraft);
          setAllBookings(scheduleBookings);

          const today = format(selectedDate, 'yyyy-MM-dd');
          const yesterday = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
          setBookings(
            scheduleBookings.filter((booking: Booking) => booking.date === today || booking.date === yesterday)
          );

          setPersonnel(summaryPayload.personnel ?? []);
          setInstructors(summaryPayload.instructors ?? []);
          setStudents(summaryPayload.students ?? []);
          setPrivatePilots(summaryPayload.privatePilots ?? []);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    const handlePersonnelUpdated = () => {
      if (!cancelled) {
        setDataVersion(v => v + 1);
      }
    };
    window.addEventListener('safeviate-personnel-updated', handlePersonnelUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('safeviate-personnel-updated', handlePersonnelUpdated);
    };
  }, [tenantId, selectedDate, dataVersion]);

  const allPilots = useMemo(() => {
      const uniquePeople = new Map<string, Personnel | PilotProfile>();
      [...(personnel || []), ...(students || []), ...(instructors || []), ...(privatePilots || [])].forEach((person) => {
          uniquePeople.set(person.id, person);
      });
      return Array.from(uniquePeople.values());
  }, [personnel, students, instructors, privatePilots]);

  const peopleMap = useMemo(() => {
      const map = new Map<string, string>();
      allPilots.forEach((person) => {
          map.set(person.id, `${person.firstName} ${person.lastName}`);
      });
      return map;
  }, [allPilots]);

  const refreshBookings = useCallback(() => {
    setDataVersion(v => v + 1);
  }, []);

  const canManualApprove = useCallback((booking: Booking) => {
    const userId = userProfile?.id;
    const userRole = userProfile?.role?.toLowerCase();
    return ((!!userId && booking.instructorId === userId) || userRole === 'developer' || userRole === 'dev');
  }, [userProfile?.id, userProfile?.role]);

  const handleManualApproveBooking = useCallback(async (booking: Booking) => {
    if (!canManualApprove(booking)) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only the assigned instructor can approve this flight.' });
      return;
    }

    const confirmed = window.confirm(`Approve booking #${booking.bookingNumber} now?`);
    if (!confirmed) return;

    setApprovingBookingId(booking.id);
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking: {
            ...booking,
            status: 'Approved',
            approvedById: userProfile?.id || booking.approvedById,
            approvedByName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : booking.approvedByName,
            approvedAt: new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Approval failed.');
      }

      window.dispatchEvent(new Event('safeviate-bookings-updated'));
      refreshBookings();
      toast({ title: 'Flight Approved', description: `Booking #${booking.bookingNumber} was manually approved.` });
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Approval Failed', description: error instanceof Error ? error.message : 'Approval failed.' });
    } finally {
      setApprovingBookingId((current) => (current === booking.id ? null : current));
    }
  }, [canManualApprove, refreshBookings, toast, userProfile]);

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
    const slotTime = setMinutes(setHours(selectedDate, hour), 0);
    const currentTime = new Date();
    
    if (isSameDay(selectedDate, currentTime) && hour < getHours(now)) {
        toast({
            variant: 'destructive',
            title: 'Slot Unavailable',
            description: 'Past time slots cannot be used for new bookings.',
        });
        return; 
    }
    if (isBefore(selectedDate, startOfDay(currentTime))) {
        toast({
            variant: 'destructive',
            title: 'Date Unavailable',
            description: 'You cannot create a new booking on a past date.',
        });
        return;
    }

    const isCurrentHourSlot = isSameDay(slotTime, currentTime) && getHours(slotTime) === getHours(now);
    const startTime = isCurrentHourSlot ? now : slotTime;
    
    const allBookingsForAircraft = allBookings?.filter(b => b.aircraftId === ac.id) || [];

    setBookingFormData({ aircraft: ac, startTime, allBookingsForAircraft });
    setIsBookingFormOpen(true);

    if (!isPermissionsLoading && !canManageSchedule) {
        toast({
            title: 'Read-Only Access',
            description: 'You can view booking details, but you do not have permission to create or edit bookings.',
        });
    }
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
  
  const hasAircraft = (aircraft || []).length > 0;
  const extraLanes = hasAircraft ? ['', '', ''] : [];

  if (isLoading) {
    return <div className="max-w-[1200px] mx-auto w-full px-1"><Skeleton className="h-[600px] w-full" /></div>;
  }

  const isTodaySelected = isSameDay(selectedDate, startOfToday());
  const isPastDaySelected = isBefore(selectedDate, startOfToday());

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1 overflow-hidden">
        <Card className="overflow-hidden flex-grow flex flex-col shadow-none border">
            <MainPageHeader 
                title="Daily Schedule"
                description=""
                className="lg:[&_.main-page-header__header]:justify-center"
                actions={
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
                        {!canManageSchedule && (
                            <Badge variant="outline" className="h-9 gap-1.5 text-muted-foreground bg-muted/20 border-border px-3 uppercase text-[10px] font-bold">
                                <Lock className="h-3.5 w-3.5" /> Read Only
                            </Badge>
                        )}
                    </div>
                }
            />
            <CardContent className="p-0 flex-grow flex flex-col overflow-hidden">
                {!hasAircraft ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">No Aircraft Configured</p>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Add at least one aircraft before creating bookings from the daily schedule.
                        </p>
                        <Button asChild size="sm" className="font-black uppercase text-xs">
                            <Link href="/assets/aircraft/new">Add Aircraft</Link>
                        </Button>
                    </div>
                ) : (
                <div className="w-full flex-grow overflow-auto bg-card custom-scrollbar" style={{ height: 'calc(100vh - 220px)' }}>
                    <div className="min-w-full w-fit">
                        
                        <div className="flex sticky top-0 z-50 bg-swimlane-header border-b border-white/10">
                            <div className={cn(TIME_COL_WIDTH_CLASS, "flex-shrink-0 flex items-center justify-center font-bold text-[10px] text-swimlane-header-foreground uppercase tracking-wider h-12 bg-swimlane-header border-r sticky left-0 z-50 shadow-[2px_0_5px_rgba(0,0,0,0.1)]")}>
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

                        <div className="flex relative">
                            
                            <div className={cn(TIME_COL_WIDTH_CLASS, "flex-shrink-0 border-r bg-swimlane-header sticky left-0 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.05)]")}>
                                {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
                                    <div 
                                        key={hour} 
                                        className="flex items-center justify-center border-b text-[10px] md:text-xs font-mono font-bold text-swimlane-header-foreground bg-swimlane-header"
                                        style={{ height: `${HOUR_HEIGHT_PX}px` }}
                                    >
                                        {format(new Date(0, 0, 0, hour), 'HH:mm')}
                                    </div>
                                ))}
                            </div>

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
                                                    onClick={() => handleSlotClick(ac, hour)}
                                                />
                                            )
                                        })}
                                        {relevantBookings.map((booking) => (
                                        <BookingItem 
                                            key={booking.id} 
                                            booking={booking}
                                            onBookingClick={handleBookingClick}
                                            onManualApprove={handleManualApproveBooking}
                                            canManualApprove={canManualApprove}
                                            isApproving={approvingBookingId === booking.id}
                                            selectedDate={selectedDate}
                                            peopleMap={peopleMap}
                                            allBookingsForAircraft={allBookings?.filter((entry) => entry.aircraftId === ac.id) || []}
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
                )}
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
