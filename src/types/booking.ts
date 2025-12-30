

import type { Timestamp } from "firebase/firestore";

export interface Photo {
    url: string;
    description: string;
}

export interface MassAndBalance {
    // An object where each key is the camelCase name of a station,
    // and the value is an object containing the weight and moment for that station.
    [station: string]: {
        weight: number;
        moment: number;
    };
}

export interface Booking {
    id: string;
    bookingNumber: number;
    aircraftId: string;
    createdById?: string; // The user ID of the person who created the booking.
    studentId?: string | null; // For training flights
    instructorId?: string | null; // For training flights
    privatePilotId?: string | null; // For private flights
    type: 'Training Flight' | 'Private Flight' | 'Reposition Flight' | 'Maintenance Flight';
    date: string; // YYYY-MM-DD
    startTime: string;   // HH:mm
    endTime: string;     // HH:mm
    status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Cancelled with Reason';
    cancellationReason?: string;
    isOvernight?: boolean;
    overnightBookingDate?: string | null; // YYYY-MM-DD
    overnightEndTime?: string | null; // HH:mm
    flightPlanId?: string; // Link to a flight plan document
    flightDetails?: string; // From Gemini Logbook
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
    // Mass and Balance data
    massAndBalance?: MassAndBalance;
}
