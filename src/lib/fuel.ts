export type FuelType = 'AVGAS' | 'JET_A1' | 'JET_A' | 'MOGAS';

export const LITRES_PER_GALLON = 3.78541;
export const KG_PER_POUND = 0.45359237;

export const FUEL_PRESETS: Record<FuelType, { label: string; densityLbPerGallon: number }> = {
  AVGAS: { label: 'Avgas', densityLbPerGallon: 6.0 },
  JET_A1: { label: 'Jet A-1', densityLbPerGallon: 6.7 },
  JET_A: { label: 'Jet A', densityLbPerGallon: 6.7 },
  MOGAS: { label: 'Mogas', densityLbPerGallon: 6.0 },
};

export const getFuelPreset = (fuelType?: string) => {
  const normalized = (fuelType || 'AVGAS') as FuelType;
  return FUEL_PRESETS[normalized] || FUEL_PRESETS.AVGAS;
};

export const gallonsToLitres = (gallons: number) => gallons * LITRES_PER_GALLON;
export const poundsToKilograms = (pounds: number) => pounds * KG_PER_POUND;
export const calculateFuelWeight = (gallons: number, densityLbPerGallon: number) => gallons * densityLbPerGallon;
export const calculateFuelGallonsFromWeight = (weight: number, densityLbPerGallon: number) => (
  densityLbPerGallon > 0 ? weight / densityLbPerGallon : 0
);
