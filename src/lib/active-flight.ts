import { getBearing, getDistance } from '@/lib/e6b';
import type { NavlogLeg } from '@/types/booking';
import type { ActiveLegState, FlightPosition } from '@/types/flight-session';

const ARRIVAL_THRESHOLD_NM = 1;
const ON_COURSE_THRESHOLD_NM = 1.5;

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

function getCrossTrackErrorNm(
  position: FlightPosition,
  fromLeg: NavlogLeg,
  toLeg: NavlogLeg
) {
  if (
    fromLeg.latitude === undefined ||
    fromLeg.longitude === undefined ||
    toLeg.latitude === undefined ||
    toLeg.longitude === undefined
  ) {
    return undefined;
  }

  const distanceStartToAircraft = getDistance(
    { lat: fromLeg.latitude, lon: fromLeg.longitude },
    { lat: position.latitude, lon: position.longitude }
  );

  const courseStartToAircraft = getBearing(
    { lat: fromLeg.latitude, lon: fromLeg.longitude },
    { lat: position.latitude, lon: position.longitude }
  );

  const courseStartToWaypoint = getBearing(
    { lat: fromLeg.latitude, lon: fromLeg.longitude },
    { lat: toLeg.latitude, lon: toLeg.longitude }
  );

  const angularDifference = toRadians(courseStartToAircraft - courseStartToWaypoint);
  return Math.abs(Math.asin(Math.sin(distanceStartToAircraft / 3440.065) * Math.sin(angularDifference)) * 3440.065);
}

export function getActiveLegState(
  legs: NavlogLeg[],
  position: FlightPosition | null,
  preferredLegIndex?: number
): ActiveLegState | null {
  if (!position || legs.length < 2) return null;

  const validLegs = legs.filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined);
  if (validLegs.length < 2) return null;

  const maxLegIndex = validLegs.length - 2;
  const clampedPreferredLegIndex =
    preferredLegIndex !== undefined
      ? Math.max(0, Math.min(preferredLegIndex, maxLegIndex))
      : undefined;

  const currentLegIndex = clampedPreferredLegIndex ?? 0;
  const nextLegIndex = Math.min(currentLegIndex + 1, validLegs.length - 1);

  let nextLeg = validLegs[nextLegIndex];
  let fromLeg = validLegs[currentLegIndex];
  let distanceToNextNm = getDistance(
    { lat: position.latitude, lon: position.longitude },
    { lat: nextLeg.latitude!, lon: nextLeg.longitude! }
  );

  if (distanceToNextNm <= ARRIVAL_THRESHOLD_NM && currentLegIndex < maxLegIndex) {
    fromLeg = validLegs[currentLegIndex + 1];
    nextLeg = validLegs[currentLegIndex + 2];
    distanceToNextNm = getDistance(
      { lat: position.latitude, lon: position.longitude },
      { lat: nextLeg.latitude!, lon: nextLeg.longitude! }
    );
  }

  const bearingToNext = getBearing(
    { lat: position.latitude, lon: position.longitude },
    { lat: nextLeg.latitude!, lon: nextLeg.longitude! }
  );
  const groundSpeedKt = position.speedKt ?? undefined;
  const etaToNextMinutes =
    groundSpeedKt && groundSpeedKt > 0 ? (distanceToNextNm / groundSpeedKt) * 60 : undefined;
  const crossTrackErrorNm = getCrossTrackErrorNm(position, fromLeg, nextLeg);

  return {
    activeLegIndex:
      distanceToNextNm <= ARRIVAL_THRESHOLD_NM && currentLegIndex < maxLegIndex
        ? currentLegIndex + 1
        : currentLegIndex,
    fromWaypoint: fromLeg.waypoint,
    toWaypoint: nextLeg.waypoint,
    distanceToNextNm,
    bearingToNext,
    etaToNextMinutes,
    groundSpeedKt,
    crossTrackErrorNm,
    onCourse: crossTrackErrorNm !== undefined ? crossTrackErrorNm <= ON_COURSE_THRESHOLD_NM : undefined,
    hasArrived: distanceToNextNm <= ARRIVAL_THRESHOLD_NM,
  };
}
