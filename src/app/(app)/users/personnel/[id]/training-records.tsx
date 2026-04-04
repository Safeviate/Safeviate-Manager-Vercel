'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { StudentProgressReport, StudentMilestoneSettings } from '@/types/training';
import type { PilotProfile } from '../personnel-directory-page';
import type { Booking } from '@/types/booking';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, History, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-bold leading-tight">{title}</h3>
    </div>
);

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
        <div className='space-y-3 bg-background/50 p-4 rounded-xl border border-card-border/50'>
            <div className="flex justify-between items-baseline border-b border-primary/20 pb-2 mb-3">
                <h4 className='text-[10px] font-bold uppercase text-primary tracking-wider'>{milestone} Hour Milestone</h4>
                <p className="text-[10px] font-mono font-bold text-muted-foreground">{totalHours.toFixed(1)} / {milestone}h</p>
            </div>
            <Progress value={progress} indicatorClassName={getIndicatorColor()} className='h-2' />
            {isComplete && (
                <div className='flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase mt-1'>
                    <CheckCircle2 className='h-3 w-3' />
                    Goal Reached
                </div>
            )}
        </div>
    )
}

export function TrainingRecords({ studentId, tenantId }: TrainingRecordsProps) {
    const [reports, setReports] = useState<StudentProgressReport[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [instructors, setInstructors] = useState<PilotProfile[]>([]);
    const [milestoneSettings, setMilestoneSettings] = useState<StudentMilestoneSettings | null>(null);
    const [student, setStudent] = useState<PilotProfile | null>(null);

    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [isLoadingBookings, setIsLoadingBookings] = useState(true);
    const [isLoadingInstructors, setIsLoadingInstructors] = useState(true);

    useEffect(() => {
        try {
            const stds = localStorage.getItem('safeviate.students');
            if (stds) {
                const arr = JSON.parse(stds) as PilotProfile[];
                const s = arr.find(u => u.id === studentId);
                if (s) setStudent(s);
            }
        } catch { }

        try {
            const ins = localStorage.getItem('safeviate.instructors');
            if (ins) setInstructors(JSON.parse(ins));
        } catch { } finally { setIsLoadingInstructors(false); }

        try {
            const rpts = localStorage.getItem('safeviate.student-progress-reports');
            if (rpts) {
                const arr = JSON.parse(rpts) as StudentProgressReport[];
                setReports(arr.filter(r => r.studentId === studentId));
            }
        } catch { } finally { setIsLoadingReports(false); }

        try {
            const bks = localStorage.getItem('safeviate.bookings');
            if (bks) {
                const arr = JSON.parse(bks) as Booking[];
                setBookings(arr.filter(b => b.studentId === studentId && b.status === 'Completed'));
            }
        } catch { } finally { setIsLoadingBookings(false); }

        try {
            const ms = localStorage.getItem('safeviate.student-milestones');
            if (ms) setMilestoneSettings(JSON.parse(ms));
        } catch { }
    }, [studentId]);

    const isLoading = isLoadingReports || isLoadingInstructors || isLoadingBookings;

    const instructorsMap = useMemo(() => {
        if (!instructors) return new Map();
        return new Map(instructors.map(i => [i.id, `${i.firstName} ${i.lastName}`]));
    }, [instructors]);

    const totalFlightHours = useMemo(() => {
        if (!bookings) return 0;
        return bookings.reduce((total, booking) => {
            if (booking.postFlightData?.hobbs !== undefined && booking.preFlightData?.hobbs !== undefined) {
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

    const sortedReports = useMemo(() => {
        if (!reports) return [];
        return [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [reports]);

    if (isLoading) {
        return (
            <div className="h-full space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    return (
        <Card className="flex flex-col h-full overflow-hidden shadow-none border">
            <CardHeader className="shrink-0 border-b bg-muted/5">
                <CardTitle>{student ? `${student.firstName} ${student.lastName} - ` : ''}Training Progress & History</CardTitle>
                <CardDescription>Comprehensive overview of flight hour milestones and instructor debriefs.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-6 space-y-10">
                        <section>
                            <SectionHeader title="Flight Hour Milestones" icon={Trophy} />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {milestones.map(ms => (
                                    <MilestoneProgress 
                                        key={ms.milestone}
                                        totalHours={totalFlightHours}
                                        milestone={ms.milestone}
                                        warningThreshold={ms.warningHours}
                                    />
                                ))}
                            </div>
                        </section>

                        <Separator />

                        <section>
                            <SectionHeader title="Detailed Training History" icon={History} />
                            {sortedReports && sortedReports.length > 0 ? (
                                <Accordion type="multiple" className="w-full space-y-4">
                                    {sortedReports.filter(r => r.entries.length > 0).map(report => (
                                        <AccordionItem key={report.id} value={report.id} className='border rounded-xl bg-background overflow-hidden'>
                                            <AccordionTrigger className='px-4 hover:no-underline'>
                                                <div className="flex justify-between items-center w-full pr-4">
                                                    <div className="text-left">
                                                        <p className="font-bold text-sm">Debrief {report.bookingNumber ? `#${report.bookingNumber}` : ''}</p>
                                                        <p className="text-xs text-muted-foreground">{format(new Date(report.date), 'PPP')} with {instructorsMap.get(report.instructorId!) || 'Unknown'}</p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 pb-4 space-y-4 pt-2 border-t bg-muted/10">
                                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                                    {report.entries.map(entry => (
                                                        <div key={entry.id} className="p-3 rounded-lg border bg-background flex flex-col justify-between">
                                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                                <p className="font-bold text-xs">{entry.exercise}</p>
                                                                <Badge className={cn(getRatingColor(entry.rating), "text-white text-[10px] h-5")}>{entry.rating}/4</Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground italic">{entry.comment || 'No specific notes.'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {report.overallComment && (
                                                    <div className="pt-4 border-t">
                                                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Overall Instructor Comment</p>
                                                        <p className="text-sm font-medium leading-relaxed">{report.overallComment}</p>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                                    {report.instructorSignatureUrl && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Instructor Signature</p>
                                                            <div className='bg-white border rounded-lg p-2 flex justify-center'>
                                                                <img src={report.instructorSignatureUrl} alt="Instructor Signature" className="max-h-20 object-contain" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {report.studentSignatureUrl && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Student Acknowledgement</p>
                                                            <div className='bg-white border rounded-lg p-2 flex justify-center'>
                                                                <img src={report.studentSignatureUrl} alt="Student Signature" className="max-h-20 object-contain" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <div className='py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground'>
                                    <History className='h-8 w-8 mb-2 opacity-20' />
                                    <p className="text-sm">No debriefs recorded yet.</p>
                                </div>
                            )}
                        </section>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
