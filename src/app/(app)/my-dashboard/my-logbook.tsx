'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Booking } from '@/types/booking';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInMinutes, parse } from 'date-fns';
import type { Aircraft } from '@/app/(app)/assets/page';

interface MyLogbookProps {
  userProfile: PilotProfile | Personnel;
}

export function MyLogbook({ userProfile }: MyLogbookProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const tenantId = 'safeviate';

  const allBookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
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
  const privatePilotsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null),
    [firestore, tenantId]
  );

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null),
    [firestore, tenantId]
  );

  const { data: allBookings, isLoading: isLoadingBookings } = useCollection<Booking>(allBookingsQuery);
  const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);
  const { data: privatePilots, isLoading: isLoadingPrivatePilots } = useCollection<PilotProfile>(privatePilotsQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);

  const userBookings = useMemo(() => {
    if (!allBookings || !user) return [];
    return allBookings.filter(booking => 
        booking.pilotId === user.uid || 
        booking.studentId === user.uid || 
        booking.instructorId === user.uid
    ).sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
  }, [allBookings, user]);

  const usersMap = useMemo(() => {
      const map = new Map<string, string>();
      (instructors || []).forEach(p => map.set(p.id, `${p.firstName} ${p.lastName}`));
      (students || []).forEach(p => map.set(p.id, `${p.firstName} ${p.lastName}`));
      (privatePilots || []).forEach(p => map.set(p.id, `${p.firstName} ${p.lastName}`));
      return map;
  }, [instructors, students, privatePilots]);

  const aircraftMap = useMemo(() => {
    if (!aircrafts) return new Map();
    return new Map(aircrafts.map(ac => [ac.id, ac]));
  }, [aircrafts]);

  const isLoading = isLoadingBookings || isLoadingAircrafts || isLoadingInstructors || isLoadingStudents || isLoadingPrivatePilots;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Logbook</CardTitle>
        <CardDescription>A summary of your flights.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2}>Date</TableHead>
                    <TableHead colSpan={2} className="text-center border-l">Aircraft</TableHead>
                    <TableHead colSpan={3} className="text-center border-l">Pilot In Command</TableHead>
                    <TableHead colSpan={1} className="text-center border-l">Flight Details</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="border-l">Type</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead className="border-l">Student</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead className="border-l">Flight Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userBookings && userBookings.length > 0 ? (
                    userBookings.map(booking => {
                        const flightMinutes = (booking.status === 'Completed' && booking.startTime && booking.endTime) ? differenceInMinutes(
                            parse(`${booking.bookingDate} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
                            parse(`${booking.bookingDate} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
                        ) : 0;
                        const flightHours = (flightMinutes / 60).toFixed(1);

                        const aircraft = aircraftMap.get(booking.aircraftId);
                        const studentName = booking.type === 'Training Flight' ? usersMap.get(booking.studentId || '') : '';
                        const instructorName = booking.type === 'Training Flight' ? usersMap.get(booking.instructorId || '') : '';
                        
                        let picName = '';
                        if (booking.type === 'Training Flight') {
                            picName = instructorName || '';
                        } else {
                            picName = usersMap.get(booking.pilotId || '') || '';
                        }

                        return (
                            <TableRow key={booking.id}>
                                <TableCell>{format(new Date(booking.bookingDate), 'yyyy-MM-dd')}</TableCell>
                                <TableCell className="border-l">{aircraft?.model || 'N/A'}</TableCell>
                                <TableCell>{aircraft?.tailNumber || 'N/A'}</TableCell>
                                <TableCell className="border-l">{studentName || 'N/A'}</TableCell>
                                <TableCell>{instructorName || 'N/A'}</TableCell>
                                <TableCell>{picName || 'N/A'}</TableCell>
                                <TableCell className="border-l">{flightHours} hrs</TableCell>
                            </TableRow>
                        )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No flights found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
