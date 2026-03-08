'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';

interface PilotLogbookProps {
    userId: string;
    tenantId: string;
    role: 'student' | 'instructor' | 'private';
}

export function PilotLogbook({ userId, tenantId, role }: PilotLogbookProps) {
    const firestore = useFirestore();

    const bookingsQuery = useMemoFirebase(
        () => {
            if (!firestore) return null;
            // For instructors, we query by instructorId. For others, studentId.
            const field = role === 'instructor' ? 'instructorId' : 'studentId';
            return query(
                collection(firestore, `tenants/${tenantId}/bookings`),
                where(field, '==', userId),
                where('status', '==', 'Completed')
            );
        },
        [firestore, tenantId, userId, role]
    );

    const aircraftQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null),
        [firestore, tenantId]
    );

    const { data: rawBookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);

    const aircraftMap = useMemo(() => {
        if (!aircrafts) return new Map();
        return new Map(aircrafts.map(a => [a.id, a.tailNumber]));
    }, [aircrafts]);

    const sortedBookings = useMemo(() => {
        if (!rawBookings) return [];
        // Sort by date descending (latest first)
        return [...rawBookings].sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            return dateB.localeCompare(dateA);
        });
    }, [rawBookings]);

    if (isLoadingBookings || isLoadingAircrafts) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Flight Logbook</CardTitle>
                <CardDescription>
                    {role === 'instructor' 
                        ? 'Chronological record of all flights conducted as the primary instructor.' 
                        : 'Chronological record of all completed training and rental flights.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Aircraft</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Start Hobbs</TableHead>
                            <TableHead className="text-right">End Hobbs</TableHead>
                            <TableHead className="text-right">Flight Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedBookings.length > 0 ? (
                            sortedBookings.map(booking => {
                                const start = booking.preFlightData?.hobbs || 0;
                                const end = booking.postFlightData?.hobbs || 0;
                                const total = end - start;
                                return (
                                    <TableRow key={booking.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {booking.date ? format(new Date(booking.date), 'dd MMM yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="font-mono font-bold">
                                            {aircraftMap.get(booking.aircraftId) || booking.aircraftId}
                                        </TableCell>
                                        <TableCell>{booking.type}</TableCell>
                                        <TableCell className="text-right font-mono">{start.toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-mono">{end.toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-bold font-mono">
                                            {total > 0 ? total.toFixed(1) : '0.0'}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No completed flights found in the logbook for this user.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
