
export type AlertType = 'Red Tag' | 'Yellow Tag' | 'Company Notice';
export type AlertStatus = 'Active' | 'Archived';

export interface ReadReceipt {
    userId: string;
    userName: string;
    readAt: string; // ISO String
}

export interface Alert {
    id: string;
    type: AlertType;
    title: string;
    content: string;
    createdAt: string; // ISO String
    createdBy: string;
    status: AlertStatus;
    signatureUrl?: string;
    mustRead?: boolean;
    readBy?: ReadReceipt[];
}
