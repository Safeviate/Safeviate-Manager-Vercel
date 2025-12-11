import type { Timestamp } from 'firebase/firestore';

export type Booking = {
  id: string;
  bookingNumber?: number;
  aircraftId: string;
  pilotId: string;
  instructorId?: string;
  type: 'Student Training' | 'Hire and Fly';
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Cancelled with Reason';
  overnightId?: string;
  cancellationReason?: string;
};
