export type ReportStatus = 'Open' | 'Under Review' | 'Awaiting Action' | 'Closed' | 'Archived';
export type ReportType = string;
export type EventClassification = 'Hazard' | 'Incident' | 'Accident';
export type InvestigationMemberRole = 'Lead Investigator' | 'Team Member' | 'Technical Expert' | 'Observer';
export type InvestigationTaskStatus = 'Open' | 'In Progress' | 'Completed';
export type CorrectiveActionStatus = 'Open' | 'In Progress' | 'Closed' | 'Cancelled';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type CorrectiveActionRiskView = 'Initial' | 'Residual';
export type ReportDiaryEntryType = 'comment' | 'task_assignment' | 'task_update' | 'finding' | 'decision' | 'status_change';
export type ReportRootCauseCategory = 'Human Factors' | 'Process' | 'Equipment' | 'Environment' | 'Training' | 'Communication' | 'Other';
export type InvestigationInterviewStatus = 'Pending' | 'In Progress' | 'Completed';

export interface InvestigationTaskUpdate {
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: string; // ISO String
    taskStatus?: InvestigationTaskStatus;
}

export interface InvestigationPhotoAttachment {
    id: string;
    name: string;
    url: string;
    uploadDate: string; // ISO String
}

export interface InvestigationDocumentAttachment {
    id: string;
    name: string;
    url: string;
    uploadDate: string; // ISO String
}

export interface ReportRootCauseAnalysis {
    id: string;
    category: ReportRootCauseCategory;
    title: string;
    analysis: string;
}

export interface InvestigationInterview {
    id: string;
    personName: string;
    involvement: string;
    interviewerName: string;
    interviewDate: string; // ISO String
    status: InvestigationInterviewStatus;
    notes: string;
    followUpRequired?: string | null;
}

export interface InvestigationMember {
    userId: string;
    name: string;
    role: InvestigationMemberRole;
}

export interface RiskAssessment {
    severity: number;
    likelihood: number;
    riskScore: number;
    riskLevel: RiskLevel;
}

export interface ReportRisk {
    id: string;
    description: string;
    riskAssessment: RiskAssessment;
    mitigations?: ReportMitigation[];
}

export interface ReportHazard {
    id: string;
    description: string;
    risks?: ReportRisk[];
}

export interface ReportMitigation {
    id: string;
    description: string;
    residualRiskAssessment: RiskAssessment;
}

export interface InvestigationTask {
    id: string;
    description: string;
    assigneeId: string;
    dueDate: string; // ISO String
    status: InvestigationTaskStatus;
    updates?: InvestigationTaskUpdate[];
}

export interface ReportDiscussionItem {
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: string; // ISO String
    entryType?: ReportDiaryEntryType;
    assignedToId?: string;
    assignedToName?: string;
    dueDate?: string; // ISO String
    linkedTaskId?: string;
    taskStatus?: InvestigationTaskStatus;
}

export interface CorrectiveAction {
    id: string;
    description: string;
    responsiblePersonId: string;
    hazardId?: string | null;
    riskId?: string | null;
    riskAssessmentView?: CorrectiveActionRiskView | null;
    residualLikelihood?: number | null;
    residualSeverity?: number | null;
    residualRiskScore?: number | null;
    residualRiskLevel?: RiskLevel | null;
    deadline: string; // ISO String
    status: CorrectiveActionStatus;
}

export interface ReportSignature {
    userId: string;
    userName: string;
    role: string;
    signatureUrl: string;
    signedAt: string; // ISO String
}

export interface SafetyReport {
    id: string;
    tenantId?: string | null;
    reportNumber: string;
    reportType: ReportType;
    status: ReportStatus;
    submittedBy: string;
    submittedByEmail?: string | null;
    submittedByName: string;
    submittedOnBehalfOf?: string | null;
    submittedAt: string; // ISO String
    closedDate?: string; // ISO String
    isAnonymous: boolean;
    eventDate: string; // ISO String
    eventTime: string;
    location: string;
    description: string;
    immediateAction?: string | null;
    organizationId?: string | null; // Associated external company ID
    // Conditional Fields
    phaseOfFlight?: string;
    systemOrComponent?: string;
    // Triage Fields
    departmentId?: string;
    occurrenceCategory?: string;
    eventClassification?: EventClassification;
    // Investigation Fields
    investigationTeam?: InvestigationMember[];
    initialHazards?: ReportHazard[];
    investigationInterviews?: InvestigationInterview[];
    investigationTasks?: InvestigationTask[];
    investigationEvidencePhotos?: InvestigationPhotoAttachment[];
    investigationDocuments?: InvestigationDocumentAttachment[];
    rootCauseAnalyses?: ReportRootCauseAnalysis[];
    investigationNotes?: string;
    discussion?: ReportDiscussionItem[];
    // CAP Fields
    correctiveActions?: CorrectiveAction[];
    mitigatedHazards?: ReportHazard[];
    // Closure Fields
    signatures?: ReportSignature[];
    sourceQuickReportId?: string;
    sourceQuickReportNumber?: string;
}
