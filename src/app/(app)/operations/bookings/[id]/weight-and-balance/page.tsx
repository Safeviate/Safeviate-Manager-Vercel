
'use client';

import { use, useMemo, useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface WeightAndBalancePageProps {
    params: { id: string };
}

const FUEL_WEIGHT_PER_GALLON = 6; // lbs

// --- Calculation Row Component ---
const CalcRow = ({ label, weight, arm, moment, isSubtotal = false }: { label: string, weight?: string, arm?: string, moment?: string, isSubtotal?: boolean }) => (
    <div className={`grid grid-cols-4 items-center gap-2 ${isSubtotal ? 'font-bold bg-muted/20' : ''}`}>
        <div className="p-2 border-r">{label}</div>
        <div className="p-2 border-r text-right">{weight}</div>
        <div className="p-2 border-r text-right">{arm}</div>
        <div className="p-2 text-right">{moment}</div>
    </div>
);

const InputRow = ({ label, weight, onWeightChange, arm }: { label: string, weight: number, onWeightChange: (val: number) => void, arm?: number }) => (
    <div className="grid grid-cols-4 items-center gap-2">
        <div className="p-2 border-r">{label}</div>
        <div className="p-2 border-r">
            <Input type="number" value={weight || ''} onChange={e => onWeightChange(Number(e.target.value))} className="h-8 text-right bg-background" />
        </div>
        <div className="p-2 border-r text-right">{arm?.toFixed(2) || ''}</div>
        <div className="p-2 text-right">{(weight * (arm || 0)).toFixed(1)}</div>
    </div>
);

const FuelInputRow = ({ label, gallons, onGallonsChange, arm, isNegative = false }: { label: string, gallons: number, onGallonsChange: (val: number) => void, arm?: number, isNegative?: boolean }) => {
    const weight = gallons * FUEL_WEIGHT_PER_GALLON * (isNegative ? -1 : 1);
    const moment = weight * (arm || 0);
    return (
        <div className="grid grid-cols-4 items-center gap-2">
            <div className="p-2 border-r">{label}</div>
            <div className="p-2 border-r flex items-center gap-2">
                <Input type="number" value={gallons || ''} onChange={e => onGallonsChange(Number(e.target.value))} className="h-8 text-right bg-background flex-1" />
                <span className="text-muted-foreground">x {FUEL_WEIGHT_PER_GALLON} =</span>
                <span className="font-semibold">{weight.toFixed(1)}</span>
            </div>
            <div className="p-2 border-r text-right">{arm?.toFixed(2) || ''}</div>
            <div className="p-2 text-right">{moment.toFixed(1)}</div>
        </div>
    );
};


export default function WeightAndBalancePage({ params }: WeightAndBalancePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;

    // --- State for Inputs ---
    const [oilWeight, setOilWeight] = useState(0);
    const [pilot1Weight, setPilot1Weight] = useState(0);
    const [pilot2Weight, setPilot2Weight] = useState(0);
    const [passenger1Weight, setPassenger1Weight] = useState(0);
    const [passenger2Weight, setPassenger2Weight] = useState(0);
    const [baggage1Weight, setBaggage1Weight] = useState(0);
    const [fuelLoadGallons, setFuelLoadGallons] = useState(0);
    const [fuelGroundBurnGallons, setFuelGroundBurnGallons] = useState(0);
    const [fuelFlightBurnGallons, setFuelFlightBurnGallons] = useState(0);
    
    // --- Data Fetching ---
    const bookingDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null), [firestore, tenantId, bookingId]);
    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<Booking>(bookingDocRef);

    const aircraftDocRef = useMemoFirebase(() => (firestore && booking ? doc(firestore, 'tenants', tenantId, 'aircrafts', booking.aircraftId) : null), [firestore, tenantId, booking]);
    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftDocRef);
    
    const isLoading = isLoadingBooking || isLoadingAircraft;
    const error = bookingError || aircraftError;
    
    // --- Calculations ---
    const calculation = useMemo(() => {
        if (!aircraft || !aircraft.stationArms) return null;

        const emptyWeight = aircraft.emptyWeight || 0;
        const emptyMoment = aircraft.emptyWeightMoment || 0;
        const arms = aircraft.stationArms;

        // Basic Condition
        const pilotWeight = pilot1Weight + pilot2Weight;
        const basicWeight = emptyWeight + oilWeight + pilotWeight;
        const oilMoment = oilWeight * (arms.oil || 27.5); // Using a default if not present
        const pilotMoment = pilotWeight * (arms.frontSeats || 0);
        const basicMoment = emptyMoment + oilMoment + pilotMoment;
        const basicCg = basicMoment / (basicWeight || 1);

        // Zero Fuel Condition
        const passengerWeight = passenger1Weight + passenger2Weight;
        const baggageWeight = baggage1Weight;
        const zeroFuelWeight = basicWeight + passengerWeight + baggageWeight;
        const passengerMoment = passengerWeight * (arms.rearSeats || 0);
        const baggageMoment = baggageWeight * (arms.baggage1 || 0);
        const zeroFuelMoment = basicMoment + passengerMoment + baggageMoment;
        const zeroFuelCg = zeroFuelMoment / (zeroFuelWeight || 1);
        
        // Ramp Condition
        const fuelLoadWeight = fuelLoadGallons * FUEL_WEIGHT_PER_GALLON;
        const rampWeight = zeroFuelWeight + fuelLoadWeight;
        const fuelLoadMoment = fuelLoadWeight * (arms.fuel || 0);
        const rampMoment = zeroFuelMoment + fuelLoadMoment;
        const rampCg = rampMoment / (rampWeight || 1);

        // Takeoff Condition
        const groundBurnWeight = fuelGroundBurnGallons * FUEL_WEIGHT_PER_GALLON;
        const takeoffWeight = rampWeight - groundBurnWeight;
        const groundBurnMoment = groundBurnWeight * (arms.fuel || 0);
        const takeoffMoment = rampMoment - groundBurnMoment;
        const takeoffCg = takeoffMoment / (takeoffWeight || 1);

        // Landing Condition
        const flightBurnWeight = fuelFlightBurnGallons * FUEL_WEIGHT_PER_GALLON;
        const landingWeight = takeoffWeight - flightBurnWeight;
        const flightBurnMoment = flightBurnWeight * (arms.fuel || 0);
        const landingMoment = takeoffMoment - flightBurnMoment;
        const landingCg = landingMoment / (landingWeight || 1);

        // Maneuvering Speed
        const maxGrossWeight = aircraft.maxTakeoffWeight || 0;
        const vaAtMaxGross = 110; // Placeholder, should come from aircraft data
        const maneuveringSpeed = takeoffWeight > 0 ? vaAtMaxGross * Math.sqrt(takeoffWeight / maxGrossWeight) : 0;

        return {
            emptyWeight, emptyMoment, arms,
            oilMoment, pilotMoment, basicWeight, basicMoment, basicCg,
            passengerMoment, baggageMoment, zeroFuelWeight, zeroFuelMoment, zeroFuelCg,
            fuelLoadWeight, fuelLoadMoment, rampWeight, rampMoment, rampCg,
            takeoffWeight, takeoffMoment, takeoffCg,
            landingWeight, landingMoment, landingCg,
            maneuveringSpeed, maxGrossWeight
        };
    }, [aircraft, oilWeight, pilot1Weight, pilot2Weight, passenger1Weight, passenger2Weight, baggage1Weight, fuelLoadGallons, fuelGroundBurnGallons, fuelFlightBurnGallons]);

    if (isLoading) {
        return <div className="max-w-4xl mx-auto space-y-6"><Skeleton className="h-[80vh] w-full" /></div>;
    }
    
    if (error || !booking || !aircraft) {
        return <div className="text-destructive text-center">Error: {error?.message || 'Booking or Aircraft data could not be loaded.'}</div>;
    }
    
    // Add default arm for oil if not present, for display purposes
    const displayArms = { ...aircraft.stationArms, oil: aircraft.stationArms?.oil || 27.5 };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <div>
                 <Button asChild variant="outline" size="sm">
                    <Link href={`/operations/bookings/${bookingId}/checklist`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Checklist
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Weight &amp; Balance Calculator</CardTitle>
                        <CardDescription>For aircraft {aircraft.tailNumber} on booking #{booking.bookingNumber}.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">Save</Button>
                        <Button variant="outline">Load</Button>
                        <Button variant="destructive">Reset</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border rounded-lg text-sm">
                        {/* --- Table Header --- */}
                        <div className="grid grid-cols-4 items-center gap-2 font-bold bg-muted/40 rounded-t-lg">
                            <div className="p-2 border-r">ITEM</div>
                            <div className="p-2 border-r text-right">Weight</div>
                            <div className="p-2 border-r text-right">Arm</div>
                            <div className="p-2 text-right">Moment</div>
                        </div>

                        {/* --- Table Body --- */}
                        <div className="divide-y">
                            <CalcRow label="Basic Empty Weight" weight={calculation?.emptyWeight.toFixed(1)} arm={(calculation?.emptyMoment / (calculation.emptyWeight || 1)).toFixed(2)} moment={calculation?.emptyMoment.toFixed(1)} />
                            <InputRow label="Oil" weight={oilWeight} onWeightChange={setOilWeight} arm={displayArms.oil} />
                            <InputRow label="Pilot 1" weight={pilot1Weight} onWeightChange={setPilot1Weight} arm={displayArms.frontSeats} />
                            <InputRow label="Pilot 2" weight={pilot2Weight} onWeightChange={setPilot2Weight} arm={displayArms.frontSeats} />
                            <CalcRow isSubtotal label="Basic Condition" weight={calculation?.basicWeight.toFixed(1)} arm={`CG: ${calculation?.basicCg.toFixed(2)}`} moment={calculation?.basicMoment.toFixed(1)} />
                            <InputRow label="Passenger 1" weight={passenger1Weight} onWeightChange={setPassenger1Weight} arm={displayArms.rearSeats} />
                            <InputRow label="Passenger 2" weight={passenger2Weight} onWeightChange={setPassenger2Weight} arm={displayArms.rearSeats} />
                            <InputRow label="Baggage Area 1" weight={baggage1Weight} onWeightChange={setBaggage1Weight} arm={displayArms.baggage1} />
                            <CalcRow isSubtotal label="Zero Fuel Condition" weight={calculation?.zeroFuelWeight.toFixed(1)} arm={`CG: ${calculation?.zeroFuelCg.toFixed(2)}`} moment={calculation?.zeroFuelMoment.toFixed(1)} />
                            <FuelInputRow label="Fuel Load" gallons={fuelLoadGallons} onGallonsChange={setFuelLoadGallons} arm={displayArms.fuel} />
                            <CalcRow isSubtotal label="Ramp Condition" weight={calculation?.rampWeight.toFixed(1)} arm={`CG: ${calculation?.rampCg.toFixed(2)}`} moment={calculation?.rampMoment.toFixed(1)} />
                            <FuelInputRow label="Fuel Burned On Ground (-)" gallons={fuelGroundBurnGallons} onGallonsChange={setFuelGroundBurnGallons} arm={displayArms.fuel} isNegative />
                            <CalcRow isSubtotal label="TakeOff Condition" weight={calculation?.takeoffWeight.toFixed(1)} arm={`CG: ${calculation?.takeoffCg.toFixed(2)}`} moment={calculation?.takeoffMoment.toFixed(1)} />
                            <FuelInputRow label="Fuel Burned During Flight (-)" gallons={fuelFlightBurnGallons} onGallonsChange={setFuelFlightBurnGallons} arm={displayArms.fuel} isNegative />
                            <CalcRow isSubtotal label="Landing Condition" weight={calculation?.landingWeight.toFixed(1)} arm={`CG: ${calculation?.landingCg.toFixed(2)}`} moment={calculation?.landingMoment.toFixed(1)} />
                        </div>
                    </div>

                     <div className="border rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-lg">Maneuvering Speed (V<sub>A</sub>)</h3>
                        <div className="grid grid-cols-2 items-center gap-4">
                            <label>V<sub>A</sub> @ Max Gross Weight</label>
                            <Input value="110" readOnly className='text-right' />

                             <label>Aircraft Weight</label>
                            <Input value={calculation?.takeoffWeight.toFixed(0) || '0'} readOnly className='text-right' />

                            <label>Max Gross Weight</label>
                            <Input value={calculation?.maxGrossWeight || '0'} readOnly className='text-right' />

                            <label className="font-bold">Maneuvering Speed (V<sub>A</sub>)</label>
                            <Input value={calculation?.maneuveringSpeed.toFixed(0) || '0'} readOnly className="font-bold text-right" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    