
export interface MaintenanceLog {
  id: string;
  aircraftId: string;
  date: string; // ISO String
  description: string;
  procedure: string;
}
