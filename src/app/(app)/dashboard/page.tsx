
'use client';

import { useMemo } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit } from '@/types/quality';
import type { ManagementOfChange } from '@/types/moc';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { Booking } from '@/types/booking';
import type { SpiConfig } from '../safety/safety-indicators/edit-spi-form';
import { SPICard } from '../safety/safety-indicators/spi-card';
import { AlertTriangle, BookCheck, CalendarClock, Plane } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/use-user-profile';

type UnifiedTask = {
    id: string;
    description: string;
    sourceType: 'MOC' | 'Audit' | 'Safety Report';
    sourceIdentifier: string;
    link: string;
    assigneeId: string;
    assigneeName?: string;
    dueDate: string; // ISO string
    status: 'Open' | 'In Progress' | 'Completed' | 'Closed' | 'Cancelled';
};

const kpiCardData = [
    {
        title: "Open Safety Reports",
        icon: AlertTriangle,
        value: 0,
        color: "text-red-500",
        dataKey: "openReports"
    },
    {
        title: "Open CAPs",
        icon: BookCheck,
        value: 0,
        color: "text-yellow-500",
        dataKey: "openCaps"
    },
    {
        title: "Upcoming Bookings (7 days)",
        icon: Plane,
        value: 0,
        color: "text-blue-500",
        dataKey: "upcomingBookings"
    },
];

const initialSpiConfig: SpiConfig[] = [
    {
        id: 'unstable-approach',
        name: 'Unstable Approach Rate',
        type: 'Lagging',
        unit: 'Rate per 100 fh',
        description: 'Number of reported unstable approaches per 100 flight hours.',
        target: 0.5,
        levels: {
            acceptable: 0.5,
            monitor: 1.0,
            actionRequired: 1.5,
            urgentAction: 2.0,
        }
    },
    {
        id: 'proactive-reports',
        name: 'Proactive Reports',
        type: 'Leading',
        unit: 'Count',
        description: 'Total number of proactive safety reports filed by personnel.',
        target: 10,
        levels: {
            acceptable: 10,
            monitor: 8,
            actionRequired: 5,
            urgentAction: 2,
        }
    }
];

export default function DashboardPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const { userProfile } = useUserProfile();

    // --- Data Fetching ---
    const reportsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null,
        [firestore, tenantId]
    );
    const capsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null,
        [firestore, tenantId]
    );
    const bookingsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null,
        [firestore, tenantId]
    );
    const mocsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/management-of-change`)) : null, [firestore, tenantId]);
    const auditsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null, [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null, [firestore, tenantId]);

    const { data: reports } = useCollection<SafetyReport>(reportsQuery);
    const { data: caps } = useCollection<CorrectiveActionPlan>(capsQuery);
    const { data: bookings } = useCollection<Booking>(bookingsQuery);
    const { data: mocs, isLoading: isLoadingMocs } = useCollection<ManagementOfChange>(mocsQuery);
    const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

    const kpiData = useMemo(() => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        return {
            openReports: reports?.filter(r => r.status === 'Open').length || 0,
            openCaps: caps?.filter(c => c.status === 'Open').length || 0,
            upcomingBookings: bookings?.filter(b => {
                const bookingDate = new Date(b.date);
                return bookingDate >= today && bookingDate <= nextWeek && b.status === 'Confirmed';
            }).length || 0
        };
    }, [reports, caps, bookings]);

    const recentReports = useMemo(() => {
        return reports
            ?.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
            .slice(0, 5);
    }, [reports]);

    const allTasks = useMemo((): UnifiedTask[] => {
        if (isLoadingMocs || isLoadingAudits || isLoadingPersonnel || !personnel) return [];
    
        const personnelMap = new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
        const tasks: UnifiedTask[] = [];
    
        (mocs || []).forEach(moc => {
          moc.phases?.forEach(phase => {
            phase.steps?.forEach(step => {
              step.hazards?.forEach(hazard => {
                hazard.risks?.forEach(risk => {
                  risk.mitigations?.forEach(mitigation => {
                    if (mitigation.status !== 'Closed' && mitigation.status !== 'Cancelled') {
                      tasks.push({
                        id: mitigation.id,
                        description: mitigation.description,
                        sourceType: 'MOC',
                        sourceIdentifier: moc.mocNumber,
                        link: `/safety/management-of-change/${moc.id}`,
                        assigneeId: mitigation.responsiblePersonId,
                        assigneeName: personnelMap.get(mitigation.responsiblePersonId) || 'Unassigned',
                        dueDate: mitigation.completionDate,
                        status: mitigation.status,
                      });
                    }
                  });
                });
              });
            });
          });
        });
        
        (reports || []).forEach(report => {
            (report.investigationTasks || []).forEach(task => {
                if (task.status !== 'Completed') {
                     tasks.push({
                        id: task.id,
                        description: task.description,
                        sourceType: 'Safety Report',
                        sourceIdentifier: report.reportNumber,
                        link: `/safety/safety-reports/${report.id}`,
                        assigneeId: task.assigneeId,
                        assigneeName: personnelMap.get(task.assigneeId) || 'Unassigned',
                        dueDate: task.dueDate,
                        status: task.status,
                    });
                }
            });
        });
    
        const auditsMap = new Map((audits || []).map(a => [a.id, a]));
        (caps || []).forEach(cap => {
          if (cap.status !== 'Closed' && cap.status !== 'Cancelled') {
            const audit = auditsMap.get(cap.auditId);
            tasks.push({
              id: cap.id,
              description: `Corrective action for finding on audit ${audit?.auditNumber || cap.auditId}`,
              sourceType: 'Audit',
              sourceIdentifier: audit?.auditNumber || 'Unknown Audit',
              link: `/quality/audits/${cap.auditId}`,
              assigneeId: cap.responsiblePersonId || '',
              assigneeName: personnelMap.get(cap.responsiblePersonId || '') || 'Unassigned',
              dueDate: new Date().toISOString(), // Placeholder, CorrectiveActionPlan needs a due date
              status: cap.status,
            });
          }
        });
    
        return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
      }, [mocs, reports, caps, audits, personnel, isLoadingMocs, isLoadingAudits, isLoadingPersonnel]);

    const myTasks = useMemo(() => {
        if (!userProfile || !allTasks) return [];
        return allTasks.filter(task => task.assigneeId === userProfile.id);
    }, [allTasks, userProfile]);


    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {kpiCardData.map(kpi => (
                    <Card key={kpi.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <kpi.icon className={`h-4 w-4 text-muted-foreground ${kpi.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpiData[kpi.dataKey as keyof typeof kpiData]}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>My Outstanding Tasks</CardTitle>
                    <CardDescription>A list of all tasks assigned to you across all modules.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Task</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myTasks.length > 0 ? (
                                myTasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.description}</TableCell>
                                        <TableCell><Badge variant="outline">{task.sourceIdentifier}</Badge></TableCell>
                                        <TableCell>{format(new Date(task.dueDate), 'PPP')}</TableCell>
                                        <TableCell><Badge variant="secondary">{task.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={task.link}>View</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        You have no outstanding tasks.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                 {initialSpiConfig.map(spi => (
                    <SPICard 
                        key={spi.id}
                        spi={spi} 
                        onEdit={() => {}} // No edit functionality from dashboard
                        reports={reports} 
                        bookings={bookings} 
                    />
                ))}
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Recent Safety Reports</CardTitle>
                    <CardDescription>The 5 most recently filed safety reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Report #</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Event Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentReports && recentReports.length > 0 ? (
                                recentReports.map(report => (
                                    <TableRow key={report.id}>
                                        <TableCell>{report.reportNumber}</TableCell>
                                        <TableCell>{report.reportType}</TableCell>
                                        <TableCell><Badge variant="secondary">{report.status}</Badge></TableCell>
                                        <TableCell>{format(new Date(report.eventDate), 'PPP')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/safety/safety-reports/${report.id}`}>View</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No recent reports.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
