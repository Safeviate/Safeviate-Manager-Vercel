
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile } from '@/types/aircraft';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon } from '@/lib/utils';
import { updateBooking } from '../../operations/bookings/booking-functions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type Station = {
  id: number;
  name: string;
  weight: number;
  arm: number;
  type: 'crew' | 'pax' | 'cargo' | 'fuel';
  gallons?: number;
  maxGallons?: number;
};

const camelCase = (str: string) => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
    index === 0 ? word.toLowerCase() : word.toUpperCase()
  ).replace(/\s+/g, '');
};


export function MassBalanceCalculator() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  const aircraftId = searchParams.get('aircraftId');
  const profileId = searchParams.get('profileId');
  const bookingId = searchParams.get('bookingId');
  
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(() => (firestore && aircraftId ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null), [firestore, tenantId, aircraftId]);
  const profileRef = useMemoFirebase(() => (firestore && profileId ? doc(firestore, `tenants/${tenantId}/massAndBalance`, profileId) : null), [firestore, tenantId, profileId]);
  const bookingRef = useMemoFirebase(() => (firestore && bookingId ? doc(firestore, `tenants/${tenantId}/bookings`, bookingId) : null), [firestore, tenantId, bookingId]);

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: profile, isLoading: isLoadingProfile } = useDoc<AircraftModelProfile>(profileRef);
  const { data: booking, isLoading: isLoadingBooking } = useDoc(bookingRef);


  const [stations, setStations] = useState<Station[]>([]);
  const [cgEnvelope, setCgEnvelope] = useState<{ x: number, y: number }[]>([]);

  useEffect(() => {
    const selectedSource = profile || aircraft;
    if (selectedSource) {
      const initialStations: Station[] = [
        { id: 1, name: 'Basic Empty Weight', weight: selectedSource.emptyWeight || 0, arm: (selectedSource.emptyWeightMoment || 0) / (selectedSource.emptyWeight || 1), type: 'crew' },
        { id: 2, name: 'Front Seats', weight: 0, arm: selectedSource.stationArms?.frontSeats || 0, type: 'crew' },
        { id: 3, name: 'Rear Seats', weight: 0, arm: selectedSource.stationArms?.rearSeats || 0, type: 'pax' },
        { id: 4, name: 'Baggage 1', weight: 0, arm: selectedSource.stationArms?.baggage1 || 0, type: 'cargo' },
        { id: 5, name: 'Baggage 2', weight: 0, arm: selectedSource.stationArms?.baggage2 || 0, type: 'cargo' },
        { id: 6, name: 'Fuel', weight: 0, arm: selectedSource.stationArms?.fuel || 0, type: 'fuel', gallons: 0, maxGallons: 40 },
      ];
      setStations(initialStations);
      setCgEnvelope(selectedSource.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || []);
    }
  }, [aircraft, profile]);

  // Load from booking if it exists and has data
  useEffect(() => {
    if (booking?.massAndBalance) {
        const massAndBalanceData = booking.massAndBalance;
        setStations(prevStations => {
            const newStations = [...prevStations];
            Object.keys(massAndBalanceData).forEach(stationKey => {
                const stationData = massAndBalanceData[stationKey];
                const stationIndex = newStations.findIndex(s => camelCase(s.name) === stationKey);
                if (stationIndex !== -1) {
                    newStations[stationIndex].weight = stationData.weight;
                    if (newStations[stationIndex].type === 'fuel') {
                        newStations[stationIndex].gallons = stationData.weight / FUEL_WEIGHT_PER_GALLON;
                    }
                }
            });
            return newStations;
        });
    }
  }, [booking]);


  const handleWeightChange = (id: number, weight: number) => {
    setStations(stations.map(s => s.id === id ? { ...s, weight, gallons: s.type === 'fuel' ? weight / FUEL_WEIGHT_PER_GALLON : s.gallons } : s));
  };
  
  const handleGallonsChange = (id: number, gallons: number) => {
    setStations(stations.map(s => s.id === id ? { ...s, gallons, weight: gallons * FUEL_WEIGHT_PER_GALLON } : s));
  };
  
  const addStation = () => {
    const newId = stations.length > 0 ? Math.max(...stations.map(s => s.id)) + 1 : 1;
    setStations([...stations, { id: newId, name: 'New Station', weight: 0, arm: 0, type: 'cargo' }]);
  };

  const removeStation = (id: number) => {
    setStations(stations.filter(s => s.id !== id));
  };

  const totalWeight = useMemo(() => stations.reduce((acc, s) => acc + (s.weight || 0), 0), [stations]);
  const totalMoment = useMemo(() => stations.reduce((acc, s) => acc + (s.weight || 0) * (s.arm || 0), 0), [stations]);
  const centerOfGravity = useMemo(() => totalWeight > 0 ? totalMoment / totalWeight : 0, [totalWeight, totalMoment]);
  
  const takeoffCG = { x: centerOfGravity, y: totalWeight };
  const isWithinLimits = isPointInPolygon(takeoffCG, cgEnvelope);

  const chartData = useMemo(() => {
    if (cgEnvelope.length === 0) return [];
    
    // Find min/max for chart axis
    const xMin = Math.min(...cgEnvelope.map(p => p.x), centerOfGravity);
    const xMax = Math.max(...cgEnvelope.map(p => p.x), centerOfGravity);
    const yMin = Math.min(...cgEnvelope.map(p => p.y), totalWeight);
    const yMax = Math.max(...cgEnvelope.map(p => p.y), totalWeight);

    const data = [...cgEnvelope, {x: centerOfGravity, y: totalWeight, name: 'Takeoff CG'}];
    return data;

  }, [cgEnvelope, centerOfGravity, totalWeight]);


  const handleSaveToBooking = async () => {
      if (!firestore || !bookingId || !aircraft) {
        toast({
            variant: "destructive",
            title: "Cannot Save",
            description: "No booking is associated with this calculation.",
        });
        return;
      }

      const massAndBalanceObject = stations.reduce((acc, station) => {
        if (station.name !== 'Basic Empty Weight') {
            const key = camelCase(station.name);
            acc[key] = {
                weight: station.weight || 0,
                moment: (station.weight || 0) * (station.arm || 0)
            };
        }
        return acc;
      }, {} as { [key: string]: { weight: number, moment: number } });
      
      try {
        await updateBooking({
          firestore,
          tenantId,
          bookingId,
          aircraft,
          updateData: {
            massAndBalance: massAndBalanceObject,
          }
        });
        toast({
          title: "Saved to Booking",
          description: "Mass & Balance data has been saved to the booking.",
        });
      } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: error.message || "An unknown error occurred.",
        });
      }
  };
  
  if (isLoadingAircraft || isLoadingProfile || isLoadingBooking) {
      return (
          <div className="space-y-6">
              <Skeleton className="h-10 w-1/4" />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Skeleton className="h-96" />
                  <Skeleton className="h-96" />
              </div>
          </div>
      )
  }

  const selectedSource = profile || aircraft;

  if (!selectedSource) {
      return <div className="text-center py-10"><p>Please select an aircraft or profile to begin.</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Loading Stations</CardTitle>
            <CardDescription>Enter weights and fuel amounts to calculate mass and balance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead className='text-right'>Weight (lbs)</TableHead>
                  <TableHead className='text-right'>Arm (in)</TableHead>
                  <TableHead className='text-right'>Moment (lb-in)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell className='text-right'>
                       {station.type === 'fuel' ? (
                            <Input
                                type="number"
                                value={Math.round(station.weight)}
                                readOnly
                                className="w-24 ml-auto text-right bg-muted"
                            />
                       ) : (
                            <Input
                                type="number"
                                value={station.weight}
                                onChange={(e) => handleWeightChange(station.id, parseFloat(e.target.value))}
                                className="w-24 ml-auto text-right"
                                readOnly={station.name === 'Basic Empty Weight'}
                            />
                       )}
                    </TableCell>
                    <TableCell className='text-right'>{station.arm.toFixed(2)}</TableCell>
                    <TableCell className='text-right'>{((station.weight || 0) * (station.arm || 0)).toFixed(0)}</TableCell>
                    <TableCell>
                      {station.name !== 'Basic Empty Weight' && (
                        <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeStation(station.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <div>
              <Button variant="outline" onClick={addStation}>
                <Plus className="mr-2" /> Add Station
              </Button>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex gap-2 items-center">
                <Label htmlFor="fuel-gallons">Fuel (Gal)</Label>
                 <Input
                    id="fuel-gallons"
                    type="number"
                    value={stations.find(s => s.type === 'fuel')?.gallons || 0}
                    onChange={(e) => handleGallonsChange(stations.find(s => s.type === 'fuel')!.id, parseFloat(e.target.value))}
                    className="w-24"
                />
              </div>
              <Button>Add Fuel</Button>
               {bookingId && <Button>Save</Button>}
            </div>
          </CardFooter>
        </Card>

        <div className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">Total Weight</TableCell>
                        <TableCell className="text-right">{totalWeight.toFixed(2)} lbs</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">Total Moment</TableCell>
                        <TableCell className="text-right">{totalMoment.toFixed(0)} lb-in</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">Center of Gravity</TableCell>
                        <TableCell className="text-right">{centerOfGravity.toFixed(2)} in</TableCell>
                    </TableRow>
                </TableBody>
                </Table>
                <div className="mt-4">
                    {!isWithinLimits ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Out of Limits</AlertTitle>
                            <AlertDescription>
                            The calculated center of gravity is outside the permissible envelope.
                            </AlertDescription>
                        </Alert>
                    ) : (
                         <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Within Limits</AlertTitle>
                            <AlertDescription>
                            The calculated center of gravity is within the permissible envelope.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
             {bookingId && (
                <CardFooter>
                  <Button className="w-full" onClick={handleSaveToBooking}>Save to Booking</Button>
                </CardFooter>
              )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>CG Envelope</CardTitle>
                </CardHeader>
                <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="CG (in)" unit=" in" domain={['dataMin - 2', 'dataMax + 2']} label={{ value: "Center of Gravity (in)", position: "bottom" }} />
                        <YAxis type="number" dataKey="y" name="Weight (lbs)" unit=" lbs" domain={['dataMin - 100', 'dataMax + 100']} label={{ value: "Weight (lbs)", angle: -90, position: "insideLeft" }}/>
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend verticalAlign="top" height={36} />
                        <Line data={cgEnvelope} dataKey="y" name="CG Envelope" stroke="#8884d8" dot={false} type="monotone" />
                        <Line data={[{x: centerOfGravity, y: totalWeight}]} dataKey="y" name="Takeoff CG" stroke="#82ca9d" strokeWidth={5} dot={{ r: 5 }} />

                    </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
