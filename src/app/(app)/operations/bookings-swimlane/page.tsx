'use client';

import { useMemo, useState, useCallback } from 'react';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../../users/personnel/page';
import { format, startOfDay, endOfDay, getHours, getMinutes, differenceInMinutes, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BookingForm } from '../bookings/booking-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';


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

const BookingItem = ({ booking, pilots, tenantId, onEdit }: { booking: Booking, pilots: PilotProfile[], tenantId: string, onEdit: () => void }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const startTime = booking.startTime.toDate();
    const endTime = booking.endTime.toDate();

    const top = (getHours(startTime) * 60 + getMinutes(startTime)) * (HOUR_HEIGHT_PX / 60);
    const durationMinutes = differenceInMinutes(endTime, startTime);
    const height = durationMinutes * (HOUR_HEIGHT_PX / 60);
    const pilot = pilots.find(p => p.id === booking.pilotId);
    
    const handleCancelBooking = () => {
        if (!firestore) return;
        const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', booking.id);
        updateDocumentNonBlocking(bookingRef, { status: 'Cancelled' });
        toast({ title: 'Booking Cancelled', description: 'The booking status has been updated to "Cancelled".' });
        setIsPopoverOpen(false);
    };

    const handleDeleteBooking = () => {
        if (!firestore) return;
        const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', booking.id);
        deleteDocumentNonBlocking(bookingRef);
        toast({ title: 'Booking Deleted', description: 'The booking has been permanently removed.' });
        setIsDeleteAlertOpen(false);
        setIsPopoverOpen(false);
    };

    const handleEditClick = () => {
        onEdit();
        setIsPopoverOpen(false);
    }

    return (
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                     <div
                        className={cn(
                        'absolute w-full p-2 rounded-lg text-xs leading-tight shadow-md flex flex-col justify-center text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity',
                        booking.status === 'Cancelled' ? 'bg-destructive/80' : 'bg-primary/80'
                        )}
                        style={{ top: `${top}px`, height: `${height}px` }}
                    >
                        <p className="font-semibold truncate">{booking.type}</p>
                        <p className="truncate">{pilot ? `${pilot.firstName} ${pilot.lastName}` : 'Unknown Pilot'}</p>
                        {booking.status === 'Cancelled' && <p className="font-bold uppercase text-[9px] mt-0.5">Cancelled</p>}
                    </div>
                </PopoverTrigger>
                 <PopoverContent className="w-56 p-2">
                    <div className="flex flex-col gap-2">
                         <p className="text-sm font-semibold p-2">{booking.type}</p>
                         <Button variant="outline" size="sm" onClick={handleEditClick}>
                            Edit Booking
                         </Button>
                         {booking.status !== 'Cancelled' && (
                            <Button variant="outline" size="sm" onClick={handleCancelBooking}>
                                Cancel Booking
                            </Button>
                         )}
                        <Button variant="destructive" size="sm" onClick={() => setIsDeleteAlertOpen(true)}>
                            Delete Booking
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the booking.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteBooking} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

const AircraftColumn = ({ aircraft, bookings, pilots, tenantId, onGridClick, onBookingEdit }: { aircraft?: Aircraft; bookings: Booking[]; pilots: PilotProfile[]; tenantId: string; onGridClick: (e: React.MouseEvent<HTMLDivElement>, ac: Aircraft) => void; onBookingEdit: (booking: Booking, ac: Aircraft) => void; }) => {
  return (
    <div 
        className="flex-1 relative border-r min-w-[150px]"
        onClick={(e) => aircraft && onGridClick(e, aircraft)}
    >
      {/* Hour lines for this column */}
      {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
        <div key={hour} className="border-t" style={{ height: `${HOUR_HEIGHT_PX}px` }} />
      ))}

      {/* Booking blocks */}
      {bookings.map((booking) => (
        <BookingItem 
            key={booking.id} 
            booking={booking}
            pilots={pilots}
            tenantId={tenantId}
            onEdit={() => aircraft && onBookingEdit(booking, aircraft)}
        />
      ))}
    </div>
  );
};


export default function BookingsSwimlanePage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<{ aircraft: Aircraft, startTime: Date, booking?: Booking | null } | null>(null);

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
  
  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>, ac: Aircraft) => {
    if ((e.target as HTMLElement).closest('.cursor-pointer')) {
        return;
    }

    const gridRect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - gridRect.top;
    
    const minutesFromStart = (clickY / (TOTAL_HOURS * HOUR_HEIGHT_PX)) * (TOTAL_HOURS * 60);
    
    const hour = Math.floor(minutesFromStart / 60);
    const minute = Math.floor(minutesFromStart % 60);

    const clickedTime = setMilliseconds(setSeconds(setMinutes(setHours(startOfDay(selectedDate), hour), minute), 0), 0);

    if (clickedTime < new Date()) {
        toast({
            variant: 'destructive',
            title: 'Cannot Book in the Past',
            description: 'Please select a future time slot for the booking.',
        });
        return;
    }

    setFormInitialData({ aircraft: ac, startTime: clickedTime, booking: null });
    setIsFormOpen(true);
  }, [selectedDate, toast]);
  
  const handleBookingEdit = useCallback((booking: Booking, ac: Aircraft) => {
    setFormInitialData({ aircraft: ac, startTime: booking.startTime.toDate(), booking });
    setIsFormOpen(true);
  }, []);


  const extraLanes = ['', '', '', '', '']; // Add 5 empty lanes

  return (
    <>
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
                      tenantId={tenantId}
                      onGridClick={handleGridClick}
                      onBookingEdit={handleBookingEdit}
                    />
                  ))}
                  {extraLanes.map((_, index) => (
                     <AircraftColumn
                        key={`extra-lane-${index}`}
                        bookings={[]}
                        pilots={[]}
                        tenantId={tenantId}
                        onGridClick={() => {}}
                        onBookingEdit={() => {}}
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
     {formInitialData && (
        <BookingForm
            isOpen={isFormOpen}
            onOpenChange={setIsFormOpen}
            tenantId={tenantId}
            aircraft={formInitialData.aircraft}
            pilots={pilots || []}
            initialStartTime={formInitialData.startTime}
            booking={formInitialData.booking}
        />
    )}
    </>
  );
}
