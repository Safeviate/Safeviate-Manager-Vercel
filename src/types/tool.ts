export type ToolStatus =
  | 'CALIBRATED'
  | 'OUT_OF_CALIBRATION'
  | 'REFERENCE_ONLY'
  | 'DAMAGED'
  | 'LOST';

export type ToolOwnerType = 'COMPANY' | 'CLIENT' | 'EMPLOYEE';

export interface Tool {
  id: string; // Document ID
  name: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber: string;
  assetTag?: string;
  
  ownerId?: string; // Company ID, Client ID, or Employee ID
  ownerType: ToolOwnerType;
  currentLocation?: string;
  assignedTo?: string; // User ID
  
  status: ToolStatus;
  
  lastCalibrationDate?: string; // ISO String
  calibrationIntervalMonths?: number;
  nextCalibrationDueDate?: string; // ISO String
  calibratingAuthority?: string;
  traceabilityStandard?: string;
  calibrationCertificateUrl?: string;
  
  createdAt?: string; // ISO String
  updatedAt?: string; // ISO String
}
