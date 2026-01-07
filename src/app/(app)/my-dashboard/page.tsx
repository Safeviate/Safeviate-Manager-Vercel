'use client';

import { useMemo } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { TableTemplate } from '@/app/(app)/development/table-builder/page';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { DynamicLogbook } from './dynamic-logbook';
import { differenceInMinutes } from 'date-fns';

type UserProfile = PilotProfile | Personnel;
type PublishedTable = Omit<TableTemplate, 'id' | 'name'> & { pageId: string };
type EnrichedBooking = Booking & {
  aircraft?: Aircraft;
  picName?: string;
  studentName?: string;
  instructorName?: string,
  flightTimeHours?: string;
};


export default function MyDashboardPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const publishedTableRef = useMemoFirebase(
        () => (firestore ? doc(firestore, `tenants/${tenantId}/published-tables`, 'my-dashboard') : null),
        [firestore, tenantId]
    );

    const bookingsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null), [firestore, tenantId]);
    const aircraftsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);

    const { data: publishedTable, isLoading: isLoadingTable } = useDoc<PublishedTable>(publishedTableRef);
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);

    const allUsers: UserProfile[] = useMemo(() => [
        ...(personnel || []),
        ...(instructors || []),
        ...(students || []),
    ], [personnel, instructors, students]);

    const enrichedBookings: EnrichedBooking[] = useMemo(() => {
        if (!bookings || !aircrafts || allUsers.length === 0) return [];
        const aircraftMap = new Map(aircrafts.map(a => [a.id, a]));
        const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

        return bookings.map(booking => {
            const flightTimeMinutes = booking.startTime && booking.endTime 
                ? differenceInMinutes(new Date(`1970-01-01T${booking.endTime}`), new Date(`1970-01-01T${booking.startTime}`))
                : 0;
            const flightTimeHours = (flightTimeMinutes / 60).toFixed(1);

            return {
                ...booking,
                aircraft: aircraftMap.get(booking.aircraftId),
                picName: userMap.get(booking.instructorId || booking.privatePilotId || ''),
                studentName: userMap.get(booking.studentId || ''),
                instructorName: userMap.get(booking.instructorId || ''),
                flightTimeHours,
            };
        });
    }, [bookings, aircrafts, allUsers]);

    const isLoading = isLoadingTable || isLoadingBookings || isLoadingAircrafts || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents;

    return (
        <div className="w-full space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>My Logbook</CardTitle>
                    <CardDescription>A dynamic view of your recent flight activities.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-48 w-full" />
                    ) : publishedTable?.tableData ? (
                        <DynamicLogbook templateData={publishedTable.tableData} bookings={enrichedBookings} />
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground mb-4">No logbook template has been published to this page.</p>
                            <Button asChild>
                                <Link href="/development/table-builder">Go to Table Builder</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
