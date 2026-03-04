
export interface MaintenanceLog {
    id: string;
    aircraftId: string;
    maintenanceType: string;
    date: string; // ISO String
    details: string;
    ameNo: string;
    amoNo: string;
}
