
import type { Timestamp } from 'firebase/firestore';

export type MassAndBalance = {
    totalWeight: number;
    totalCg: number;
    isSafe: boolean;
    calculationDate: Timestamp;
    stations: {
        id: number;
        name: string;
        weight: number;
        arm: number;
        type: string;
        gallons?: number;
        maxGallons?: number;
    }[];
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
