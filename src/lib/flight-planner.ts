import type { NavlogLeg } from '@/types/booking';
import { calculateEte, calculateFuelRequired, calculateWindTriangle, getBearing, getDistance, getMagneticVariation } from '@/lib/e6b';
import { v4 as uuidv4 } from 'uuid';

export function createNavlogLegFromCoordinates(
  existingLegs: NavlogLeg[],
  lat: number,
  lon: number,
  identifier = 'WP'
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
    ete,
    tripFuel,
  };
}

export function calculateRouteTotals(legs: NavlogLeg[]) {
  return {
    distance: legs.reduce((sum, leg) => sum + (leg.distance || 0), 0),
    ete: legs.reduce((sum, leg) => sum + (leg.ete || 0), 0),
    fuel: legs.reduce((sum, leg) => sum + (leg.tripFuel || 0), 0),
  };
}
