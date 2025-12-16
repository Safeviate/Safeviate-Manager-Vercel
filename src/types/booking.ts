
import type { Timestamp } from 'firebase/firestore';

export type MassAndBalance = {
  calculationTime: Timestamp;
  frontSeatWeight: number;
  rearSeatWeight: number;
  baggage1Weight: number;
  baggage2Weight: number;
  fuelGallons: number;
  takeoffWeight: number;
  takeoffCg: number;
};

export type Booking = {
  id: string;
  bookingNumber?: number;
  aircraftId: string;
  pilotId: string;
  instructorId?: string;
  type: 'Student Training' | 'Hire and Fly' | 'Maintenance Flight';
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Cancelled with Reason';
  overnightId?: string;
  cancellationReason?: string;
  massAndBalance?: MassAndBalance;
};
