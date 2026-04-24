'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import type { Personnel } from '@/app/(app)/users/personnel/personnel-directory-page';
import type { SafetyReport } from '@/types/safety-report';
import type { CorrectiveActionPlan, QualityAudit } from '@/types/quality';
import type { ManagementOfChange } from '@/types/moc';
import type { MeetingRecordData } from '@/types/meeting';

export type UnifiedTask = {
    id: string;
    description: string;
    sourceType: 'MOC' | 'Audit' | 'Safety Report' | 'Meeting';
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

type SummaryPerson = Pick<Personnel, 'id' | 'firstName' | 'lastName'>;

const isSummaryPerson = (value: unknown): value is SummaryPerson => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.id === 'string' && typeof candidate.firstName === 'string' && typeof candidate.lastName === 'string';
};

const toSummaryPeople = (value: unknown): SummaryPerson[] => Array.isArray(value) ? value.filter(isSummaryPerson) : [];

export function useDashboardData() {
    const { userProfile, tenantId, isLoading: isProfileLoading } = useUserProfile();
    const { tenant, isLoading: isLoadingTenant } = useTenantConfig();

    const [personnel, setPersonnel] = useState<SummaryPerson[]>([]);
    const [instructors, setInstructors] = useState<SummaryPerson[]>([]);
    const [students, setStudents] = useState<SummaryPerson[]>([]);
    const [privatePilots, setPrivatePilots] = useState<SummaryPerson[]>([]);
    const [mocs, setMocs] = useState<ManagementOfChange[]>([]);
    const [audits, setAudits] = useState<QualityAudit[]>([]);
    const [reports, setReports] = useState<SafetyReport[]>([]);
    const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
    const [meetings, setMeetings] = useState<MeetingRecordData[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!tenantId) {
                setIsLoadingData(false);
                return;
            }

            setIsLoadingData(true);
            try {
                const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
                const payload = response.ok ? await response.json().catch(() => ({})) : {};
                if (!cancelled) {
                    setPersonnel(toSummaryPeople(payload.personnel));
                    setInstructors(toSummaryPeople(payload.instructors));
                    setStudents(toSummaryPeople(payload.students));
                    setPrivatePilots(toSummaryPeople(payload.privatePilots));
                    setMocs(payload.mocs ?? []);
                    setAudits(payload.audits ?? []);
                    setReports(payload.reports ?? []);
                    setCaps(payload.caps ?? []);
                    setMeetings(payload.meetings ?? []);
                }
            } catch (error) {
                if (!cancelled) {
                    setPersonnel([]);
                    setInstructors([]);
                    setStudents([]);
                    setPrivatePilots([]);
                    setMocs([]);
                    setAudits([]);
                    setReports([]);
                    setCaps([]);
                    setMeetings([]);
                }
            } finally {
                if (!cancelled) setIsLoadingData(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [tenantId]);

    const allUsers = useMemo(() => [
        ...(personnel || []),
        ...(instructors || []),
        ...(students || []),
        ...(privatePilots || []),
    ], [personnel, instructors, students, privatePilots]);

    const allTasks = useMemo((): UnifiedTask[] => {
        if (isLoadingData || !allUsers) return [];
    
        const userMap = new Map(allUsers.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
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

        (meetings || []).forEach((meeting) => {
          (meeting.actionItems || []).forEach((action) => {
            if (action.status === 'Completed' || action.status === 'Cancelled') return;
            tasks.push({
              id: action.id,
              description: action.description,
              sourceType: 'Meeting',
              sourceIdentifier: meeting.meetingNumber,
              link: `/operations/meetings`,
              assigneeId: action.assigneeId,
              assigneeName: userMap.get(action.assigneeId) || action.assigneeName || 'Unassigned',
              dueDate: action.dueDate,
              status: action.status,
            });
          });
        });
    
        return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
      }, [mocs, reports, caps, audits, meetings, allUsers, isLoadingData]);

    const myTasks = useMemo(() => {
        if (!userProfile || !allTasks) return [];
        return allTasks.filter(task => task.assigneeId === userProfile.id);
    }, [allTasks, userProfile]);

    const myMessages = useMemo((): UnifiedMessage[] => {
        if (!reports || !userProfile) return [];

        const messages: UnifiedMessage[] = [];

        reports.forEach((report) => {
            (report.discussion || []).forEach((item) => {
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

    const isLoading = isProfileLoading || isLoadingTenant || isLoadingData;

    return {
        myTasks,
        myMessages,
        isLoading,
        userProfile,
        tenant,
    };
}
