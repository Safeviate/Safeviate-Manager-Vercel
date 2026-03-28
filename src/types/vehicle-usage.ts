export type VehicleUsageStatus = 'Booked Out' | 'Booked In';

export interface VehicleUsageRecord {
  id: string;
  vehicleId: string;
  vehicleRegistrationNumber: string;
  vehicleLabel: string;
  status: VehicleUsageStatus;
  bookedOutAt: string;
  bookedOutById: string;
  bookedOutByName: string;
  bookedOutOdometer: number;
  purpose?: string;
  destination?: string;
  notes?: string;
  bookedInAt?: string | null;
  bookedInById?: string | null;
  bookedInByName?: string | null;
  bookedInOdometer?: number | null;
  returnNotes?: string;
  createdAt: string;
  updatedAt: string;
}
