import type { NavlogLeg } from '@/types/booking';
import { calculateEte, calculateFuelRequired, calculateWindTriangle, getBearing, getDistance, getMagneticVariation } from '@/lib/e6b';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global flight parameters used to recalculate all navlog legs.
 */
export interface FlightParams {
  /** True airspeed in knots */
  tas: number;
  /** Wind direction in degrees (from) — global default */
  windDirection: number;
  /** Wind speed in knots — global default */
  windSpeed: number;
  /** Fuel burn rate per hour (GPH or LPH, depending on unit selection) */
  fuelBurnPerHour: number;
  /** Fuel on board at departure in gallons/litres (pilot-entered) */
  fuelOnBoard: number;
}

export const DEFAULT_FLIGHT_PARAMS: FlightParams = {
  tas: 100,
  windDirection: 0,
  windSpeed: 0,
  fuelBurnPerHour: 8.5,
  fuelOnBoard: 34,
};

export function createNavlogLegFromCoordinates(
  existingLegs: NavlogLeg[],
  lat: number,
  lon: number,
  identifier = 'WP',
  frequencies?: string,
  layerInfo?: string
): NavlogLeg {
  const lastLeg = existingLegs[existingLegs.length - 1];
  let distance = 0;
  let trueCourse = 0;
  let magneticHeading = 0;
  const variation = getMagneticVariation(lat, lon);

  if (lastLeg?.latitude !== undefined && lastLeg?.longitude !== undefined) {
    const start = { lat: lastLeg.latitude, lon: lastLeg.longitude };
    const end = { lat, lon };
    distance = getDistance(start, end);
    trueCourse = getBearing(start, end);
    const triangle = calculateWindTriangle({
      trueCourse,
      trueAirspeed: 100,
      windDirection: 0,
      windSpeed: 0,
    });
    magneticHeading = (triangle.heading - variation + 360) % 360;
  }

  const ete = lastLeg ? calculateEte(distance, 100) : 0;
  const tripFuel = lastLeg ? calculateFuelRequired(ete, 8.5) : 0;

  return {
    id: uuidv4(),
    waypoint: `${identifier}-${existingLegs.length + 1}`,
    latitude: lat,
    longitude: lon,
    distance,
    trueCourse,
    magneticHeading,
    variation,
    altitude: 3500,
    frequencies,
    layerInfo,
    ete,
    tripFuel,
  };
}

/**
 * Full E6B recalculation engine.
 * Takes raw legs + global flight params and produces fully-calculated legs
 * with WCA, TH, GS, ETE (from GS), cumulative ETE, fuel per leg, and fuel remaining.
 * 
 * Per-leg wind overrides: if a leg has its own windDirection/windSpeed set, those
 * values are used instead of the global defaults. Same for trueAirspeed.
 */
export function recalculateNavlogLegs(
  legs: NavlogLeg[],
  params: FlightParams
): NavlogLeg[] {
  let cumulativeEte = 0;
  let fuelRemaining = params.fuelOnBoard;

  return legs.map((leg, index) => {
    // First leg (departure) has no distance/course — it's the origin
    if (index === 0 && (leg.distance === undefined || leg.distance === 0)) {
      return {
        ...leg,
        wca: 0,
        trueHeading: 0,
        magneticHeading: 0,
        groundSpeed: 0,
        ete: 0,
        cumulativeEte: 0,
        tripFuel: 0,
        fuelBurnPerHour: params.fuelBurnPerHour,
        trueAirspeed: leg.trueAirspeed ?? params.tas,
        windDirection: leg.windDirection ?? params.windDirection,
        windSpeed: leg.windSpeed ?? params.windSpeed,
        variation: leg.variation ?? getMagneticVariation(leg.latitude ?? 0, leg.longitude ?? 0),
      };
    }

    const tc = leg.trueCourse ?? 0;
    const tas = leg.trueAirspeed ?? params.tas;
    const wd = leg.windDirection ?? params.windDirection;
    const ws = leg.windSpeed ?? params.windSpeed;
    const variation = leg.variation ?? getMagneticVariation(leg.latitude ?? 0, leg.longitude ?? 0);

    // Solve the wind triangle
    const triangle = calculateWindTriangle({
      trueCourse: tc,
      trueAirspeed: tas,
      windDirection: wd,
      windSpeed: ws,
    });

    const gs = triangle.groundSpeed;
    const ete = calculateEte(leg.distance ?? 0, gs);
    const fuel = calculateFuelRequired(ete, params.fuelBurnPerHour);
    cumulativeEte += ete;
    fuelRemaining -= fuel;

    const magneticHeading = (triangle.heading - variation + 360) % 360;

    return {
      ...leg,
      trueAirspeed: tas,
      windDirection: wd,
      windSpeed: ws,
      variation,
      wca: triangle.windCorrectionAngle,
      trueHeading: triangle.heading,
      magneticHeading,
      groundSpeed: gs,
      ete,
      cumulativeEte,
      tripFuel: fuel,
      fuelBurnPerHour: params.fuelBurnPerHour,
    };
  });
}

export interface RouteTotals {
  distance: number;
  ete: number;
  fuel: number;
  fuelRemaining: number;
  enduranceRemaining: number;
  groundSpeed: number;
}

export function calculateRouteTotals(legs: NavlogLeg[], params?: FlightParams): RouteTotals {
  const distance = legs.reduce((sum, leg) => sum + (leg.distance || 0), 0);
  const ete = legs.reduce((sum, leg) => sum + (leg.ete || 0), 0);
  const fuel = legs.reduce((sum, leg) => sum + (leg.tripFuel || 0), 0);
  const avgGs = ete > 0 ? (distance / ete) * 60 : 0;
  const fob = params?.fuelOnBoard ?? 0;
  const fuelRemaining = fob - fuel;
  const burnRate = params?.fuelBurnPerHour ?? 1;
  const enduranceRemaining = burnRate > 0 ? fuelRemaining / burnRate : 0;

  return {
    distance,
    ete,
    fuel,
    fuelRemaining,
    enduranceRemaining,
    groundSpeed: avgGs,
  };
}
