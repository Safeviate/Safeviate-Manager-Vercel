
export interface AircraftComponent {
    id: string;
    manufacturer: string;
    name: string;
    partNumber: string;
    serialNumber: string;
    installDate: string; // ISO String
    installHours: number;
    maxHours: number;
    notes: string;
    tsn: number;
    tso: number;
    totalTime: number;
}

export interface Aircraft {
    id: string;
    make: string;
    model: string;
    tailNumber: string;
    abbreviation?: string;
    type?: 'Single-Engine' | 'Multi-Engine';
    frameHours?: number;
    engineHours?: number;
    initialHobbs?: number;
    currentHobbs?: number;
    initialTacho?: number;
    currentTacho?: number;
    tachoAtNext50Inspection?: number;
    tachoAtNext100Inspection?: number;
    maintenanceLogs?: string[];
    organizationId?: string | null; // Associated external company ID
    documents?: {
        name: string;
        url: string;
        uploadDate: string;
        expirationDate?: string | null;
        abbreviation?: string;
    }[];
    components?: AircraftComponent[];
    emptyWeight?: number;
    emptyWeightMoment?: number;
    maxTakeoffWeight?: number;
    maxLandingWeight?: number;
    stationArms?: {
        frontSeats?: number;
        rearSeats?: number;
        fuel?: number;
        baggage1?: number;
        baggage2?: number;
    };
    stations?: {
        id: number;
        name: string;
        weight: number;
        arm: number;
        type: string;
        gallons?: number;
        maxGallons?: number;
    }[];
    cgEnvelope?: {
        weight: number;
        cg: number;
    }[];
}
