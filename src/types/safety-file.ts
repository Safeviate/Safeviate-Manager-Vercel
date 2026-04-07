export type SafetyFileProjectStatus = 'PLANNING' | 'ACTIVE' | 'CLOSED';
export type SafetyFileRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface SafetyFileRiskAssessmentValue {
  severity: number;
  likelihood: number;
  riskScore: number;
  riskLevel: SafetyFileRiskLevel;
}

export interface SafetyFileBaselineRiskAssessment {
  id: string;
  hazard: string;
  riskDescription: string;
  existingControls?: string;
  additionalControls?: string;
  responsiblePersonId?: string;
  reviewDate?: string;
  initialAssessment: SafetyFileRiskAssessmentValue;
  residualAssessment?: SafetyFileRiskAssessmentValue;
  createdAt?: string;
  updatedAt?: string;
}

export interface SafetyFileTaskRiskAssessment {
  id: string;
  taskName: string;
  activityDescription?: string;
  hazard: string;
  riskDescription: string;
  controls?: string;
  responsiblePersonId?: string;
  reviewDate?: string;
  initialAssessment: SafetyFileRiskAssessmentValue;
  residualAssessment?: SafetyFileRiskAssessmentValue;
  createdAt?: string;
  updatedAt?: string;
}

export interface SafetyFileProject {
  id: string;
  name: string;
  clientName?: string;
  siteName?: string;
  siteAddress?: string;
  principalContractor?: string;
  scopeOfWork?: string;
  startDate?: string;
  endDate?: string;
  status: SafetyFileProjectStatus;
  permitRequired?: boolean;
  notificationRequired?: boolean;
  baselineRiskAssessments?: SafetyFileBaselineRiskAssessment[];
  taskSpecificRiskAssessments?: SafetyFileTaskRiskAssessment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SafetyFileAssignment {
  id: string;
  projectId: string;
  personnelId: string;
  siteRole: string;
  employerName?: string;
  isActive: boolean;
  assignedAt: string;
  requiredDocumentNames?: string[];
  createdAt?: string;
  updatedAt?: string;
}
