'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format, differenceInMinutes, parse } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { Booking } from '@/types/booking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MyLogbookProps {
  userProfile: PilotProfile | Personnel;
}

const useLogbookData = (userProfile: PilotProfile | Personnel) => {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const bookingsQuery = useMemoFirebase(
      () => (firestore && userProfile?.id ? query(
        collection(firestore, `tenants/${tenantId}/bookings`),
        where('status', '==', 'Completed')
      ) : null),
      [firestore, tenantId, userProfile?.id]
    );

    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );
    
    // Correctly query all pilot-related collections
    const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
    const privatePilotsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/private-pilots`) : null), [firestore, tenantId]);


    const { data: allBookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
    
    // Fetch all user types
    const { data: students } = useCollection<PilotProfile>(studentsQuery);
    const { data: instructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: privatePilots } = useCollection<PilotProfile>(privatePilotsQuery);
    
    const isLoading = isLoadingBookings || isLoadingAircrafts || !students || !instructors || !privatePilots;
    
    const allUsersMap = useMemo(() => {
        const userMap = new Map<string, PilotProfile | Personnel>();
        [...(students || []), ...(instructors || []), ...(privatePilots || [])].forEach(p => {
            if (p) userMap.set(p.id, p);
        });
        return userMap;
    }, [students, instructors, privatePilots]);

    const aircraftMap = useMemo(() => {
        if (!aircrafts) return new Map();
        return new Map(aircrafts.map(ac => [ac.id, ac]));
    }, [aircrafts]);

    const userBookings = useMemo(() => {
        if (!allBookings || !userProfile?.id) return [];
        return allBookings
            .filter(booking => 
                booking.pilotId === userProfile.id ||
                booking.instructorId === userProfile.id ||
                booking.studentId === userProfile.id
            )
            .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
    }, [allBookings, userProfile]);

    return { userBookings, aircraftMap, allUsersMap, isLoading };
};

const getCellDataForBooking = (booking: Booking, columnId: string, aircraftMap: Map<string, Aircraft>, allUsersMap: Map<string, PilotProfile | Personnel>): string => {
    const aircraft = aircraftMap.get(booking.aircraftId);
    
    const flightMinutes = (booking.status === 'Completed' && booking.startTime && booking.endTime) ? differenceInMinutes(
        parse(`${booking.bookingDate} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
        parse(`${booking.bookingDate} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
    ) : 0;
    const flightHours = (flightMinutes / 60).toFixed(1);

    const student = booking.studentId ? allUsersMap.get(booking.studentId) : null;
    const instructor = booking.instructorId ? allUsersMap.get(booking.instructorId) : null;
    const pilot = booking.pilotId ? allUsersMap.get(booking.pilotId) : null;
    
    let picName = '';
    if (booking.type === 'Training Flight') {
        picName = instructor ? `${instructor.firstName} ${instructor.lastName}` : '';
    } else {
        picName = pilot ? `${pilot.firstName} ${pilot.lastName}` : '';
    }

    switch(columnId) {
        case 'date': return format(new Date(booking.bookingDate), 'yyyy-MM-dd');
        case 'type': return aircraft?.model || 'N/A';
        case 'registration': return aircraft?.tailNumber || 'N/A';
        case 'student': return student ? `${student.firstName} ${student.lastName}` : '---';
        case 'instructor': return instructor ? `${instructor.firstName} ${instructor.lastName}` : '---';
        case 'pic': return picName;
        case 'flightTime': return `${flightHours}h`;
        default: return '';
    }
};

export function MyLogbook({ userProfile }: MyLogbookProps) {
    const { userBookings, aircraftMap, allUsersMap, isLoading } = useLogbookData(userProfile);

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Logbook</CardTitle>
                <CardDescription>A record of your completed flights.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead rowSpan={2} className="text-center align-middle border-r">Date</TableHead>
                                <TableHead colSpan={2} className="text-center border-r">Aircraft</TableHead>
                                <TableHead colSpan={3} className="text-center border-r">Pilot In Command</TableHead>
                                <TableHead colSpan={1} className="text-center">Flight Details</TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead className="text-center border-r">Type</TableHead>
                                <TableHead className="text-center border-r">Registration</TableHead>
                                <TableHead className="text-center border-r">Student</TableHead>
                                <TableHead className="text-center border-r">Instructor</TableHead>
                                <TableHead className="text-center border-r">PIC</TableHead>
                                <TableHead className="text-center">Flight Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {userBookings.length > 0 ? (
                                userBookings.map(booking => (
                                    <TableRow key={booking.id}>
                                        <TableCell className="text-center border-r">{getCellDataForBooking(booking, 'date', aircraftMap, allUsersMap)}</TableCell>
                                        <TableCell className="text-center border-r">{getCellDataForBooking(booking, 'type', aircraftMap, allUsersMap)}</TableCell>
                                        <TableCell className="text-center border-r">{getCellDataForBooking(booking, 'registration', aircraftMap, allUsersMap)}</TableCell>
                                        <TableCell className="text-center border-r">{getCellDataForBooking(booking, 'student', aircraftMap, allUsersMap)}</TableCell>
                                        <TableCell className="text-center border-r">{getCellDataForBooking(booking, 'instructor', aircraftMap, allUsersMap)}</TableCell>
                                        <TableCell className="text-center border-r">{getCellDataForBooking(booking, 'pic', aircraftMap, allUsersMap)}</TableCell>
                                        <TableCell className="text-center">{getCellDataForBooking(booking, 'flightTime', aircraftMap, allUsersMap)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No completed flights found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
