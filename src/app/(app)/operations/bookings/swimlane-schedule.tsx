'use client';

import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format, startOfDay, differenceInMinutes } from 'date-fns';

interface SwimlaneScheduleProps {
    aircrafts: Aircraft[];
    bookings: Booking[];
}

export function SwimlaneSchedule({ aircrafts, bookings }: SwimlaneScheduleProps) {
    const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));

    const handlePrevDay = () => setCurrentDate(prev => addDays(prev, -1));
    const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));

    const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23
    const dayStart = startOfDay(currentDate);

    const filteredBookings = bookings.filter(b => {
        const bookingStart = new Date(b.start);
        return startOfDay(bookingStart).getTime() === dayStart.getTime();
    });

    return (
        <div className="flex flex-col h-[75vh] bg-card rounded-lg border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevDay}><ChevronLeft /></Button>
                    <h2 className="text-xl font-semibold">{format(currentDate, 'PPP')}</h2>
                    <Button variant="outline" size="icon" onClick={handleNextDay}><ChevronRight /></Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="relative grid grid-cols-[60px_1fr]">
                    {/* Time Axis */}
                    <div className="sticky left-0 bg-card z-20">
                        {hours.map(hour => (
                            <div key={hour} className="h-20 text-xs text-right pr-2 pt-1 border-t text-muted-foreground">
                                {format(new Date(0, 0, 0, hour), 'ha')}
                            </div>
                        ))}
                    </div>

                    {/* Schedule Grid */}
                    <div className="relative grid" style={{ gridTemplateColumns: `repeat(${aircrafts.length}, minmax(150px, 1fr))` }}>
                        {/* Headers */}
                        {aircrafts.map(ac => (
                            <div key={ac.id} className="sticky top-0 p-2 text-center font-semibold border-b border-l bg-swimlane-header text-swimlane-header-foreground z-10">
                                {ac.tailNumber}
                            </div>
                        ))}

                        {/* Grid lines and bookings */}
                        {aircrafts.map((ac, acIndex) => (
                            <div key={ac.id} className="relative border-l" style={{ gridColumn: acIndex + 1 }}>
                                {hours.map(hour => (
                                    <div key={hour} className="h-20 border-t"></div>
                                ))}

                                {/* Render bookings for this aircraft */}
                                {filteredBookings.filter(b => b.resourceId === ac.id).map(booking => {
                                    const bookingStart = new Date(booking.start);
                                    const bookingEnd = new Date(booking.end);

                                    const top = (bookingStart.getHours() + bookingStart.getMinutes() / 60) * 80; // 80px per hour (h-20)
                                    const height = differenceInMinutes(bookingEnd, bookingStart) / 60 * 80;

                                    return (
                                        <div 
                                            key={booking.id}
                                            className="absolute w-[calc(100%-8px)] left-[4px] p-2 rounded-lg bg-blue-500 text-white shadow-lg overflow-hidden"
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                        >
                                            <p className="font-bold text-sm truncate">{booking.title}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
