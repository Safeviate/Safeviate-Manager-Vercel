export type WorkpackStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_INSPECTION' | 'CLOSED';

export interface Workpack {
  id: string;
  trackingNumber: string; // e.g., "WP-2026-001"
  aircraftId: string; // Reference to the aircraft
  title: string; // e.g., "100-Hour Inspection"
  description?: string;
  status: WorkpackStatus;
  
  openedAt?: string; // ISO string 
  closedAt?: string; // ISO string
  
  createdAt?: any; // Firestore ServerTimestamp
  updatedAt?: any; // Firestore ServerTimestamp
}

export type TaskRole = 'MECHANIC' | 'INSPECTOR';

export interface TaskSignature {
  id: string;
  signatoryUserId: string; // User ID
  role: TaskRole;
  signatureImage: string; // Base64 PNG
  timestamp: any; // ServerTimestamp
  authMethod: string; // "PIN_VALIDATED"
}

export interface MediaAttachment {
  id: string; // usually URL or unique ID
  url: string;
  type: 'IMAGE' | 'PDF';
  name: string;
}

export interface TaskCard {
  id: string;
  workpackId: string;
  taskNumber: string; // e.g., "TC-001"
  taskDescription: string;
  toolsUsed: string[]; // Array of Tool IDs 
  partsInstalled: { partNumber: string; serialNumber: string; quantity: number }[];
  isCompleted: boolean;
  
  // Advanced tracking
  requiresInspector?: boolean; // Required Inspection Item (RII)
  isInspected?: boolean; // Second signature lock
  attachments?: MediaAttachment[]; // Media files
  
  // Audit timestamps (written by task-card-item.tsx on sign-off)
  completedAt?: any; // Firestore ServerTimestamp
  inspectedAt?: any; // Firestore ServerTimestamp
  createdAt?: any; // Firestore ServerTimestamp
  
  // Signatures will be saved as a sub-collection for security purposes.
}
