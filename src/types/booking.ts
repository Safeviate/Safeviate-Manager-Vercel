import type { Timestamp } from 'firebase/firestore';

export type Booking = {
  id: string;
  aircraftId: string;
  pilotId: string;
  instructorId?: string;
  type: 'Student Training' | 'Hire and Fly';
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
};
