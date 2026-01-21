import type { CorrectiveAction } from './safety-report';


export type AuditChecklistItemType = 'Checkbox' | 'Textbox' | 'Number' | 'Date';
export type AuditFinding = 'Compliant' | 'Non Compliant' | 'Not Applicable';
export type AuditStatus = 'Scheduled' | 'In Progress' | 'Finalized' | 'Closed' | 'Archived';
export type CorrectiveActionStatus = 'Open' | 'In Progress' | 'Closed' | 'Cancelled';
export type AuditScheduleStatus = 'Scheduled' | 'Completed' | 'Pending' | 'Not Scheduled';


export interface AuditScheduleItem {
    id: string;
    area: string;
    month: string;
    year: number;
    status: AuditScheduleStatus;
}

export interface ComplianceRequirement {
    id: string;
    regulationCode: string;
    parentRegulationCode?: string;
    regulationStatement: string; // The short title/heading
    technicalStandard?: string; // The full, detailed body text
    companyReference: string;
    responsibleManagerId: string;
    lastAuditDate?: string; // ISO String
    nextAuditDate?: string; // ISO String
}

export interface AuditChecklistItem {
    id: string;
    text: string;
    type: AuditChecklistItemType;
    regulationReference?: string;
}

export interface ChecklistSection {
    id: string;
    title: string;
    items: AuditChecklistItem[];
}

export interface QualityAuditChecklistTemplate {
    id: string;
    title: string;
    departmentId: string;
    sections: ChecklistSection[];
}

export interface QualityFinding {
    checklistItemId: string;
    finding: AuditFinding;
    level?: string; // e.g., 'Level 1', 'Level 2'
    comment?: string;
    suggestedImprovements?: string;
    evidence?: {
        url: string;
        description: string;
    }[];
}

export interface QualityAudit {
    id: string;
    templateId: string;
    title: string;
    auditNumber: string;
    auditorId: string;
    auditeeId: string;
    scope: string;
    auditDate: string; // ISO String
    status: AuditStatus;
    findings: QualityFinding[];
    complianceScore?: number;
    template: QualityAuditChecklistTemplate;
}

export interface CorrectiveActionPlan {
    id: string;
    auditId: string;
    findingId: string;
    rootCauseAnalysis: string;
    status: CorrectiveActionStatus;
    actions?: CorrectiveAction[];
}
