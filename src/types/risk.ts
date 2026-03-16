import type { RiskAssessment } from './safety-report';

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
}

export type Risk = { // This is the top-level document, which is a Hazard
    id: string;
    hazardArea: string; // Relaxed to string to support dynamic areas
    hazard: string;
    status: 'Open' | 'Closed' | 'Archived';
    risks: RiskItem[];
    organizationId?: string | null; // Associated external company ID
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
