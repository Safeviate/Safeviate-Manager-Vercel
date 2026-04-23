import type { FuelType } from '@/lib/fuel';
export type { MaintenanceLog } from './maintenance';

export interface AircraftMaintenanceWindow {
    id: string;
    title: string;
    fromDate: string; // yyyy-MM-dd
    toDate: string; // yyyy-MM-dd
    notes?: string;
    status?: 'Scheduled' | 'In Progress' | 'Completed';
}

export interface AircraftDefect {
    id: string;
    title: string;
    details: string;
    categoryId: string;
    categoryLabel: string;
    ataLabel: string;
    componentId?: string;
    componentName?: string;
    componentSerialNumber?: string;
    status: 'Open' | 'Deferred' | 'Cleared';
    grounded: boolean;
    reportedAt: string; // ISO String
    rectifiedAt?: string;
    rectificationAction?: string;
    rectificationReference?: string;
    rectifiedByName?: string;
    rectifiedByLicense?: string;
    rectifiedByOrganisation?: string;
    returnToServiceRecorded?: boolean;
    returnToServiceBy?: string;
    returnToServiceReference?: string;
    linkedMaintenanceLogId?: string;
    source?: 'manual' | 'post-flight';
}

export interface AircraftComponent {
    id: string;
    manufacturer: string;
    name: string;
    ataChapter?: string;
    partNumber: string;
    serialNumber: string;
    installDate: string; // ISO String
    installHours: number;
    overhaulHours?: number;
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
    maintenanceWindows?: AircraftMaintenanceWindow[];
    defects?: AircraftDefect[];
    organizationId?: string | null; // Associated external company ID
    hourlyRate?: number; // Added for accounting
    fuelEnduranceHours?: number;
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
        fuelType?: FuelType;
        densityLbPerGallon?: number;
    }[];
    cgEnvelope?: {
        weight: number;
        cg: number;
    }[];
}

export interface AircraftModelProfile {
    id: string;
    profileName: string;
    emptyWeight: number;
    emptyWeightMoment: number;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    cgEnvelope: {
        x: number;
        y: number;
    }[];
    stations?: {
        id: number;
        name: string;
        weight: number;
        arm: number;
        type: string;
        gallons?: number;
        maxGallons?: number;
        fuelType?: FuelType;
        densityLbPerGallon?: number;
    }[];
}
