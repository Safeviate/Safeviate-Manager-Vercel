'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return new Date(value);
    }
    return new Date(year, month - 1, day, 12);
};
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';

interface PilotLogbookProps {
    userId: string;
    tenantId: string;
    role: 'student' | 'instructor' | 'private';
}

export function PilotLogbook({ userId, tenantId, role }: PilotLogbookProps) {
    const [rawBookings, setRawBookings] = useState<Booking[]>([]);
    const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(true);
    const [isLoadingAircrafts, setIsLoadingAircrafts] = useState(true);

  useEffect(() => {
        void (async () => {
          try {
            const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
            const payload = await response.json().catch(() => ({ bookings: [], aircrafts: [] }));
            const completed = Array.isArray(payload.bookings) ? (payload.bookings as Booking[]).filter(b => b.status === 'Completed') : [];
            if (role === 'private') {
              setRawBookings(completed);
            } else {
              const field = role === 'instructor' ? 'instructorId' : 'studentId';
              setRawBookings(completed.filter(b => b[field] === userId));
            }
          } finally {
            setIsLoadingBookings(false);
          }
        })();
    }, [tenantId, userId, role]);

    useEffect(() => {
        void (async () => {
          try {
            const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
            const payload = await response.json().catch(() => ({ aircrafts: [] }));
            if (Array.isArray(payload.aircrafts)) setAircrafts(payload.aircrafts);
          } finally {
            setIsLoadingAircrafts(false);
          }
        })();
    }, [tenantId]);

    const aircraftMap = useMemo(() => {
        if (!aircrafts) return new Map();
        return new Map(aircrafts.map(a => [a.id, a.tailNumber]));
    }, [aircrafts]);

    const sortedBookings = useMemo(() => {
        if (!rawBookings) return [];
        const relevantBookings = role === 'private'
            ? rawBookings.filter(booking => booking.createdById === userId || booking.studentId === userId)
            : rawBookings;
        // Sort by date descending (latest first)
        return [...relevantBookings].sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            return dateB.localeCompare(dateA);
        });
    }, [rawBookings, role, userId]);

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
                                            {booking.date ? format(parseLocalDate(booking.date), 'dd MMM yyyy') : 'N/A'}
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
