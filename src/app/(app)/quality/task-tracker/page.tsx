
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

// Import necessary types
import type { ManagementOfChange } from '@/types/moc';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit } from '@/types/quality';
import type { Personnel } from '@/app/(app)/users/personnel/page';

// Unified Task Type
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

export default function TaskTrackerPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  // --- Data Fetching ---
  const mocsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/management-of-change`)) : null, [firestore, tenantId]);
  const safetyReportsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null, [firestore, tenantId]);
  const capsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null, [firestore, tenantId]);
  const auditsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null, [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null, [firestore, tenantId]);

  const { data: mocs, isLoading: isLoadingMocs } = useCollection<ManagementOfChange>(mocsQuery);
  const { data: safetyReports, isLoading: isLoadingSafetyReports } = useCollection<SafetyReport>(safetyReportsQuery);
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);
  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

  const isLoading = isLoadingMocs || isLoadingSafetyReports || isLoadingCaps || isLoadingAudits || isLoadingPersonnel;

  // --- Data Transformation ---
  const allTasks = useMemo((): UnifiedTask[] => {
    if (isLoading || !personnel) return [];

    const personnelMap = new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
    const tasks: UnifiedTask[] = [];

    // 1. Extract tasks from Management of Change
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
    
    // 2. Extract tasks from Safety Reports
    (safetyReports || []).forEach(report => {
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

    // 3. Extract tasks from Corrective Action Plans
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

    // Sort all tasks by due date
    return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  }, [mocs, safetyReports, caps, audits, personnel, isLoading]);
  
  const getStatusBadgeVariant = (status: UnifiedTask['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed':
        case 'Closed':
             return 'default';
        case 'In Progress':
            return 'secondary';
        default: // Open
            return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Centralized Task Tracker</CardTitle>
        <CardDescription>All outstanding tasks from MOC, Audits, and Safety Reports.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Task</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTasks.length > 0 ? (
                allTasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.sourceIdentifier}</Badge>
                    </TableCell>
                    <TableCell>{task.assigneeName}</TableCell>
                    <TableCell>{format(new Date(task.dueDate), 'PPP')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <Link href={task.link}><Eye className="h-4 w-4" /></Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No outstanding tasks. Great job!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
