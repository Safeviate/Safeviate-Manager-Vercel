
import type { Timestamp } from "firebase/firestore";

export interface Photo {
    url: string;
    description: string;
}

export interface MassAndBalance {
    stationWeights: { [stationId: string]: number };
    totalWeight: number;
    totalMoment: number;
    centerOfGravity: number;
    isWithinLimits: boolean;
    calculatedAt: string; // ISO string
}

export interface Booking {
    id: string;
    bookingNumber: number;
    aircraftId: string;
    pilotId?: string | null; // For private/reposition/maintenance flights
    studentId?: string | null; // For training flights
    instructorId?: string | null; // For training flights
    type: 'Training Flight' | 'Private Flight' | 'Reposition Flight' | 'Maintenance Flight';
    bookingDate: string; // YYYY-MM-DD
    startTime: string;   // HH:mm
    endTime: string;     // HH:mm
    status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Cancelled with Reason';
    cancellationReason?: string;
    isOvernight?: boolean;
    overnightBookingDate?: string | null; // YYYY-MM-DD
    overnightEndTime?: string | null; // HH:mm
    flightPlanId?: string; // Link to a flight plan document
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

    