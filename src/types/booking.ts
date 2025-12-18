import type { Timestamp } from "firebase/firestore";

export interface Booking {
    id: string;
    bookingNumber: number;
    aircraftId: string;
    pilotId: string;
    instructorId?: string;
    type: 'Training Flight' | 'Private Flight' | 'Reposition Flight' | 'Maintenance Flight';
    bookingDate: string; // YYYY-MM-DD
    startTime: string;   // HH:mm
    endTime: string;     // HH:mm
    status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Cancelled with Reason';
    isOvernight?: boolean;
    overnightBookingDate?: string; // YYYY-MM-DD for the next day
    overnightEndTime?: string; // HH:mm for the end time on the next day
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
