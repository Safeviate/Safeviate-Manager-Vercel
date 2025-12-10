
'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import { cn } from '@/lib/utils';
import { addHours, format, startOfDay, getMinutes, getHours, differenceInMinutes, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { BookingForm } from './booking-form';
import type { PilotProfile } from '../../users/personnel/page';
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
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface BookingItemProps {
    booking: Booking;
    aircraft: Aircraft;
    pilots: PilotProfile[];
    tenantId: string;
    onEdit: (booking: Booking, aircraft: Aircraft) => void;
}

const BookingItem = ({ booking, aircraft, pilots, tenantId, onEdit }: BookingItemProps) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const pilot = useMemo(() => pilots.find(p => p.id === booking.pilotId), [pilots, booking.pilotId]);

    const startTime = booking.startTime.toDate();
    const endTime = booking.endTime.toDate();

    const startMinutes = getHours(startTime) * 60 + getMinutes(startTime);
    const durationMinutes = differenceInMinutes(endTime, startTime);

    const totalMinutesInDay = HOURS_IN_DAY * 60;
    const totalWidth = HOURS_IN_DAY * HOUR_WIDTH_PX;

    const left = (startMinutes / totalMinutesInDay) * totalWidth;
    const width = (durationMinutes / totalMinutesInDay) * totalWidth;
    
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
        onEdit(booking, aircraft);
        setIsPopoverOpen(false);
    }

    return (
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                     <div
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-10 flex items-center justify-center rounded-lg text-primary-foreground p-2 shadow z-20 cursor-pointer hover:opacity-90 transition-opacity",
                            booking.status === 'Cancelled' ? 'bg-destructive/80' : 'bg-primary/80'
                        )}
                        style={{ left: `${left}px`, width: `${width}px` }}
                    >
                        <div className="flex flex-col text-xs text-center truncate">
                            <span className="font-bold truncate">{booking.type}</span>
                            <span className="truncate">{pilot ? `${pilot.firstName} ${pilot.lastName}` : booking.pilotId}</span>
                            {booking.status === 'Cancelled' && <span className="font-bold uppercase text-[9px] mt-0.5">Cancelled</span>}
                        </div>
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
    );
};


const HOURS_IN_DAY = 24;
const HOUR_WIDTH_PX = 80;


export function BookingCalendar({
  tenantId,
  aircraft,
  bookings,
  pilots,
  selectedDate,
}: {
  tenantId: string;
  aircraft: Aircraft[];
  bookings: Booking[];
  pilots: PilotProfile[];
  selectedDate: Date;
}) {
  const [nowLine, setNowLine] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const resourceColRef = useRef<HTMLDivElement>(null);

  // State for the booking form dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<{ aircraft: Aircraft, startTime: Date, booking?: Booking | null } | null>(null);

  const timeSlots = useMemo(() => {
    return Array.from({ length: HOURS_IN_DAY }, (_, i) => {
      const time = addHours(startOfDay(selectedDate), i);
      return format(time, 'HH:mm');
    });
  }, [selectedDate]);

  useEffect(() => {
    const calculateNowLine = () => {
        const now = new Date();
        if (startOfDay(now).getTime() === startOfDay(selectedDate).getTime()) {
            const minutes = now.getHours() * 60 + now.getMinutes();
            const position = (minutes / (HOURS_IN_DAY * 60)) * (HOURS_IN_DAY * HOUR_WIDTH_PX);
            setNowLine(position);
        } else {
            setNowLine(null);
        }
    };
    
    calculateNowLine();
    const interval = setInterval(calculateNowLine, 60000); // Update every minute
    return () => clearInterval(interval);

  }, [selectedDate]);

  const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
        timelineRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (resourceColRef.current) {
        resourceColRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };
  
  const handleResourceScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (dataRef.current) {
        dataRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };
  
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, ac: Aircraft) => {
    // Prevent opening form if clicking on an existing booking
    if ((e.target as HTMLElement).closest('.cursor-pointer')) {
        return;
    }

    const gridRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - gridRect.left;
    
    const totalWidth = HOURS_IN_DAY * HOUR_WIDTH_PX;
    const minutesFromStart = (clickX / totalWidth) * (HOURS_IN_DAY * 60);
    
    const hour = Math.floor(minutesFromStart / 60);
    const minute = Math.floor(minutesFromStart % 60);

    const clickedTime = setMilliseconds(setSeconds(setMinutes(setHours(startOfDay(selectedDate), hour), minute), 0), 0);

    setFormInitialData({ aircraft: ac, startTime: clickedTime, booking: null });
    setIsFormOpen(true);
  };

  const handleEditBooking = useCallback((booking: Booking, aircraft: Aircraft) => {
    setFormInitialData({
      aircraft,
      startTime: booking.startTime.toDate(),
      booking,
    });
    setIsFormOpen(true);
  }, []);


  return (
    <>
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex border-b bg-muted/50 flex-shrink-0">
            <div className="w-48 flex-shrink-0 p-2 border-r">
                <h3 className="font-semibold text-center">Aircraft</h3>
            </div>
            <div className="flex-grow overflow-x-hidden">
                <div ref={timelineRef} className="relative h-full overflow-hidden">
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
        <div className="flex flex-grow relative overflow-hidden">
             {/* Resources Column (Sticky) */}
             <div ref={resourceColRef} className="w-48 flex-shrink-0 border-r overflow-y-scroll bg-muted/20" onScroll={handleResourceScroll}>
                {aircraft.map((ac) => (
                    <div key={ac.id} className="flex items-center h-12 p-2 border-b">
                        <span className="font-medium">{ac.tailNumber}</span>
                    </div>
                ))}
                {aircraft.length === 0 && <div className="h-full w-full flex items-center justify-center text-muted-foreground p-4">No aircraft found.</div>}
             </div>
             
            {/* Gantt Area */}
            <div className="flex-grow overflow-auto" onScroll={handleGridScroll} ref={dataRef}>
                <div className="relative" style={{ width: `${HOURS_IN_DAY * HOUR_WIDTH_PX}px`, height: `${aircraft.length * 48}px` }}>
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex">
                        {timeSlots.map((_, index) => (
                            <div key={index} style={{ left: `${index * HOUR_WIDTH_PX}px` }} className="absolute top-0 bottom-0 w-px bg-border" />
                        ))}
                    </div>
                    {/* Aircraft Rows and Bookings */}
                    {aircraft.map((ac) => (
                        <div 
                            key={ac.id} 
                            className="relative h-12 border-b"
                            onClick={(e) => handleGridClick(e, ac)}
                        >
                            {bookings
                                .filter(b => b.aircraftId === ac.id)
                                .map(booking => (
                                    <BookingItem 
                                        key={booking.id} 
                                        booking={booking} 
                                        aircraft={ac}
                                        pilots={pilots}
                                        tenantId={tenantId}
                                        onEdit={handleEditBooking}
                                    />
                            ))}
                        </div>
                    ))}
                    {/* "Now" Line */}
                    {nowLine !== null && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30" style={{ left: `${nowLine}px` }}>
                             <div className="absolute -top-1.5 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
    {formInitialData && (
        <BookingForm
            isOpen={isFormOpen}
            onOpenChange={setIsFormOpen}
            tenantId={tenantId}
            aircraft={formInitialData.aircraft}
            pilots={pilots}
            initialStartTime={formInitialData.startTime}
            booking={formInitialData.booking}
        />
    )}
    </>
  );
}
