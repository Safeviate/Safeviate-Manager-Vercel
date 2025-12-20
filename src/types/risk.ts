
export type Risk = {
    id: string;
    hazard: string;
    risk: string;
    mitigation?: string;
    likelihood: number;
    severity: number;
    riskScore: number;
    residualLikelihood?: number;
    residualSeverity?: number;
    residualRiskScore?: number;
    status: 'Open' | 'Closed' | 'Archived';
    hazardArea: 'Flight Operations' | 'Ground Operations' | 'Maintenance' | 'Cabin Safety' | 'Occupational Safety' | 'Security' | 'Administration & Management';
};
