
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

interface GeminiLogbookProps {
  userProfile: PilotProfile | Personnel;
}

const useGeminiLogbookData = (userProfile: PilotProfile | Personnel) => {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const bookingsQuery = useMemoFirebase(
      () => (firestore ? query(
        collection(firestore, `tenants/${tenantId}/bookings`),
        where('status', '==', 'Completed')
      ) : null),
      [firestore, tenantId]
    );

    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );

    const personnelQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);
    const privatePilotsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null), [firestore, tenantId]);

    const { data: allBookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);
    const { data: privatePilots, isLoading: isLoadingPrivatePilots } = useCollection<PilotProfile>(privatePilotsQuery);


    const isLoading = isLoadingBookings || isLoadingAircrafts || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents || isLoadingPrivatePilots;
    
    const allUsersMap = useMemo(() => {
        const userMap = new Map<string, PilotProfile | Personnel>();
        const allUserLists = [personnel, instructors, students, privatePilots];
        allUserLists.forEach(list => {
            if (list) {
                list.forEach(p => userMap.set(p.id, p));
            }
        });
        return userMap;
    }, [personnel, instructors, students, privatePilots]);
    
    const aircraftMap = useMemo(() => {
        if (!aircrafts) return new Map();
        return new Map(aircrafts.map(ac => [ac.id, ac]));
    }, [aircrafts]);

    const userBookings = useMemo(() => {
        if (!allBookings || !userProfile?.id) return [];
        return allBookings
            .filter(booking => 
                booking.instructorId === userProfile.id ||
                (booking.studentId && booking.studentId === userProfile.id) ||
                booking.createdById === userProfile.id
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allBookings, userProfile]);

    return { userBookings, aircraftMap, allUsersMap, isLoading };
};

export function GeminiLogbook({ userProfile }: GeminiLogbookProps) {
    const { userBookings, aircraftMap, allUsersMap, isLoading } = useGeminiLogbookData(userProfile);
    
    if (isLoading) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gemini's Simple Logbook</CardTitle>
                <CardDescription>A basic, working record of your completed flights.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table className="border">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="border w-[120px]" rowSpan={2}>Booking #</TableHead>
                            <TableHead className="border w-[150px]" rowSpan={2}>Date</TableHead>
                            <TableHead className="border w-[300px]" colSpan={2}>Aircraft</TableHead>
                            <TableHead className="border w-[150px]" rowSpan={2}>Pilot In Command</TableHead>
                            <TableHead className="border" rowSpan={2}>Flight Details</TableHead>
                            <TableHead className="border" colSpan={2}>Single Engine Day</TableHead>
                            <TableHead className="border" colSpan={2}>Single Engine Night</TableHead>
                            <TableHead className="border" colSpan={3}>Multi Engine Day</TableHead>
                            <TableHead className="border" colSpan={3}>Multi Engine Night</TableHead>
                            <TableHead className="border" colSpan={3}>Instrument Flying</TableHead>
                            <TableHead className="border" colSpan={2}>Flying As Instructor</TableHead>
                        </TableRow>
                         <TableRow>
                            <TableHead className="border h-10">Type</TableHead>
                            <TableHead className="border h-10">Registration</TableHead>
                            <TableHead className="border h-10">Dual</TableHead>
                            <TableHead className="border h-10">PIC</TableHead>
                            <TableHead className="border h-10">Dual</TableHead>
                            <TableHead className="border h-10">PIC</TableHead>
                            <TableHead className="border h-10">Dual</TableHead>
                            <TableHead className="border h-10">PIC</TableHead>
                            <TableHead className="border h-10">Co Pilot</TableHead>
                            <TableHead className="border h-10">Dual</TableHead>
                            <TableHead className="border h-10">PIC</TableHead>
                            <TableHead className="border h-10">Co Pilot</TableHead>
                            <TableHead className="border h-10">Nave Aids</TableHead>
                            <TableHead className="border h-10">Place</TableHead>
                            <TableHead className="border h-10">Time</TableHead>
                            <TableHead className="border h-10">Day</TableHead>
                            <TableHead className="border h-10">Night</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {userBookings.length > 0 ? (
                            userBookings.map(booking => {
                                const aircraft = aircraftMap.get(booking.aircraftId);
                                const creator = booking.createdById ? allUsersMap.get(booking.createdById) : null;
                                const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'N/A';
                                const flightMinutes = (booking.status === 'Completed' && booking.startTime && booking.endTime) ? differenceInMinutes(
                                    parse(`${booking.date} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
                                    parse(`${booking.date} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
                                ) : 0;
                                const flightHours = (flightMinutes / 60).toFixed(1);
                                
                                return (
                                    <TableRow key={booking.id}>
                                        <TableCell className="border">{booking.bookingNumber}</TableCell>
                                        <TableCell className="border">{format(new Date(booking.date), 'yyyy-MM-dd')}</TableCell>
                                        <TableCell className="border">{aircraft?.model || 'N/A'}</TableCell>
                                        <TableCell className="border">{aircraft?.tailNumber || 'N/A'}</TableCell>
                                        <TableCell className="border">{creatorName}</TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                        <TableCell className="border"></TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={20} className="h-24 text-center border">
                                    No completed flights found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
