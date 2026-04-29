export function parseCoordinateInput(value: string, axis: 'lat' | 'lon'): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const decimal = Number.parseFloat(trimmed);
  if (Number.isFinite(decimal) && /^[-+]?\d+(?:\.\d+)?$/.test(trimmed)) {
    return decimal;
  }

  const normalized = trimmed
    .toUpperCase()
    .replace(/[°º]/g, ' ')
    .replace(/['’`]/g, ' ')
    .replace(/["”“]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const hemisphereMatch = normalized.match(/\b([NSEW])\b/);
  const hemisphere = hemisphereMatch?.[1] ?? null;
  const numericParts = normalized.match(/[-+]?\d+(?:\.\d+)?/g);

  if (!numericParts || numericParts.length === 0) return null;

  const degrees = Number.parseFloat(numericParts[0]);
  const minutes = numericParts.length > 1 ? Number.parseFloat(numericParts[1]) : 0;
  const seconds = numericParts.length > 2 ? Number.parseFloat(numericParts[2]) : 0;

  if (![degrees, minutes, seconds].every(Number.isFinite)) return null;
  if (minutes >= 60 || seconds >= 60) return null;

  const absolute = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  const signFromDegrees = degrees < 0 ? -1 : 1;
  const signFromHemisphere =
    hemisphere === 'S' || hemisphere === 'W'
      ? -1
      : hemisphere === 'N' || hemisphere === 'E'
        ? 1
        : signFromDegrees;

  const result = absolute * signFromHemisphere;
  const max = axis === 'lat' ? 90 : 180;

  if (result < -max || result > max) return null;
  return result;
}

export function coordinatePartsToDecimal({
  axis,
  hemisphere,
  degrees,
  minutes,
  seconds,
}: {
  axis: 'lat' | 'lon';
  hemisphere?: 'N' | 'S' | 'E' | 'W';
  degrees: string;
  minutes: string;
  seconds: string;
}): number | null {
  const deg = Number.parseFloat(degrees);
  const min = Number.parseFloat(minutes || '0');
  const sec = Number.parseFloat(seconds || '0');

  if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) return null;
  if (deg < 0 || min < 0 || sec < 0) return null;
  if (min >= 60 || sec >= 60) return null;

  const max = axis === 'lat' ? 90 : 180;
  if (deg > max) return null;

  const absolute = deg + min / 60 + sec / 3600;
  const sign = hemisphere === 'S' || hemisphere === 'W' ? -1 : 1;
  const value = absolute * sign;

  if (value < -max || value > max) return null;
  return value;
}

export function formatCoordinateDms(value: number | undefined | null, axis: 'lat' | 'lon'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';

  const hemisphere =
    axis === 'lat'
      ? value < 0
        ? 'S'
        : 'N'
      : value < 0
        ? 'W'
        : 'E';

  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 60);
  let normalizedMinutes = minutes;
  let normalizedDegrees = degrees;

  if (seconds === 60) {
    seconds = 0;
    normalizedMinutes += 1;
  }

  if (normalizedMinutes === 60) {
    normalizedMinutes = 0;
    normalizedDegrees += 1;
  }

  const degreeWidth = axis === 'lat' ? 2 : 3;

  return `${hemisphere}${String(normalizedDegrees).padStart(degreeWidth, '0')} ${String(normalizedMinutes).padStart(2, '0')} ${String(seconds).padStart(2, '0')}`;
}

export function formatLatLonDms(lat: number | undefined | null, lon: number | undefined | null): string {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return '--';
  return `${formatCoordinateDms(lat, 'lat')} ${formatCoordinateDms(lon, 'lon')}`;
}
