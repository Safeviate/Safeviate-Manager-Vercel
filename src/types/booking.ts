
import type { Timestamp } from "firebase/firestore";

export interface Photo {
    url: string;
    description: string;
}

export interface Booking {
    id: string;
    bookingNumber: number;
    aircraftId: string;
    pilotId: string;
    instructorId?: string | null;
    type: 'Training Flight' | 'Private Flight' | 'Reposition Flight' | 'Maintenance Flight';
    bookingDate: string; // YYYY-MM-DD
    startTime: string;   // HH:mm
    endTime: string;     // HH:mm
    status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Cancelled with Reason';
    isOvernight?: boolean;
    overnightBookingDate?: string | null; // YYYY-MM-DD
    overnightEndTime?: string | null; // HH:mm
    // Pre-flight data
    preFlight?: {
        actualHobbs?: number;
        actualTacho?: number;
        oil?: number;
        fuel?: number;
        documentsChecked?: string[]; // e.g., ['poh', 'cors']
        photos?: Photo[];
    };
    // Post-flight data
    postFlight?: {
        actualHobbs?: number;
        actualTacho?: number;
        oil?: number;
        fuel?: number;
        photos?: Photo[];
    };
}
