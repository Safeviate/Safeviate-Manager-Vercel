'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ListTodo, Building } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ManagementOfChange } from '@/types/moc';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit, ExternalOrganization, TabVisibilitySettings } from '@/types/quality';
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

function CompanyTabsRow({ organizations, activeTab, onTabChange }: { organizations: ExternalOrganization[], activeTab: string, onTabChange: (value: string) => void }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="border-b bg-muted/5 px-4 py-3">
        <Select value={activeTab} onValueChange={onTabChange}>
          <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase h-9">
            <SelectValue placeholder="Select Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="internal" className="text-[10px] font-bold uppercase">
              <div className="flex items-center gap-2">
                <Building className="h-3.5 w-3.5" />
                Internal
              </div>
            </SelectItem>
            {organizations.map((organization) => (
              <SelectItem key={organization.id} value={organization.id} className="text-[10px] font-bold uppercase">
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5" />
                  {organization.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="border-b bg-muted/5 px-6 py-3 overflow-x-auto no-scrollbar">
      <div className="flex w-max gap-2 pr-6 flex-nowrap">
        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
          <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase">
            Internal
          </TabsTrigger>
          {organizations.map((organization) => (
            <TabsTrigger
              key={organization.id}
              value={organization.id}
              className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase"
            >
              {organization.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  );
}

export default function TaskTrackerPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'quality-tasks-view' });
  const [activeOrgTab, setActiveOrgTab] = useState('internal');

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
                  <Button asChild variant="outline" size="sm" className="h-9 gap-2 text-[10px] font-black uppercase border-slate-300">
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
        {shouldShowOrganizationTabs && <CompanyTabsRow organizations={organizations || []} activeTab={activeOrgTab} onTabChange={setActiveOrgTab} />}
        <CardContent className="p-0 overflow-auto">
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
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1">
        {!showTabs ? (
            renderOrgCard(scopedOrganizationId)
        ) : (
            <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className="w-full flex-1 flex flex-col overflow-hidden">
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
