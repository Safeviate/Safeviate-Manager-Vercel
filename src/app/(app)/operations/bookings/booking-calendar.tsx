
'use client';

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import { cn } from '@/lib/utils';
import { addHours, format, startOfDay, getMinutes, getHours, differenceInMinutes } from 'date-fns';
import type { PilotProfile } from '../../users/personnel/page';

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
                booking.status === 'Cancelled' ? 'bg-destructive' : 'bg-primary'
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


const HOURS_IN_DAY = 24;
const HOUR_WIDTH_PX = 80;

export interface BookingCalendarRef {
    scrollToNow: () => void;
}

interface BookingCalendarProps {
  aircraft: Aircraft[];
  bookings: Booking[];
  pilots: PilotProfile[];
  selectedDate: Date;
  onSlotClick: (aircraft: Aircraft, time: string, booking?: Booking) => void;
}

export const BookingCalendar = forwardRef<BookingCalendarRef, BookingCalendarProps>(({
  aircraft,
  bookings,
  pilots,
  selectedDate,
  onSlotClick,
}, ref) => {
  const [nowLine, setNowLine] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const resourceColRef = useRef<HTMLDivElement>(null);

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

  useImperativeHandle(ref, () => ({
    scrollToNow: () => {
        if (nowLine !== null && dataRef.current) {
            dataRef.current.scrollTo({
                left: nowLine - dataRef.current.offsetWidth / 2,
                behavior: 'smooth',
            });
        }
    }
  }));

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
                    <div key={ac.id} className="flex items-center h-10 p-2 border-b">
                        <span className="font-medium">{ac.tailNumber}</span>
                    </div>
                ))}
                {aircraft.length === 0 && <div className="h-full w-full flex items-center justify-center text-muted-foreground p-4">No aircraft found.</div>}
             </div>
             
            {/* Gantt Area */}
            <div className="flex-grow overflow-auto" onScroll={handleGridScroll} ref={dataRef}>
                <div className="relative" style={{ width: `${HOURS_IN_DAY * HOUR_WIDTH_PX}px`, height: `${aircraft.length * 40}px` }}>
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex">
                        {timeSlots.map((_, index) => (
                            <div key={index} style={{ left: `${index * HOUR_WIDTH_PX}px` }} className="absolute top-0 bottom-0 w-px bg-border" />
                        ))}
                    </div>
                    {/* Aircraft Rows and Bookings */}
                    {aircraft.map((ac, index) => (
                        <div 
                            key={ac.id} 
                            className="relative h-10 border-b"
                            style={{ top: `${index * 40}px` }}
                        >
                            {bookings
                                .filter(b => b.aircraftId === ac.id)
                                .map(booking => (
                                    <BookingItem 
                                        key={booking.id} 
                                        booking={booking} 
                                        pilots={pilots}
                                        onClick={() => onSlotClick(ac, format(booking.startTime.toDate(), 'HH:mm'), booking)}
                                    />
                            ))}
                        </div>
                    ))}
                    {/* "Past" Shadow */}
                    {nowLine !== null && (
                        <div
                            className="absolute top-0 bottom-0 left-0 bg-destructive/20 z-10 pointer-events-none"
                            style={{ width: `${nowLine}px` }}
                        />
                    )}
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
    </>
  );
});

BookingCalendar.displayName = "BookingCalendar";
