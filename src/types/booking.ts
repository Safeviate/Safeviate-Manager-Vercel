export type BookingStatus = 'Tentative' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Booking {
  id: string;
  title: string;
  start: string; // ISO String
  end: string; // ISO String
  resourceId: string; // e.g., aircraftId
  instructorId?: string;
  studentId?: string;
  status: BookingStatus;
  notes?: string;

  // for spi calculation
  date: string; // "yyyy-MM-dd"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  postFlight?: boolean;
}
