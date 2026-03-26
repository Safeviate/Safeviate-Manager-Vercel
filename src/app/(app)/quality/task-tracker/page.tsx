'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ListTodo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { OrganizationTabsRow } from '@/components/responsive-tab-row';
import { ViewActionButton } from '@/components/record-action-buttons';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import type { ManagementOfChange } from '@/types/moc';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit, ExternalOrganization } from '@/types/quality';
import type { Personnel } from '@/app/(app)/users/personnel/page';

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
  const { tenantId } = useUserProfile();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-tasks-view' });
  const isMobile = useIsMobile();
  const [activeOrgTab, setActiveOrgTab] = useState('internal');

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
        case 'Cancelled':
            return 'destructive';
        default:
            return 'outline';
    }
  };

  const renderTasksTable = (tasks: UnifiedTask[]) => (
    <Table>
      <TableHeader className="bg-muted/30 sticky top-0 z-10">
        <TableRow>
          <TableHead className="w-[40%] text-[10px] uppercase font-bold tracking-wider">Task</TableHead>
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
              <TableCell className="font-bold text-sm text-foreground">{task.description}</TableCell>
              <TableCell>
                <span className="text-sm font-black uppercase text-foreground tracking-tight">{task.sourceIdentifier}</span>
              </TableCell>
              <TableCell className="text-sm font-bold text-foreground">{task.assigneeName}</TableCell>
              <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{format(new Date(task.dueDate), 'dd MMM yy')}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(task.status)} className="text-[10px] font-black uppercase py-0.5 px-3">{task.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                  <ViewActionButton href={task.link} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic text-sm uppercase font-bold tracking-widest bg-muted/5">
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
      <Card className="min-h-[400px] flex flex-col shadow-none border">
        <MainPageHeader title="Task Tracker" description="Centralized oversight of all corrective actions and mitigation tasks across the organization." />
        {shouldShowOrganizationTabs && <OrganizationTabsRow organizations={organizations || []} activeTab={activeOrgTab} onTabChange={setActiveOrgTab} />}
        <CardContent className={cn("p-0", isMobile ? "overflow-y-auto" : "overflow-auto")}>
          {renderTasksTable(filteredTasks)}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
        <div className="max-w-[1200px] mx-auto w-full space-y-6 px-1">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
  }

  const showTabs = shouldShowOrganizationTabs;

  return (
    <div className={cn("max-w-[1200px] mx-auto w-full flex flex-col gap-6 px-1", isMobile ? "min-h-0 overflow-y-auto" : "h-full")}>
        {!showTabs ? (
            renderOrgCard(scopedOrganizationId)
        ) : (
            <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className={cn("w-full flex-1 flex flex-col", isMobile ? "overflow-visible" : "overflow-hidden")}>
                <div className={cn("flex-1 min-h-0", isMobile ? "overflow-visible" : "overflow-hidden")}>
                    <TabsContent value="internal" className={cn("m-0 p-0", isMobile ? "min-h-0" : "h-full")}>
                        {renderOrgCard('internal')}
                    </TabsContent>
                    
                    {(organizations || []).map(org => (
                        <TabsContent key={org.id} value={org.id} className={cn("m-0 p-0", isMobile ? "min-h-0" : "h-full")}>
                            {renderOrgCard(org.id)}
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        )}
    </div>
  );
}
