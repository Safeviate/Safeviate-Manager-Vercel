export interface VehicleDocument {
  name: string;
  url: string;
  uploadDate: string;
  expirationDate?: string | null;
  abbreviation?: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  registrationNumber: string;
  type?: 'Car' | 'Truck' | 'Van' | 'Bus' | 'Utility' | 'Other';
  vin?: string;
  currentOdometer?: number;
  nextServiceDueDate?: string | null;
  nextServiceDueOdometer?: number | null;
  organizationId?: string | null;
  documents?: VehicleDocument[];
}
