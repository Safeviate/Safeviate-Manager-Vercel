'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';

import type { ManagementOfChange } from '@/types/moc';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit, ExternalOrganization } from '@/types/quality';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { TabVisibilitySettings } from '../../admin/external/page';

type UnifiedTask = {
  id: string;
  description: string;
  sourceType: 'MOC' | 'Audit' | 'Safety Report';
  sourceIdentifier: string;
  link: string;
  assigneeId: string;
  assigneeName?: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Closed' | 'Cancelled';
  organizationId?: string | null;
};

export default function TaskTrackerPage() {
  const firestore = useFirestore();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();

  const canViewAll = hasPermission('quality-tasks-view');
  const userOrgId = userProfile?.organizationId;

  const mocsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/management-of-change`)) : null), [firestore, tenantId]);
  const safetyReportsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null), [firestore, tenantId]);
  const capsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null), [firestore, tenantId]);
  const auditsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
  const orgsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null), [firestore, tenantId]);
  const visibilitySettingsRef = useMemoFirebase(() => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'tab-visibility') : null), [firestore, tenantId]);

  const { data: mocs, isLoading: isLoadingMocs } = useCollection<ManagementOfChange>(mocsQuery);
  const { data: safetyReports, isLoading: isLoadingSafetyReports } = useCollection<SafetyReport>(safetyReportsQuery);
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);
  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);
  const { data: visibilitySettings, isLoading: isLoadingVisibility } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);

  const isLoading = isLoadingMocs || isLoadingSafetyReports || isLoadingCaps || isLoadingAudits || isLoadingPersonnel || isLoadingOrgs || isLoadingVisibility;

  const allTasks = useMemo((): UnifiedTask[] => {
    if (isLoading || !personnel) return [];

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
                    organizationId: moc.organizationId,
                  });
                }
              });
            });
          });
        });
      });
    });
    
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
                    organizationId: report.organizationId,
                });
            }
        });
    });

    const auditsMap = new Map((audits || []).map(a => [a.id, a]));
    (caps || []).forEach(cap => {
      const audit = auditsMap.get(cap.auditId);
      (cap.actions || []).forEach(action => {
        if (action.status !== 'Closed' && action.status !== 'Cancelled') {
          tasks.push({
            id: action.id,
            description: action.description,
            sourceType: 'Audit',
            sourceIdentifier: audit?.auditNumber || 'Unknown Audit',
            link: `/quality/audits/${cap.auditId}`,
            assigneeId: action.responsiblePersonId,
            assigneeName: personnelMap.get(action.responsiblePersonId) || 'Unassigned',
            dueDate: action.deadline,
            status: action.status,
            organizationId: audit?.organizationId,
          });
        }
      });
    });

    return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  }, [mocs, safetyReports, caps, audits, personnel, isLoading]);
  
  const getStatusBadgeVariant = (status: UnifiedTask['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed':
        case 'Closed':
             return 'default';
        case 'In Progress':
            return 'secondary';
        default:
            return 'outline';
    }
  };

  const renderTasksTable = (tasks: UnifiedTask[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%] text-xs uppercase font-bold">Task</TableHead>
          <TableHead className="text-xs uppercase font-bold">Source</TableHead>
          <TableHead className="text-xs uppercase font-bold">Assignee</TableHead>
          <TableHead className="text-xs uppercase font-bold">Due Date</TableHead>
          <TableHead className="text-xs uppercase font-bold">Status</TableHead>
          <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length > 0 ? (
          tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell className="font-medium text-xs">{task.description}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">{task.sourceIdentifier}</Badge>
              </TableCell>
              <TableCell className="text-xs">{task.assigneeName}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{format(new Date(task.dueDate), 'dd MMM yy')}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(task.status)} className="text-[10px] py-0">{task.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                  <Button asChild variant="default" size="icon" className="h-7 w-7">
                      <Link href={task.link}><Eye className="h-3.5 w-3.5" /></Link>
                  </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic text-sm">
              No outstanding tasks for this organization.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderOrgContext = (orgId: string | 'internal') => {
    const filteredTasks = allTasks.filter(task => 
        orgId === 'internal' ? !task.organizationId : task.organizationId === orgId
    );

    return (
        <Card className="min-h-[400px] flex flex-col shadow-none border">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle>{orgId === 'internal' ? 'Internal Quality Tasks' : organizations?.find(o => o.id === orgId)?.name}</CardTitle>
                <CardDescription>Consolidated view of all pending mitigations and corrective actions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {renderTasksTable(filteredTasks)}
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return <div className="space-y-6 max-w-6xl mx-auto w-full"><Skeleton className="h-10 w-[400px] rounded-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  const isTabEnabled = visibilitySettings?.visibilities?.['task-tracker'] ?? true;
  const showTabs = isTabEnabled && canViewAll;

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 h-full">
        <div className="px-1">
            <h1 className="text-3xl font-bold tracking-tight">Quality Task Tracker</h1>
            <p className="text-muted-foreground">Monitor and manage outstanding safety and quality actions across all companies.</p>
        </div>

        {!showTabs ? (
            renderOrgContext(userOrgId || 'internal')
        ) : (
            <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
                <div className="px-1 shrink-0">
                    <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
                        <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Internal</TabsTrigger>
                        {(organizations || []).map(org => (
                            <TabsTrigger key={org.id} value={org.id} className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
                                {org.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="internal" className="mt-0">
                    {renderOrgContext('internal')}
                </TabsContent>
                
                {(organizations || []).map(org => (
                    <TabsContent key={org.id} value={org.id} className="mt-0">
                        {renderOrgContext(org.id)}
                    </TabsContent>
                ))}
            </Tabs>
        )}
    </div>
  );
}
