
'use client';
import { cn } from '@/lib/utils';
import type { Aircraft } from '@/types/aircraft';

export type AircraftInspectionWarning = {
  hours: number;
  color: string;
};

export type AircraftInspectionWarningSettings = {
    id: string;
    warnings: AircraftInspectionWarning[];
};


export const getInspectionStatus = (aircraft: Aircraft, settings: AircraftInspectionWarningSettings | null | undefined) => {
    const defaultStatus = { hoursRemaining: null, colorClass: '', label: 'N/A' };
    if (!aircraft.currentTacho || !aircraft.tachoAtNext100Inspection) {
        return defaultStatus;
    }

    const hoursToNext = aircraft.tachoAtNext100Inspection - aircraft.currentTacho;
    
    if (hoursToNext <= 0) {
        return {
            hoursRemaining: hoursToNext,
            colorClass: settings?.warnings.find(w => w.hours === 0)?.color || 'bg-red-500 text-white',
            label: 'Due'
        }
    }

    const sortedWarnings = settings?.warnings.sort((a,b) => a.hours - b.hours) || [];
    
    for (const warning of sortedWarnings) {
        if (hoursToNext <= warning.hours) {
            return {
                hoursRemaining: hoursToNext,
                colorClass: warning.color,
                label: `${hoursToNext.toFixed(1)} hrs`
            }
        }
    }
    
    // Default if no warning thresholds met
    return {
        hoursRemaining: hoursToNext,
        colorClass: 'bg-green-500 text-white',
        label: `${hoursToNext.toFixed(1)} hrs`
    };
};
