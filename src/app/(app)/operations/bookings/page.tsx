'use client';

import { useState, useMemo } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { format, startOfDay, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

import type { Booking } from '@/types/booking';
import { Badge } from '@/components/ui/badge';

export default function BookingsPage() {
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const bookingsQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      // Fetch all bookings for now, filter on client.
      // For production, this should be paginated or filtered by a date range on the server.
      return query(collection(firestore, `tenants/${tenantId}/bookings`));
    },
    [firestore, tenantId]
  );
  const { data: allBookings, isLoading, error } = useCollection<Booking>(bookingsQuery);

  const bookingsForSelectedDay = useMemo(() => {
    if (!allBookings) return [];
    return allBookings
      .filter(booking => {
          try {
            const bookingDate = new Date(booking.start);
            return isSameDay(bookingDate, selectedDate);
          } catch (e) {
            console.error("Invalid booking date:", booking.start);
            return false;
          }
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [allBookings, selectedDate]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Schedule</h1>
          <p className="text-muted-foreground">
            Select a date to view and manage bookings.
          </p>
        </div>
        <Button asChild>
          <Link href="/operations/bookings/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Booking
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 flex justify-center">
            <CustomCalendar 
                selectedDate={selectedDate}
                onDateSelect={(date) => date && setSelectedDate(startOfDay(date))}
            />
        </div>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Bookings for {format(selectedDate, 'PPP')}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && <Skeleton className="h-48 w-full" />}
                {error && <p className="text-destructive text-center">Error loading bookings.</p>}
                {!isLoading && !error && (
                    <div className="space-y-4">
                        {bookingsForSelectedDay.length > 0 ? (
                            bookingsForSelectedDay.map(booking => (
                                <Link key={booking.id} href={`/operations/bookings/${booking.id}`} className="block">
                                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                      <div className="flex justify-between items-center">
                                          <p className="font-semibold">{booking.title}</p>
                                          <Badge variant="secondary">{booking.status}</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                          {format(new Date(booking.start), 'p')} - {format(new Date(booking.end), 'p')}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                          Resource: {booking.resourceId}
                                      </p>
                                  </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-10">No bookings for this date.</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
