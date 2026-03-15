'use client';

import { useMemo } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { useUserProfile } from '@/hooks/use-user-profile';

import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit } from '@/types/quality';
import type { ManagementOfChange } from '@/types/moc';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { PilotProfile, Personnel } from '../users/personnel/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type UserProfileData = PilotProfile | Personnel;

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

type UnifiedMessage = {
    id: string;
    from: string;
    content: string;
    timestamp: string;
    link: string;
    source: string;
};


export default function MyDashboardPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    
    // Use `personnel` as the collection for instructors, students, and private pilots
    const personnelQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);
    const privatePilotsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null), [firestore, tenantId]);
    
    const mocsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/management-of-change`)) : null, [firestore, tenantId]);
    const auditsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null, [firestore, tenantId]);
    const reportsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null, [firestore, tenantId]);
    const capsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null, [firestore, tenantId]);

    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);
    const { data: privatePilots, isLoading: isLoadingPrivatePilots } = useCollection<PilotProfile>(privatePilotsQuery);

    const { data: mocs, isLoading: isLoadingMocs } = useCollection<ManagementOfChange>(mocsQuery);
    const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
    const { data: reports, isLoading: isLoadingReports } = useCollection<SafetyReport>(reportsQuery);
    const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);

    const allUsers: UserProfileData[] = useMemo(() => [
        ...(personnel || []),
        ...(instructors || []),
        ...(students || []),
        ...(privatePilots || []),
    ], [personnel, instructors, students, privatePilots]);

    const allTasks = useMemo((): UnifiedTask[] => {
        if (isLoadingMocs || isLoadingAudits || isLoadingReports || isLoadingCaps || !allUsers) return [];
    
        const userMap = new Map(allUsers.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
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
                        assigneeName: userMap.get(mitigation.responsiblePersonId) || 'Unassigned',
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
                        assigneeName: userMap.get(task.assigneeId) || 'Unassigned',
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
              assigneeName: userMap.get(cap.responsiblePersonId || '') || 'Unassigned',
              dueDate: new Date().toISOString(), // Placeholder, CorrectiveActionPlan needs a due date
              status: cap.status,
            });
          }
        });
    
        return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
      }, [mocs, reports, caps, audits, allUsers, isLoadingMocs, isLoadingAudits, isLoadingReports, isLoadingCaps]);

    const myTasks = useMemo(() => {
        if (!userProfile || !allTasks) return [];
        return allTasks.filter(task => task.assigneeId === userProfile.id);
    }, [allTasks, userProfile]);

    const myMessages = useMemo((): UnifiedMessage[] => {
        if (!reports || !userProfile) return [];

        const messages: UnifiedMessage[] = [];

        reports.forEach(report => {
            (report.discussion || []).forEach(item => {
                if (item.assignedToId === userProfile.id) {
                    messages.push({
                        id: item.id,
                        from: item.userName,
                        content: item.message,
                        timestamp: item.timestamp,
                        link: `/safety/safety-reports/${report.id}?tab=discussion`,
                        source: `Safety Report ${report.reportNumber}`,
                    });
                }
            });
        });

        return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [reports, userProfile]);

    const isLoading = isProfileLoading || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents || isLoadingPrivatePilots || isLoadingMocs || isLoadingAudits || isLoadingReports || isLoadingCaps;

    return (
        <div className="w-full space-y-6">
            <Tabs defaultValue="tasks" className="w-full flex flex-col h-full overflow-hidden">
                <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 shrink-0 border-b-0 overflow-x-auto no-scrollbar justify-start w-full flex">
                    <TabsTrigger value="tasks" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Tasks</TabsTrigger>
                    <TabsTrigger value="messages" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
                        Messages {myMessages.length > 0 && <Badge className="ml-2 h-4 px-1.5 min-w-4 flex items-center justify-center text-[10px]">{myMessages.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="logbook" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">My Logbook</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="mt-0">
                    <Card className="shadow-none border">
                        <CardHeader>
                            <CardTitle>My Outstanding Tasks</CardTitle>
                            <CardDescription>A list of all tasks assigned to you across all modules.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-48 w-full" />
                            ) : (
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
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="messages" className="mt-0">
                    <Card className="shadow-none border">
                        <CardHeader>
                            <CardTitle>Messages</CardTitle>
                            <CardDescription>Recent assignments and mentions directed to you.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-48 w-full" />
                            ) : (
                                <div className="space-y-4">
                                    {myMessages.length > 0 ? (
                                        myMessages.map(msg => (
                                            <div key={msg.id} className="flex flex-col gap-1 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-sm font-bold">{msg.from}</span>
                                                    <span className="text-[10px] text-muted-foreground">{format(new Date(msg.timestamp), 'PPP p')}</span>
                                                </div>
                                                <p className="text-sm line-clamp-2 italic text-muted-foreground">&quot;{msg.content}&quot;</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <Badge variant="outline" className="text-[10px]">{msg.source}</Badge>
                                                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                                                        <Link href={msg.link}>View Discussion</Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10">
                                            <p className="text-muted-foreground">You have no new messages.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logbook" className="mt-0">
                    <Card className="shadow-none border">
                        <CardHeader>
                            <CardTitle>My Logbook</CardTitle>
                            <CardDescription>A dynamic view of your recent flight activities.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-10">
                                <p className="text-muted-foreground mb-4">The logbook feature is currently disabled.</p>
                                <Button asChild>
                                    <Link href="/development/table-builder">Go to Table Builder</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}