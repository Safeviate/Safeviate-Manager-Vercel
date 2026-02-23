'use client';

import { useState, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';

function BookingList({ bookings, aircrafts, users, selectedDate }: { bookings: Booking[], aircrafts: Map<string, Aircraft>, users: Map<string, PilotProfile>, selectedDate: Date }) {
    
    const dayBookings = bookings.filter(b => isSameDay(new Date(b.start), selectedDate));

    if (dayBookings.length === 0) {
        return <div className="text-center text-muted-foreground p-8">No bookings for this day.</div>
    }

    // Group by aircraft
    const bookingsByAircraft = dayBookings.reduce((acc, booking) => {
        const resourceId = booking.resourceId;
        if (!acc[resourceId]) {
            acc[resourceId] = [];
        }
        acc[resourceId].push(booking);
        return acc;
    }, {} as Record<string, Booking[]>);


    return (
        <div className="space-y-6">
            {Object.entries(bookingsByAircraft).map(([aircraftId, aircraftBookings]) => {
                const aircraft = aircrafts.get(aircraftId);
                return (
                    <div key={aircraftId}>
                        <h3 className="font-semibold text-lg mb-2">{aircraft?.tailNumber || 'Unknown Aircraft'}</h3>
                        <div className="space-y-2">
                            {aircraftBookings.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(booking => {
                                const instructor = users.get(booking.instructorId || '');
                                const student = users.get(booking.studentId || '');
                                return (
                                    <Link href={`/operations/bookings/${booking.id}`} key={booking.id}>
                                        <Card className="hover:bg-muted/50 transition-colors">
                                            <CardContent className="p-4 flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">{booking.title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {format(new Date(booking.start), 'HH:mm')} - {format(new Date(booking.end), 'HH:mm')}
                                                    </p>
                                                     <p className="text-sm text-muted-foreground">
                                                        Instructor: {instructor ? `${instructor.firstName} ${instructor.lastName}`: 'N/A'}
                                                     </p>
                                                      <p className="text-sm text-muted-foreground">
                                                        Student: {student ? `${student.firstName} ${student.lastName}`: 'N/A'}
                                                     </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )

}

export default function BookingsPage() {
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const { hasPermission } = usePermissions();
    const canManageBookings = hasPermission('operations-bookings-manage');

    const bookingsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null,
        [firestore, tenantId]
    );

    const aircraftsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null,
        [firestore, tenantId]
    );
    const instructorsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null),
        [firestore, tenantId]
    );
    const studentsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null),
        [firestore, tenantId]
    );

    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);

    const aircraftsMap = useMemo(() => {
        if (!aircrafts) return new Map();
        return new Map(aircrafts.map(a => [a.id, a]));
    }, [aircrafts]);

    const usersMap = useMemo(() => {
        if (!instructors || !students) return new Map();
        const combined = [...instructors, ...students];
        return new Map(combined.map(u => [u.id, u]));
    }, [instructors, students]);
    
    const isLoading = isLoadingBookings || isLoadingAircrafts || isLoadingInstructors || isLoadingStudents;

    const bookingsByDay = useMemo(() => {
        if (!bookings) return {};
        return bookings.reduce((acc, booking) => {
            const day = format(new Date(booking.start), 'yyyy-MM-dd');
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(booking);
            return acc;
        }, {} as Record<string, Booking[]>);
    }, [bookings]);


    return (
        <div className="flex flex-col gap-6 h-full">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Booking Schedule</h1>
                    <p className="text-muted-foreground">
                        View and manage all aircraft bookings.
                    </p>
                </div>
                {canManageBookings && (
                    <Button asChild>
                        <Link href="/operations/bookings/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Booking
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Calendar</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                         <CustomCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                     <CardHeader>
                        <CardTitle>Bookings for {format(selectedDate, 'PPP')}</CardTitle>
                     </CardHeader>
                     <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : (
                            <BookingList
                                bookings={bookings || []}
                                aircrafts={aircraftsMap}
                                users={usersMap}
                                selectedDate={selectedDate}
                            />
                        )}
                     </CardContent>
                </Card>
            </div>
        </div>
    )
}
