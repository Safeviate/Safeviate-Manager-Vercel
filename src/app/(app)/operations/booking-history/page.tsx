'use client';

import React, { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, BookOpenCheck, BarChart, FilePlus } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';

type UserProfile = PilotProfile | Personnel;

type EnrichedBooking = Booking & {
    aircraftTailNumber?: string;
    instructorName?: string;
    studentName?: string;
    createdByName?: string;
};

const getStatusBadgeVariant = (status: Booking['status']) => {
    switch (status) {
        case 'Completed': return 'default';
        case 'Confirmed': return 'secondary';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
};

const BookingsTable = ({ bookings }: { bookings: EnrichedBooking[] }) => {
    if (bookings.length === 0) {
        return <p className="text-center text-muted-foreground py-16">No bookings in this category.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Aircraft</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {bookings.map(booking => (
                    <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                        <TableCell>{format(new Date(booking.date), 'PPP')}</TableCell>
                        <TableCell>{booking.aircraftTailNumber || booking.aircraftId}</TableCell>
                        <TableCell>{booking.type}</TableCell>
                        <TableCell>{booking.instructorName || 'N/A'}</TableCell>
                        <TableCell>{booking.studentName || 'N/A'}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/operations/bookings/${booking.id}`}><Eye className="mr-2 h-4 w-4" />View</Link>
                                </Button>
                                {booking.type === 'Training' && booking.status === 'Completed' && (
                                    <Button asChild variant="secondary" size="sm">
                                        <Link href={`/training/debrief/new?bookingId=${booking.id}`}><FilePlus className="mr-2 h-4 w-4" />File Debrief</Link>
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" disabled>
                                    <BarChart className="mr-2 h-4 w-4" />M&B
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default function BookingHistoryPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    // --- Data Queries ---
    const bookingsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`), orderBy('date', 'desc')) : null), [firestore]);
    const aircraftQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null), [firestore]);
    const personnelQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore]);
    const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore]);
    const privatePilotsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null), [firestore]);
    
    // --- Data Hooks ---
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);
    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);
    const { data: privatePilots, isLoading: isLoadingPrivatePilots } = useCollection<PilotProfile>(privatePilotsQuery);

    const isLoading = isLoadingBookings || isLoadingAircrafts || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents || isLoadingPrivatePilots;
    
    // --- Data Enrichment ---
    const allUsers: UserProfile[] = useMemo(() => [
        ...(personnel || []),
        ...(instructors || []),
        ...(students || []),
        ...(privatePilots || []),
    ], [personnel, instructors, students, privatePilots]);
    
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`])), [allUsers]);
    const aircraftMap = useMemo(() => new Map((aircrafts || []).map(a => [a.id, a.tailNumber])), [aircrafts]);

    const enrichedBookings: EnrichedBooking[] = useMemo(() => {
        if (!bookings) return [];
        return bookings.map(b => ({
            ...b,
            aircraftTailNumber: aircraftMap.get(b.aircraftId),
            instructorName: b.instructorId ? userMap.get(b.instructorId) : undefined,
            studentName: b.studentId ? userMap.get(b.studentId) : undefined,
        }));
    }, [bookings, userMap, aircraftMap]);
    
    const trainingBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Training'), [enrichedBookings]);
    const privateBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Private' || b.type === 'Rental'), [enrichedBookings]);
    const maintenanceBookings = useMemo(() => enrichedBookings.filter(b => b.type === 'Maintenance'), [enrichedBookings]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Booking History</h1>
            <Card>
                <Tabs defaultValue="all">
                    <CardHeader>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">All Bookings</TabsTrigger>
                            <TabsTrigger value="training">Training</TabsTrigger>
                            <TabsTrigger value="private">Private</TabsTrigger>
                            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : (
                            <>
                                <TabsContent value="all"><BookingsTable bookings={enrichedBookings} /></TabsContent>
                                <TabsContent value="training"><BookingsTable bookings={trainingBookings} /></TabsContent>
                                <TabsContent value="private"><BookingsTable bookings={privateBookings} /></TabsContent>
                                <TabsContent value="maintenance"><BookingsTable bookings={maintenanceBookings} /></TabsContent>
                            </>
                        )}
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}