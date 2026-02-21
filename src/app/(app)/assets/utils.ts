import type { Aircraft } from './aircraft-type';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';
import React from 'react';

export function getInspectionBadgeStyle(
  aircraft: Aircraft,
  type: '50hr' | '100hr',
  inspectionSettings: AircraftInspectionWarningSettings | null | undefined
): React.CSSProperties | undefined {
  if (!inspectionSettings || aircraft.currentTacho === undefined || aircraft.currentTacho === null) {
    return undefined;
  }

  const tachoDue = type === '50hr' ? aircraft.tachoAtNext50Inspection : aircraft.tachoAtNext100Inspection;

  if (tachoDue === undefined || tachoDue === null) {
    return undefined;
  }

  const hoursRemaining = tachoDue - aircraft.currentTacho;
  
  const warnings = type === '50hr' ? inspectionSettings.fiftyHourWarnings : inspectionSettings.oneHundredHourWarnings;

  if (!warnings || !Array.isArray(warnings)) {
    return undefined;
  }

  // Settings are assumed to be sorted high to low by hours. Find the first threshold that is met.
  for (const warning of warnings) {
    if (hoursRemaining <= warning.hours) {
      return {
        backgroundColor: warning.color,
        color: warning.foregroundColor || 'white', // provide a fallback
      };
    }
  }

  return undefined; // No specific warning color, use default styles
}
