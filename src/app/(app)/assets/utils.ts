import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';

export const getInspectionBadgeStyle = (
  currentTacho: number | undefined,
  nextInspectionTacho: number | undefined,
  settings: HourWarning[] | undefined
): React.CSSProperties => {
  if (currentTacho === undefined || nextInspectionTacho === undefined || !settings) {
    return {};
  }

  const hoursRemaining = nextInspectionTacho - currentTacho;
  if (hoursRemaining < 0) {
    // Default to a noticeable 'overdue' color if not defined in settings
    return { backgroundColor: '#dc2626', color: 'white' };
  }

  // Settings are assumed to be sorted high to low. Find the first threshold that is met.
  for (const warning of settings) {
    if (hoursRemaining <= warning.hours) {
      return {
        backgroundColor: warning.color,
        color: warning.foregroundColor,
      };
    }
  }

  return {}; // No warning threshold met, use default badge style
};
