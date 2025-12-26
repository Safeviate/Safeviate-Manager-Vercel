
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
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
    
    const { data: allBookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);

    const isLoading = isLoadingBookings || isLoadingAircrafts;
    
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

    return { userBookings, aircraftMap, isLoading };
};

export function GeminiLogbook({ userProfile }: GeminiLogbookProps) {
    const { userBookings, aircraftMap, isLoading } = useGeminiLogbookData(userProfile);
    
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
                            <TableHead className="border w-[120px]">Booking #</TableHead>
                            <TableHead className="border w-[150px]">Date</TableHead>
                            <TableHead className="border w-[150px]">Aircraft</TableHead>
                            <TableHead className="border w-[150px]">Column 4</TableHead>
                            <TableHead className="border w-[150px]">Column 5</TableHead>
                            <TableHead className="border w-[150px]">Column 6</TableHead>
                            <TableHead className="border w-[150px]">Column 7</TableHead>
                            <TableHead className="border w-[150px]">Column 8</TableHead>
                            <TableHead className="border w-[150px]">Column 9</TableHead>
                            <TableHead className="border w-[150px]">Column 10</TableHead>
                            <TableHead className="border w-[150px]">Column 11</TableHead>
                            <TableHead className="border w-[150px]">Column 12</TableHead>
                            <TableHead className="border w-[150px]">Column 13</TableHead>
                            <TableHead className="border w-[150px]">Column 14</TableHead>
                            <TableHead className="border w-[150px]">Column 15</TableHead>
                            <TableHead className="border w-[150px]">Column 16</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {userBookings.length > 0 ? (
                            userBookings.map(booking => {
                                const aircraft = aircraftMap.get(booking.aircraftId);
                                return (
                                    <TableRow key={booking.id}>
                                        <TableCell className="border">{booking.bookingNumber}</TableCell>
                                        <TableCell className="border">{format(new Date(booking.date), 'yyyy-MM-dd')}</TableCell>
                                        <TableCell className="border">{aircraft?.tailNumber || 'N/A'}</TableCell>
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
                                <TableCell colSpan={16} className="h-24 text-center border">
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
