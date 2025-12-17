import type { Timestamp } from "firebase/firestore";

export interface Booking {
    id: string;
    bookingNumber: number;
    aircraftId: string;
    pilotId: string;
    instructorId?: string;
    type: 'Training Flight' | 'Private Flight' | 'Reposition Flight' | 'Maintenance Flight';
    startTime: Timestamp;
    endTime: Timestamp;
    status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Cancelled with Reason';
    // Pre-flight data
    preFlight?: {
        actualHobbs?: number;
        actualTacho?: number;
        oil?: number;
        fuel?: number;
        oilLeft?: number;
        oilRight?: number;
        documentsChecked?: string[]; // e.g., ['poh', 'cors']
    };
    // Post-flight data
    postFlight?: {
        actualHobbs?: number;
        actualTacho?: number;
        oil?: number;
        fuel?: number;
        oilLeft?: number;
        oilRight?: number;
    };
}
