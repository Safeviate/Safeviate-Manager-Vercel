
'use client';

import { useMemo } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { StudentProgressReport, StudentMilestoneSettings } from '@/types/training';
import type { PilotProfile } from '../page';
import type { Booking } from '@/types/booking';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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

const MilestoneProgress = ({ totalHours, milestone, warningThreshold }: { totalHours: number, milestone: number, warningThreshold: number }) => {
    const progress = Math.min((totalHours / milestone) * 100, 100);
    const isWarning = totalHours >= warningThreshold && totalHours < milestone;
    const isComplete = totalHours >= milestone;

    const getIndicatorColor = () => {
        if (isComplete) return 'bg-green-500';
        if (isWarning) return 'bg-yellow-500';
        return 'bg-primary';
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-baseline">
                <p className="font-semibold">{milestone} Hour Milestone</p>
                <p className="text-sm text-muted-foreground">{totalHours.toFixed(1)} / {milestone} hrs</p>
            </div>
            <Progress value={progress} indicatorClassName={getIndicatorColor()} />
        </div>
    )
}

export function TrainingRecords({ studentId, tenantId }: TrainingRecordsProps) {
    const firestore = useFirestore();

    const shouldFetch = firestore && studentId;

    const progressReportsQuery = useMemoFirebase(
        () => (shouldFetch ? query(
            collection(firestore, `tenants/${tenantId}/student-progress-reports`),
            where('studentId', '==', studentId)
        ) : null),
        [firestore, tenantId, studentId, shouldFetch]
    );

    const bookingsQuery = useMemoFirebase(
        () => (shouldFetch ? query(
            collection(firestore, `tenants/${tenantId}/bookings`),
            where('studentId', '==', studentId),
            where('status', '==', 'Completed')
        ) : null),
        [firestore, tenantId, studentId, shouldFetch]
    );

    const instructorsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null),
        [firestore, tenantId]
    );
    
    const milestoneSettingsRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'student-milestones') : null),
        [firestore, tenantId]
    );

    const { data: reports, isLoading: isLoadingReports } = useCollection<StudentProgressReport>(progressReportsQuery);
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: milestoneSettings } = useDoc<StudentMilestoneSettings>(milestoneSettingsRef);

    const isLoading = isLoadingReports || isLoadingInstructors || isLoadingBookings;

    const instructorsMap = useMemo(() => {
        if (!instructors) return new Map();
        return new Map(instructors.map(i => [i.id, `${i.firstName} ${i.lastName}`]));
    }, [instructors]);

    const totalFlightHours = useMemo(() => {
        if (!bookings) return 0;
        return bookings.reduce((total, booking) => {
            if (booking.postFlightData?.hobbs && booking.preFlightData?.hobbs) {
                return total + (booking.postFlightData.hobbs - booking.preFlightData.hobbs);
            }
            return total;
        }, 0);
    }, [bookings]);
    
    const defaultMilestones = [
        { milestone: 10, warningHours: 7 },
        { milestone: 20, warningHours: 17 },
        { milestone: 30, warningHours: 27 },
        { milestone: 40, warningHours: 37 },
    ];
    
    const milestones = milestoneSettings?.milestones.length ? milestoneSettings.milestones : defaultMilestones;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Flight Hour Milestones</CardTitle>
                    <CardDescription>Visual progress towards key flight hour goals based on completed bookings.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {milestones.map(ms => (
                        <MilestoneProgress 
                            key={ms.milestone}
                            totalHours={totalFlightHours}
                            milestone={ms.milestone}
                            warningThreshold={ms.warningHours}
                        />
                    ))}
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
                            {reports.filter(r => r.entries.length > 0).map(report => (
                                <AccordionItem key={report.id} value={report.id}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <div className="text-left">
                                                <p className="font-semibold">Debrief</p>
                                                <p className="text-sm text-muted-foreground">{format(new Date(report.date), 'PPP')} with {instructorsMap.get(report.instructorId!) || 'Unknown'}</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-6 pr-2 space-y-4">
                                        {report.entries.map(entry => (
                                            <div key={entry.id} className="p-4 rounded-md bg-muted/50">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-semibold">{entry.exercise}</p>
                                                    <Badge className={cn(getRatingColor(entry.rating), "text-white")}>{entry.rating}/4</Badge>
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                            {report.instructorSignatureUrl && (
                                                <div>
                                                    <p className="text-sm font-semibold text-muted-foreground">Instructor Signature</p>
                                                    <img src={report.instructorSignatureUrl} alt="Instructor Signature" className="mt-2 border rounded-md bg-white max-h-32 object-contain" />
                                                </div>
                                            )}
                                            {report.studentSignatureUrl && (
                                                <div>
                                                    <p className="text-sm font-semibold text-muted-foreground">Student Signature</p>
                                                    <img src={report.studentSignatureUrl} alt="Student Signature" className="mt-2 border rounded-md bg-white max-h-32 object-contain" />
                                                </div>
                                            )}
                                        </div>
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
