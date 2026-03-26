'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit } from '@/types/quality';
import type { ManagementOfChange } from '@/types/moc';

export type UnifiedTask = {
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

export type UnifiedMessage = {
    id: string;
    from: string;
    content: string;
    timestamp: string;
    link: string;
    source: string;
};

export function useDashboardData() {
    const firestore = useFirestore();
    const { userProfile, tenantId, isLoading: isProfileLoading } = useUserProfile();
    const { tenant, isLoading: isLoadingTenant } = useTenantConfig();
    
    const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);
    const privatePilotsQuery = useMemoFirebase(() => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null), [firestore, tenantId]);
    
    const mocsQuery = useMemoFirebase(() => firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/management-of-change`)) : null, [firestore, tenantId]);
    const auditsQuery = useMemoFirebase(() => firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/quality-audits`)) : null, [firestore, tenantId]);
    const reportsQuery = useMemoFirebase(() => firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/safety-reports`)) : null, [firestore, tenantId]);
    const capsQuery = useMemoFirebase(() => firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`)) : null, [firestore, tenantId]);

    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<any>(personnelQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<any>(instructorsQuery);
    const { data: students, isLoading: isLoadingStudents } = useCollection<any>(studentsQuery);
    const { data: privatePilots, isLoading: isLoadingPrivatePilots } = useCollection<any>(privatePilotsQuery);

    const { data: mocs, isLoading: isLoadingMocs } = useCollection<ManagementOfChange>(mocsQuery);
    const { data: audits, isLoading: isLoadingAudits } = useCollection<QualityAudit>(auditsQuery);
    const { data: reports, isLoading: isLoadingReports } = useCollection<SafetyReport>(reportsQuery);
    const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);

    const allUsers = useMemo(() => [
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
              dueDate: new Date().toISOString(),
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

    const isLoading = isProfileLoading || isLoadingTenant || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents || isLoadingPrivatePilots || isLoadingMocs || isLoadingAudits || isLoadingReports || isLoadingCaps;

    return {
        myTasks,
        myMessages,
        isLoading,
        userProfile,
        tenant,
    };
}
