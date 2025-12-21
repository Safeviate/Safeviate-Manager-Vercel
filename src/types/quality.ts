
export type AuditChecklistItemType = 'Header' | 'Checkbox' | 'Textbox' | 'Number' | 'Date';
export type AuditFinding = 'Compliant' | 'Non Compliant' | 'Observation' | 'Not Applicable';
export type AuditStatus = 'Scheduled' | 'In Progress' | 'Finalized' | 'Closed';
export type CorrectiveActionStatus = 'Open' | 'In Progress' | 'Completed' | 'Cancelled';

export interface AuditChecklistItem {
    id: string;
    text: string;
    type: AuditChecklistItemType;
    regulationReference?: string;
}

export interface QualityAuditChecklistTemplate {
    id: string;
    title: string;
    departmentId: string;
    items: AuditChecklistItem[];
}

export interface QualityFinding {
    checklistItemId: string;
    finding: AuditFinding;
    level?: string; // e.g., 'Level 1', 'Level 2'
    comment?: string;
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
}

export interface CorrectiveAction {
    id: string;
    description: string;
    responsiblePersonId: string;
    dueDate: string; // ISO String
    status: CorrectiveActionStatus;
}

export interface CorrectiveActionPlan {
    id: string;
    auditId: string;
    findingId: string; // The specific finding this CAP addresses
    rootCauseAnalysis: string;
    actions: CorrectiveAction[];
}
