export type FlightSessionStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface FlightPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  speedKt?: number | null;
  headingTrue?: number | null;
  timestamp: string;
}

export interface DeviceBinding {
  deviceId: string;
  deviceLabel?: string;
  registeredAt: string;
}

export interface FlightSession {
  id: string;
  pilotId: string;
  pilotName: string;
  aircraftId: string;
  aircraftRegistration: string;
  bookingId?: string;
  status: FlightSessionStatus;
  deviceId: string;
  deviceLabel?: string;
  activeLegIndex?: number;
  startedAt?: string;
  endedAt?: string;
  updatedAt: string;
  lastPosition?: FlightPosition;
  distanceToNextNm?: number;
  bearingToNext?: number;
  etaToNextMinutes?: number;
  groundSpeedKt?: number;
}

export interface ActiveLegState {
  activeLegIndex: number;
  distanceToNextNm?: number;
  bearingToNext?: number;
  etaToNextMinutes?: number;
  groundSpeedKt?: number;
}
