import type { FuelType } from '@/lib/fuel';

export interface ChecklistPhoto {
    url: string;
    description: string;
}

export interface PreFlightData {
    hobbs: number;
    tacho: number;
    fuelUpliftGallons: number;
    fuelUpliftLitres: number;
    oilUplift: number;
    documentsChecked: boolean;
}

export interface PostFlightData {
    hobbs: number;
    tacho: number;
    fuelUpliftGallons: number;
    fuelUpliftLitres: number;
    oilUplift: number;
    defects: string;
    photos?: ChecklistPhoto[];
}

export type BookingStatus = 'Tentative' | 'Confirmed' | 'Approved' | 'Completed' | 'Cancelled' | 'Cancelled with Reason';

export interface MassAndBalance {
    takeoffWeight?: number;
    takeoffCg?: number;
    landingWeight?: number;
    landingCg?: number;
    isWithinLimits?: boolean;
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

export interface OverrideLog {
    userId: string;
    userName: string;
    permissionId: string;
    action: string;
    reason: string;
    timestamp: string;
}

export interface NavlogLeg {
    id: string;
    waypoint: string;
    legType?: 'waypoint' | 'reporting-point' | 'arrival-fix';
    latitude?: number;
    longitude?: number;
    altitude?: number;
    frequencies?: string;
    layerInfo?: string;
    notes?: string;
    windDirection?: number;
    windSpeed?: number;
    trueAirspeed?: number;
    trueCourse?: number;
    variation?: number;
    distance?: number;
    // Calculated
    wca?: number;
    trueHeading?: number;
    magneticHeading?: number;
    groundSpeed?: number;
    ete?: number;
    cumulativeEte?: number;
    fuelBurnPerHour?: number;
    tripFuel?: number;
}

export interface Navlog {
    legs: NavlogLeg[];
    departureIcao?: string;
    arrivalIcao?: string;
    departureLatitude?: number;
    departureLongitude?: number;
    arrivalLatitude?: number;
    arrivalLongitude?: number;
    globalTas?: number;
    globalWindDirection?: number;
    globalWindSpeed?: number;
    globalVariation?: number;
    globalFuelBurn?: number;
    globalFuelBurnUnit?: 'GPH' | 'LPH';
    globalFuelOnBoard?: number;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  type: string;
  start: string; // ISO String
  end: string; // ISO String
  date: string; // "yyyy-MM-dd"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  aircraftId: string;
  instructorId?: string;
  studentId?: string;
  createdById?: string;
  approvedById?: string;
  approvedByName?: string;
  cancellationReason?: string;
  status: BookingStatus;
  notes?: string;
  isOvernight?: boolean;
  overnightBookingDate?: string;
  overnightEndTime?: string;
  preFlight: boolean;
  postFlight: boolean;
  preFlightData?: PreFlightData;
  postFlightData?: PostFlightData;
  massAndBalance?: MassAndBalance;
  navlog?: Navlog;
  organizationId?: string | null; // Associated external company ID
  overrides?: OverrideLog[];
  landingConfirmed?: boolean;
  // Accounting fields
  accountingStatus?: 'Unbilled' | 'Exported' | 'Paid';
  invoiceReference?: string;
  totalCost?: number;
}
