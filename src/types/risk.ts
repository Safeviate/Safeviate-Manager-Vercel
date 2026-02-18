
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
    hazardArea: 'Flight Operations' | 'Ground Operations' | 'Maintenance' | 'Cabin Safety' | 'Occupational Safety' | 'Security' | 'Administration & Management';
    hazard: string;
    status: 'Open' | 'Closed' | 'Archived';
    risks: RiskItem[];
};
