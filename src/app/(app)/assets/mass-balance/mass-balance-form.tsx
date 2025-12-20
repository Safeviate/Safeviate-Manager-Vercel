
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';
import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';
import { useSearchParams } from 'next/navigation';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface Station {
  id: number;
  name: string;
  weight: number;
  arm: number;
  type: 'weight' | 'fuel';
  gallons?: number;
  maxGallons?: number;
}

interface AircraftModelProfile {
    id: string;
    profileName: string;
    emptyWeight: number;
    emptyWeightMoment: number;
    maxTakeoffWeight: number;
    maxLandingWeight: number;
    stations: Station[];
    cgEnvelope: { x: number; y: number }[];
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}


export function MassBalanceForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tenantId = 'safeviate';

  const bookingId = searchParams.get('bookingId');
  const aircraftId = searchParams.get('aircraftId');

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [currentStations, setCurrentStations] = useState<Station[]>([]);
  const [calculationResult, setCalculationResult] = useState<{
    totalWeight: number;
    totalMoment: number;
    centerOfGravity: number;
    isWithinLimits: boolean;
  } | null>(null);

  // --- Data Fetching ---
  const profilesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/massAndBalance`) : null),
    [firestore, tenantId]
  );
  const aircraftQuery = useMemoFirebase(
    () => (aircraftId && firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: profiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);
  // Note: useDoc doesn't exist in the provided hooks, so we adapt.
  // We'll treat a single doc fetch as a collection query with a specific 'where' clause.
  const singleAircraftQuery = useMemoFirebase(
    () => (aircraftId && firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), where('id', '==', aircraftId)) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraftData, isLoading: isLoadingAircraft } = useCollection<Aircraft>(singleAircraftQuery);
  const aircraft = aircraftData?.[0];

  const isLoading = isLoadingProfiles || isLoadingAircraft;

  const selectedProfile = useMemo(
    () => profiles?.find((p) => p.id === selectedProfileId),
    [profiles, selectedProfileId]
  );

  // --- Effects ---
  useEffect(() => {
    if (selectedProfile) {
      setCurrentStations(JSON.parse(JSON.stringify(selectedProfile.stations)));
      setCalculationResult(null);
    } else {
        setCurrentStations([]);
        setCalculationResult(null);
    }
  }, [selectedProfile]);

  // --- Handlers ---
  const handleStationChange = (id: number, field: 'weight' | 'gallons', value: string) => {
    const numericValue = parseFloat(value) || 0;
    setCurrentStations((prev) =>
      prev.map((station) => {
        if (station.id === id) {
          if (field === 'gallons') {
            return { ...station, gallons: numericValue, weight: numericValue * FUEL_WEIGHT_PER_GALLON };
          }
          return { ...station, weight: numericValue };
        }
        return station;
      })
    );
  };
  
  const handleLoadAircraftProfile = () => {
    if (!aircraft) {
        toast({ variant: 'destructive', title: 'Aircraft Not Found' });
        return;
    }
    const profile: AircraftModelProfile = {
        id: aircraft.id,
        profileName: `${aircraft.tailNumber} Profile`,
        emptyWeight: aircraft.emptyWeight,
        emptyWeightMoment: aircraft.emptyWeightMoment,
        maxTakeoffWeight: aircraft.maxTakeoffWeight,
        maxLandingWeight: aircraft.maxLandingWeight,
        stations: [ // Reconstruct stations based on aircraft data
            { id: 1, name: 'Front Seats', arm: aircraft.stationArms.frontSeats, weight: 0, type: 'weight' },
            { id: 2, name: 'Rear Seats', arm: aircraft.stationArms.rearSeats, weight: 0, type: 'weight' },
            { id: 3, name: 'Baggage 1', arm: aircraft.stationArms.baggage1, weight: 0, type: 'weight' },
            { id: 4, name: 'Baggage 2', arm: aircraft.stationArms.baggage2, weight: 0, type: 'weight' },
            { id: 5, name: 'Fuel', arm: aircraft.stationArms.fuel, weight: 0, type: 'fuel', gallons: 0, maxGallons: 50 }, // Example max gallons
        ],
        cgEnvelope: aircraft.cgEnvelope.map(p => ({ x: p.cg, y: p.weight })),
        xMin: Math.min(...aircraft.cgEnvelope.map(p => p.cg)) - 2,
        xMax: Math.max(...aircraft.cgEnvelope.map(p => p.cg)) + 2,
        yMin: Math.min(...aircraft.cgEnvelope.map(p => p.weight)) - 200,
        yMax: Math.max(...aircraft.cgEnvelope.map(p => p.weight)) + 200,
    };
    setCurrentStations(JSON.parse(JSON.stringify(profile.stations)));
    // Fake a selection to make it work with existing logic
    setSelectedProfileId('temp-aircraft-profile');
    // Inject the temporary profile into the list for the memo to find it
    profiles?.push({ ...profile, id: 'temp-aircraft-profile' });
    toast({ title: 'Aircraft Profile Loaded' });
  }

  const handleCalculate = () => {
    if (!selectedProfile) return;

    const { totalWeight, totalMoment } = currentStations.reduce(
      (acc, station) => {
        acc.totalWeight += station.weight;
        acc.totalMoment += station.weight * station.arm;
        return acc;
      },
      {
        totalWeight: selectedProfile.emptyWeight,
        totalMoment: selectedProfile.emptyWeightMoment,
      }
    );

    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
    const isWithinLimits = isPointInPolygon(
        { x: centerOfGravity, y: totalWeight },
        selectedProfile.cgEnvelope
    ) && totalWeight <= selectedProfile.maxTakeoffWeight;

    setCalculationResult({ totalWeight, totalMoment, centerOfGravity, isWithinLimits });
  };
  
  const handleSaveToBooking = () => {
    if (!bookingId || !firestore || !calculationResult) {
        toast({ variant: 'destructive', title: 'Error', description: 'No booking or calculation result available to save.' });
        return;
    }
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    const stationWeights = currentStations.reduce((acc, station) => {
      acc[station.id.toString()] = station.weight;
      return acc;
    }, {} as { [key: string]: number });
    
    const payload = {
        massAndBalance: {
            ...calculationResult,
            stationWeights,
            calculatedAt: new Date().toISOString(),
        }
    };
    
    updateDocumentNonBlocking(bookingRef, payload);

    toast({ title: "M&B Saved", description: "Mass and Balance data has been saved to the booking." });
  }

  const chartData = useMemo(() => {
    if (!selectedProfile || !calculationResult) return [];

    const dataPoints = [
        { name: 'Empty Weight', weight: selectedProfile.emptyWeight, cg: selectedProfile.emptyWeightMoment / selectedProfile.emptyWeight },
        ...currentStations.filter(s => s.weight > 0).map(s => ({
            name: s.name,
            weight: s.weight,
            cg: s.arm
        })),
        { name: 'Takeoff', weight: calculationResult.totalWeight, cg: calculationResult.centerOfGravity }
    ];
    return dataPoints;
  }, [selectedProfile, currentStations, calculationResult]);


  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mass & Balance Calculator</CardTitle>
          <CardDescription>Select a profile and input weights to calculate the aircraft's center of gravity.</CardDescription>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={selectedProfile?.cgEnvelope}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="CG (in)"
                  unit=" in"
                  domain={[selectedProfile?.xMin || 70, selectedProfile?.xMax || 100]}
                  label={{ value: "Center of Gravity (inches from datum)", position: "bottom", offset: 0 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Weight (lbs)"
                  unit=" lbs"
                  domain={[selectedProfile?.yMin || 1400, selectedProfile?.yMax || 2600]}
                  label={{ value: "Weight (lbs)", angle: -90, position: "insideLeft", offset: -10 }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend verticalAlign='top' height={36} />
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="hsl(var(--foreground))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  name="CG Envelope"
                  dot={false}
                  activeDot={false}
                />
                {calculationResult && (
                  <Scatter
                    name="Takeoff Point"
                    data={[{ x: calculationResult.centerOfGravity, y: calculationResult.totalWeight }]}
                    fill={calculationResult.isWithinLimits ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Configurator</CardTitle>
          <CardDescription>Load a profile to begin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex flex-col sm:flex-row gap-4">
              <Select onValueChange={setSelectedProfileId} value={selectedProfileId}>
                  <SelectTrigger>
                      <SelectValue placeholder="Load Saved Profile" />
                  </SelectTrigger>
                  <SelectContent>
                      {profiles?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              
              <Button onClick={handleLoadAircraftProfile} variant="outline" disabled={!aircraft}>
                  Load from {aircraft ? aircraft.tailNumber : 'Aircraft'}
              </Button>
          </div>

          {selectedProfile && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {currentStations.map((station) => (
                <div key={station.id} className="space-y-2">
                  <Label htmlFor={`station-${station.id}`}>{station.name}</Label>
                  {station.type === 'fuel' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        id={`station-${station.id}-gallons`}
                        type="number"
                        placeholder="Gallons"
                        value={station.gallons ?? ''}
                        onChange={(e) => handleStationChange(station.id, 'gallons', e.target.value)}
                      />
                      <span className='text-sm text-muted-foreground whitespace-nowrap'>({station.weight.toFixed(1)} lbs)</span>
                    </div>
                  ) : (
                    <Input
                      id={`station-${station.id}`}
                      type="number"
                      placeholder="Weight (lbs)"
                      value={station.weight}
                      onChange={(e) => handleStationChange(station.id, 'weight', e.target.value)}
                    />
                  )}
                </div>
              ))}
              <div className="col-span-full flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                 {calculationResult ? (
                    <div className='text-sm space-y-1'>
                        <p>Total Weight: <span className='font-bold'>{calculationResult.totalWeight.toFixed(2)} lbs</span></p>
                        <p>Center of Gravity: <span className='font-bold'>{calculationResult.centerOfGravity.toFixed(2)} in</span></p>
                        <p>Status: <span className={cn('font-bold', calculationResult.isWithinLimits ? 'text-green-600' : 'text-red-600')}>{calculationResult.isWithinLimits ? 'Within Limits' : 'OUT OF LIMITS'}</span></p>
                    </div>
                 ) : <div></div>}
                 <div className='flex gap-2'>
                    <Button onClick={handleCalculate}>Calculate</Button>
                    {bookingId && (
                        <Button onClick={handleSaveToBooking} disabled={!calculationResult}>Save to Booking</Button>
                    )}
                 </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

