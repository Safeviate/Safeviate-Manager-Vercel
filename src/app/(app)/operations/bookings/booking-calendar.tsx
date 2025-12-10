'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import { cn } from '@/lib/utils';
import { addHours, format, startOfDay } from 'date-fns';

interface BookingCalendarProps {
  aircraft: Aircraft[];
  bookings: Booking[];
  selectedDate: Date;
}

const HOURS_IN_DAY = 24;
const HOUR_WIDTH_PX = 80;

export function BookingCalendar({
  aircraft,
  bookings,
  selectedDate,
}: BookingCalendarProps) {
  const [nowLine, setNowLine] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);


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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
        timelineRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  
  const handleResourceScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (dataRef.current) {
        dataRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex border-b">
            <div className="w-48 flex-shrink-0 p-2 border-r bg-muted/50">
                <h3 className="font-semibold text-center">Aircraft</h3>
            </div>
            <div className="flex-grow overflow-hidden">
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
        <div className="flex flex-grow overflow-hidden">
             {/* Resources Column (Sticky) */}
             <div className="w-48 flex-shrink-0 border-r overflow-y-auto" onScroll={handleResourceScroll}>
                {aircraft.map((ac) => (
                    <div key={ac.id} className="flex items-center h-16 p-2 border-b">
                        <span className="font-medium">{ac.tailNumber}</span>
                    </div>
                ))}
             </div>
             
            {/* Gantt Area */}
            <div className="flex-grow overflow-auto" onScroll={handleScroll} ref={dataRef}>
                <div className="relative" style={{ width: `${HOURS_IN_DAY * HOUR_WIDTH_PX}px` }}>
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex">
                        {timeSlots.map((_, index) => (
                            <div key={index} style={{ left: `${index * HOUR_WIDTH_PX}px` }} className="absolute top-0 bottom-0 w-px bg-border" />
                        ))}
                    </div>
                    {/* Aircraft Rows */}
                    {aircraft.map((ac) => (
                        <div key={ac.id} className="relative h-16 border-b">
                            {/* Booking items would go here */}
                        </div>
                    ))}
                    {/* "Now" Line */}
                    {nowLine !== null && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${nowLine}px` }}>
                             <div className="absolute -top-1.5 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}