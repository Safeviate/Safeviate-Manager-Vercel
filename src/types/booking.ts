export type BookingStatus = 'Tentative' | 'Confirmed' | 'Approved' | 'Completed' | 'Cancelled' | 'Cancelled with Reason';

export interface MassAndBalance {
    takeoffWeight?: number;
    takeoffCg?: number;
    landingWeight?: number;
    landingCg?: number;
    isWithinLimits?: boolean;
    stations?: {
        id: number;
        name: string;
        weight: number;
        arm: number;
        type: string;
        gallons?: number;
        maxGallons?: number;
    }[];
}

export interface ChecklistPhoto {
    url: string;
    description: string;
}

export interface PreFlightData {
    hobbs: number;
    tacho: number;
    fuelUplift: number;
    oilUplift: number;
    documentsChecked: boolean;
}

export interface PostFlightData {
    hobbs: number;
    tacho: number;
    fuelUplift: number;
    defects: string;
    photos?: ChecklistPhoto[];
}

export interface OverrideLog {
    userId: string;
    userName: string;
    permissionId: string;
    action: string;
    reason: string;
    timestamp: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  type: string;
  start: string; // ISO String
  end: string; // ISO String
  date: string; // "yyyy-MM-dd"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  aircraftId: string;
  instructorId?: string;
  studentId?: string;
  createdById?: string;
  approvedById?: string;
  approvedByName?: string;
  cancellationReason?: string;
  status: BookingStatus;
  notes?: string;
  isOvernight?: boolean;
  overnightBookingDate?: string;
  overnightEndTime?: string;
  preFlight: boolean;
  postFlight: boolean;
  preFlightData?: PreFlightData;
  postFlightData?: PostFlightData;
  massAndBalance?: MassAndBalance;
  organizationId?: string | null; // Associated external company ID
  overrides?: OverrideLog[];
}
