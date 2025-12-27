
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { FilePlus } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { StudentProgressReport } from '@/types/training';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '../page';

interface TrainingRecordsProps {
    studentId: string;
    tenantId: string;
}

const getRatingColor = (rating: number) => {
    switch (rating) {
        case 1: return 'bg-red-500';
        case 2: return 'bg-orange-500';
        case 3: return 'bg-yellow-500 text-black';
        case 4: return 'bg-green-500';
        default: return 'bg-gray-400';
    }
}

export function TrainingRecords({ studentId, tenantId }: TrainingRecordsProps) {
    const firestore = useFirestore();

    const progressReportsQuery = useMemoFirebase(
        () => (firestore ? query(
            collection(firestore, `tenants/${tenantId}/student-progress-reports`),
            where('studentId', '==', studentId)
        ) : null),
        [firestore, tenantId, studentId]
    );

    const bookingsQuery = useMemoFirebase(
        () => (firestore ? query(
            collection(firestore, `tenants/${tenantId}/bookings`),
            where('studentId', '==', studentId),
            where('type', '==', 'Training Flight')
        ) : null),
        [firestore, tenantId, studentId]
    );

    const instructorsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null),
        [firestore, tenantId]
    );

    const { data: reports, isLoading: isLoadingReports } = useCollection<StudentProgressReport>(progressReportsQuery);
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);

    const isLoading = isLoadingReports || isLoadingBookings || isLoadingInstructors;

    const instructorsMap = useMemo(() => {
        if (!instructors) return new Map();
        return new Map(instructors.map(i => [i.id, `${i.firstName} ${i.lastName}`]));
    }, [instructors]);

    const bookingsWithoutReports = useMemo(() => {
        if (!bookings || !reports) return [];
        const reportBookingIds = new Set(reports.map(r => r.bookingId));
        return bookings.filter(b => b.status === 'Completed' && !reportBookingIds.has(b.id));
    }, [bookings, reports]);

    if (isLoading) {
        return <p>Loading training records...</p>;
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Debriefs Needed</CardTitle>
                    <CardDescription>Completed training flights awaiting an instructor debrief.</CardDescription>
                </CardHeader>
                <CardContent>
                    {bookingsWithoutReports.length > 0 ? (
                        <ul className="space-y-2">
                           {bookingsWithoutReports.map(booking => (
                               <li key={booking.id} className="flex justify-between items-center p-3 border rounded-lg">
                                   <div>
                                       <p className="font-medium">Booking #{booking.bookingNumber} - {format(new Date(booking.date), 'PPP')}</p>
                                       <p className="text-sm text-muted-foreground">Instructor: {instructorsMap.get(booking.instructorId || '') || 'N/A'}</p>
                                   </div>
                                   <Button size="sm">
                                        <FilePlus className="mr-2 h-4 w-4" />
                                        Create Debrief
                                   </Button>
                               </li>
                           ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground p-4">No pending debriefs.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Training History</CardTitle>
                    <CardDescription>A log of all completed instructor debriefs.</CardDescription>
                </CardHeader>
                <CardContent>
                    {reports && reports.length > 0 ? (
                         <Accordion type="multiple" className="w-full">
                            {reports.map(report => (
                                <AccordionItem key={report.id} value={report.id}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <div className="text-left">
                                                <p className="font-semibold">Debrief for Booking #{bookings?.find(b => b.id === report.bookingId)?.bookingNumber}</p>
                                                <p className="text-sm text-muted-foreground">{format(new Date(report.date), 'PPP')} with {instructorsMap.get(report.instructorId) || 'Unknown'}</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-6 pr-2 space-y-4">
                                        {report.entries.map(entry => (
                                            <div key={entry.id} className="p-4 rounded-md bg-muted/50">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-semibold">{entry.exercise}</p>
                                                    <Badge className={getRatingColor(entry.rating)}>{entry.rating}/4</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">{entry.comment}</p>
                                            </div>
                                        ))}
                                        {report.overallComment && (
                                            <div className="pt-4 border-t">
                                                <p className="font-semibold">Overall Comment</p>
                                                <p className="text-sm text-muted-foreground mt-1">{report.overallComment}</p>
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                         </Accordion>
                    ) : (
                        <p className="text-center text-muted-foreground p-4">No debriefs recorded.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
