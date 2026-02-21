
'use client';

import type { HourWarning } from '@/types/inspection';

export const getInspectionStatusStyle = (
  currentTacho: number | undefined,
  nextInspectionTacho: number | undefined,
  warnings: HourWarning[] | undefined
): { backgroundColor: string; color: string; } | null => {
  if (typeof currentTacho !== 'number' || typeof nextInspectionTacho !== 'number' || !warnings || warnings.length === 0) {
    return null;
  }

  const hoursRemaining = nextInspectionTacho - currentTacho;

  // Sort warnings by hours ascending to find the most urgent applicable one first.
  const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);

  if (hoursRemaining < 0) {
    // Overdue, use the color of the most urgent warning (the one with the lowest hour count).
    const mostUrgent = sortedWarnings[0];
    return {
        backgroundColor: mostUrgent?.color || '#ef4444',
        color: mostUrgent?.foregroundColor || '#ffffff'
    };
  }

  for (const warning of sortedWarnings) {
    if (hoursRemaining <= warning.hours) {
      return { backgroundColor: warning.color, color: warning.foregroundColor };
    }
  }

  return null; // No warning threshold met, so no special color.
};
