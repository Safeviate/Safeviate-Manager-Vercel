import type { RiskAssessment } from './safety-report';

export type TrainingClassificationStatus = 'Unclassified' | 'Proposed' | 'Active';
export type TrainingAudience = 'Instructors' | 'Students' | 'Both' | 'All Personnel';

export interface RiskSourceOccurrence {
    reportId: string;
    reportNumber: string;
    hazardId: string;
    riskId: string;
    linkedAt: string;
}

export interface RiskTrainingClassification {
    status: TrainingClassificationStatus;
    audience: TrainingAudience;
    trainingArea: string;
    learningObjective: string;
    notes: string;
    updatedAt?: string;
}

export interface Mitigation {
    id: string;
    description: string;
    responsiblePersonId: string;
    reviewDate: string; // ISO String
    residualRiskAssessment?: RiskAssessment;
}

export interface RiskItem {
    id: string;
    description: string;
    initialRiskAssessment?: RiskAssessment;
    mitigations: Mitigation[];
    sourceOccurrences?: RiskSourceOccurrence[];
    trainingClassification?: RiskTrainingClassification;
    sourceSafetyReportId?: string | null;
    sourceSafetyReportNumber?: string | null;
    sourceHazardId?: string | null;
    sourceRiskId?: string | null;
}

export type Risk = { // This is the top-level document, which is a Hazard
    id: string;
    hazardArea: string; // Relaxed to string to support dynamic areas
    hazard: string;
    status: 'Open' | 'Closed' | 'Archived';
    risks: RiskItem[];
    organizationId?: string | null; // Associated external company ID
    canonicalKey?: string;
    sourceOccurrences?: RiskSourceOccurrence[];
    sourceSafetyReportId?: string | null;
    sourceSafetyReportNumber?: string | null;
    sourceHazardId?: string | null;
};

export interface RiskMatrixSettings {
    id: string;
    colors: Record<string, string>;
    likelihoodDefinitions?: { name: string; description: string; value: number }[];
    severityDefinitions?: { name: string; description: string; value: string }[];
}

export interface RiskRegisterSettings {
    id: string;
    hazardAreas: string[];
}
