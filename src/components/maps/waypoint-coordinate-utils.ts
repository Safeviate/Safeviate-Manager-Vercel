export type CoordinateAxis = 'lat' | 'lon';

const axisLimits: Record<CoordinateAxis, number> = {
  lat: 90,
  lon: 180,
};

const axisWidths: Record<CoordinateAxis, number> = {
  lat: 2,
  lon: 3,
};

const axisHemisphere: Record<CoordinateAxis, [string, string]> = {
  lat: ['N', 'S'],
  lon: ['E', 'W'],
};

const normalizeText = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[°º]/g, ' ')
    .replace(/[′’']/g, ' ')
    .replace(/[″”"]/g, ' ')
    .replace(/[;,/]/g, ' ')
    .replace(/\s+/g, ' ');

const normalizeSeconds = (degrees: number, minutes: number, seconds: number) => {
  let nextDegrees = degrees;
  let nextMinutes = minutes;
  let nextSeconds = seconds;

  if (nextSeconds >= 59.995) {
    nextSeconds = 0;
    nextMinutes += 1;
  }

  if (nextMinutes >= 60) {
    nextMinutes = 0;
    nextDegrees += 1;
  }

  return { degrees: nextDegrees, minutes: nextMinutes, seconds: nextSeconds };
};

export const formatCoordinateDms = (value: number, axis: CoordinateAxis) => {
  if (!Number.isFinite(value)) return 'N/A';

  const hemisphere = value < 0 ? axisHemisphere[axis][1] : axisHemisphere[axis][0];
  const absValue = Math.abs(value);
  const degrees = Math.floor(absValue);
  const minuteFloat = (absValue - degrees) * 60;
  const minutes = Math.floor(minuteFloat);
  const seconds = Number((((minuteFloat - minutes) * 60)).toFixed(2));
  const normalized = normalizeSeconds(degrees, minutes, seconds);

  const degreeText = String(normalized.degrees).padStart(axisWidths[axis], '0');
  const minuteText = String(normalized.minutes).padStart(2, '0');
  const secondText = normalized.seconds.toFixed(2).padStart(5, '0');
  return `${degreeText}°${minuteText}'${secondText}"${hemisphere}`;
};

export const formatWaypointCoordinatesDms = (latitude?: number | null, longitude?: number | null) => {
  if (latitude == null || longitude == null) return 'N/A';
  return `${formatCoordinateDms(latitude, 'lat')} / ${formatCoordinateDms(longitude, 'lon')}`;
};

export const parseCoordinateDms = (value: string, axis: CoordinateAxis) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const hemisphere = normalized.match(/[NSEW]/)?.[0] ?? null;
  const tokens = normalized.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (tokens.length === 0) return null;

  const negative = normalized.startsWith('-') || hemisphere === axisHemisphere[axis][1];
  const positive = hemisphere === axisHemisphere[axis][0];
  const sign = negative && !positive ? -1 : 1;

  let decimal = 0;
  if (tokens.length === 1) {
    decimal = Math.abs(tokens[0]);
  } else {
    const degrees = Math.abs(tokens[0] ?? 0);
    const minutes = Math.abs(tokens[1] ?? 0);
    const seconds = Math.abs(tokens[2] ?? 0);
    decimal = degrees + minutes / 60 + seconds / 3600;
  }

  const signed = decimal * sign;
  if (Math.abs(signed) > axisLimits[axis]) return null;
  return signed;
};

export const parseWaypointCoordinatesDms = (latitudeInput: string, longitudeInput: string) => {
  const latitude = parseCoordinateDms(latitudeInput, 'lat');
  const longitude = parseCoordinateDms(longitudeInput, 'lon');
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
};
