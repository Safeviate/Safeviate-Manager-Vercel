

export type Station = {
    id: number;
    name: string;
    weight: number;
    arm: number;
    type: 'weight' | 'fuel';
    gallons?: number;
    maxGallons?: number;
};

export type AircraftModelProfile = {
  id: string;
  profileName: string;
  emptyWeight: number;
  emptyWeightMoment: number;
  maxTakeoffWeight: number;
  maxLandingWeight: number;
  stationArms: {
    frontSeats?: number;
    rearSeats?: number;
    fuel?: number;
    baggage1?: number;
    baggage2?: number;
  };
  stations: Station[];
  cgEnvelope: {
    x: number;
    y: number;
  }[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type Aircraft = {
  id: string;
  tailNumber: string;
  model: string;
  abbreviation?: string;
  type?: "Single-Engine" | "Multi-Engine";
  frameHours?: number;
  engineHours?: number;
  initialHobbs?: number;
  currentHobbs?: number;
  initialTacho?: number;
  currentTacho?: number;
  tachoAtNext50Inspection?: number;
  tachoAtNext100Inspection?: number;
  maintenanceLogs?: string[];
  documents?: {
    name: string;
    url: string;
    uploadDate: string;
    expirationDate?: string | null;
  }[];
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
  cgEnvelope?: {
    weight: number;
    cg: number;
  }[];
};
