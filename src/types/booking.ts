
export type BookingStatus = 'Tentative' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Cancelled with Reason';

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
  status: BookingStatus;
  notes?: string;
  isOvernight?: boolean;
  overnightBookingDate?: string;
  overnightEndTime?: string;
  preFlight?: boolean;
  postFlight?: boolean;
}
