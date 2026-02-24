

export type BookingStatus = 'Tentative' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface ChecklistPhoto {
    url: string;
    description: string;
}

export interface PreFlightData {
    hobbs: number;
    tacho: number;
    fuelOnBoard: number;
    oilUplift: number;
    documentsChecked: boolean;
}

export interface PostFlightData {
    hobbs: number;
    tacho: number;
    fuelRemaining: number;
    defects: string;
    photos: ChecklistPhoto[];
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
  createdBy?: string;
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
}
