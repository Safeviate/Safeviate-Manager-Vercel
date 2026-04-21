import type { Aircraft } from '@/types/aircraft';
import type { PreFlightData } from '@/types/booking';

export const getAircraftHourSnapshot = (aircraft: Aircraft): PreFlightData => ({
  hobbs: aircraft.currentHobbs ?? aircraft.frameHours ?? 0,
  tacho: aircraft.currentTacho ?? aircraft.engineHours ?? 0,
  fuelUpliftGallons: 0,
  fuelUpliftLitres: 0,
  oilUplift: 0,
  documentsChecked: false,
});

export const getCompletedAircraftHourPatch = (hobbs: number, tacho: number) => ({
  currentHobbs: hobbs,
  currentTacho: tacho,
  frameHours: hobbs,
  engineHours: tacho,
});
