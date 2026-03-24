'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrganizationScope } from '@/hooks/use-organization-scope';

import type { ManagementOfChange } from '@/types/moc';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit, ExternalOrganization, TabVisibilitySettings } from '@/types/quality';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { MainPageHeader } from '@/components/page-header';

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

function CompanyTabsRow({ organizations }: { organizations: ExternalOrganization[] }) {
    return (
        <div className="border-b bg-muted/5 px-6 py-2 shrink-0">
            <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
                <TabsTrigger 
                    value="internal" 
                    className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                >
                    Internal
                </TabsTrigger>
                {organizations.map((organization) => (
                    <TabsTrigger
                        key={organization.id}
                        value={organization.id}
                        className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                    >
                        {organization.name}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );
}

export default function TaskTrackerPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-tasks-view' });

  const canViewAll = hasPermission('quality-tasks-view');

  const mocsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/management-of-change`)) : null), [firestore, tenantId]);
  const safetyReportsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null), [firestore, tenantId]);
  const capsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null), [firestore, tenantId]);
  const auditsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
  const orgsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null), [firestore, tenantId]);

  const { data: mocs, isLoading: isLoadingMocs } = useCollection<ManagementOfChange>(mocsQuery);
  const { data: safetyReports, isLoading: isLoadingSafetyReports } = useCollection<SafetyReport>(safetyReportsQuery);
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);
  const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);

  const isLoading = isLoadingMocs || isLoadingSafetyReports || isLoadingCaps || isLoadingAudits || isLoadingPersonnel || isLoadingOrgs;

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
      <TableHeader className="bg-muted/30 sticky top-0 z-10">
        <TableRow>
          <TableHead className="w-[40%] text-[10px] uppercase font-bold tracking-wider">Task Description</TableHead>
          <TableHead className="text-[10px] uppercase font-bold tracking-wider">Source</TableHead>
          <TableHead className="text-[10px] uppercase font-bold tracking-wider">Assignee</TableHead>
          <TableHead className="text-[10px] uppercase font-bold tracking-wider">Due Date</TableHead>
          <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
          <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length > 0 ? (
          tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell className="font-bold text-sm leading-snug">{task.description}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/20 bg-primary/5 text-primary uppercase font-black">{task.sourceIdentifier}</Badge>
              </TableCell>
              <TableCell className="text-sm font-medium">{task.assigneeName}</TableCell>
              <TableCell className="text-sm font-medium whitespace-nowrap">{format(new Date(task.dueDate), 'dd MMM yy')}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-300">{task.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm" className="h-8 gap-2 border-slate-300">
                      <Link href={task.link}>
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                  </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic text-sm">
              No outstanding tasks for this organization.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderOrgCard = (orgId: string | 'internal') => {
    const filteredTasks = allTasks.filter(task => 
        orgId === 'internal' ? !task.organizationId : task.organizationId === orgId
    );

    return (
        <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
            <div className="sticky top-0 z-30 bg-card">
                <MainPageHeader 
                    title="Task Tracker"
                    description="Centralized oversight of all corrective actions and mitigation tasks across the organization."
                />
                {shouldShowOrganizationTabs && <CompanyTabsRow organizations={organizations || []} />}
            </div>
            
            <CardContent className="flex-1 p-0 overflow-auto bg-background">
                {renderTasksTable(filteredTasks)}
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return (
        <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    );
  }

  const showTabs = shouldShowOrganizationTabs;

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full overflow-hidden pt-2 px-1">
        {!showTabs ? (
            renderOrgCard(scopedOrganizationId)
        ) : (
            <Tabs defaultValue="internal" className="w-full flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                    <TabsContent value="internal" className="m-0 p-0 h-full">
                        {renderOrgCard('internal')}
                    </TabsContent>
                    
                    {(organizations || []).map(org => (
                        <TabsContent key={org.id} value={org.id} className="m-0 p-0 h-full">
                            {renderOrgCard(org.id)}
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        )}
    </div>
  );
}
