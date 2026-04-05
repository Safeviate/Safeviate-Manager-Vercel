import { differenceInDays } from 'date-fns';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';

export type DocumentExpiryWarningPeriod = {
  period: number;
  color: string;
};

export type DocumentExpirySettingsLike = {
  defaultColor?: string;
  expiredColor?: string;
  warningPeriods?: DocumentExpiryWarningPeriod[];
};

export function getContrastingTextColor(hexColor: string) {
  const normalized = hexColor.replace('#', '');
  if (normalized.length !== 6) {
    return '#ffffff';
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.62 ? '#0f172a' : '#ffffff';
}

export function getDocumentExpiryColor(
  expirationDate: string | null | undefined,
  settings?: DocumentExpirySettingsLike | null
): string | null {
  if (!expirationDate || !settings) return null;

  const today = new Date();
  const expiry = new Date(expirationDate);
  const daysUntilExpiry = differenceInDays(expiry, today);

  if (daysUntilExpiry < 0) {
    return settings.expiredColor || '#ef4444';
  }

  const sortedPeriods = [...(settings.warningPeriods || [])].sort(
    (a, b) => a.period - b.period
  );

  for (const warning of sortedPeriods) {
    if (daysUntilExpiry <= warning.period) {
      return warning.color;
    }
  }

  return settings.defaultColor || null;
}

export function getDocumentExpiryBadgeStyle(
  expirationDate: string | null | undefined,
  settings?: DocumentExpirySettingsLike | null
) {
  const color = getDocumentExpiryColor(expirationDate, settings);

  if (!color) {
    return null;
  }

  return {
    borderColor: color,
    color,
    backgroundColor: color,
  };
}

function getInspectionWarnings(
  settings: AircraftInspectionWarningSettings | null | undefined,
  type: '50' | '100'
): HourWarning[] {
  if (!settings) return [];
  return type === '50'
    ? [...(settings.fiftyHourWarnings || [])]
    : [...(settings.oneHundredHourWarnings || [])];
}

export function getInspectionWarningStyle(
  remainingHours: number,
  type: '50' | '100',
  settings?: AircraftInspectionWarningSettings | null
) {
  if (remainingHours < 0) {
    return {
      backgroundColor: '#ef4444',
      color: '#ffffff',
      borderColor: '#ef4444',
    };
  }

  const warnings = getInspectionWarnings(settings, type).sort(
    (a, b) => a.hours - b.hours
  );

  for (const warning of warnings) {
    if (remainingHours <= warning.hours) {
      return {
        backgroundColor: warning.color,
        color: warning.foregroundColor,
        borderColor: warning.color,
      };
    }
  }

  return null;
}
