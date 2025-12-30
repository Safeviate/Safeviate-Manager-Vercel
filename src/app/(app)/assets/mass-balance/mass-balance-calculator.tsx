
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, PlusCircle, Trash2, Fuel } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { isPointInPolygon } from '@/lib/utils';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';

import type { Aircraft } from '../../assets/page';
import type { Booking } from '@/types/booking';

import { MassBalanceChart } from './mass-balance-chart';
import { MassBalanceResults } from './mass-balance-results';
import { AircraftProfileSelector } from './aircraft-profile-selector';

import type { AircraftModelProfile, Station } from '@/types/aircraft-profile';


const toCamelCase = (str: string) => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
};

export function MassBalanceCalculator() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const bookingId = searchParams.get('bookingId');
  const aircraftId = searchParams.get('aircraftId');
  const tenantId = 'safeviate';

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [cgEnvelope, setCgEnvelope] = useState<{ x: number, y: number }[]>([]);
  const [chartLimits, setChartLimits] = useState({ xMin: 0, xMax: 0, yMin: 0, yMax: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const aircraftDocRef = useMemoFirebase(
    () => (firestore && aircraftId ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: initialAircraftData, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftDocRef);

  useEffect(() => {
    const fetchInitialData = async () => {
        setIsLoading(true);
        if (initialAircraftData) {
            setAircraft(initialAircraftData);
            const initialStations: Station[] = [
                { id: 1, name: 'Empty Weight', weight: initialAircraftData.emptyWeight || 0, arm: (initialAircraftData.emptyWeightMoment || 0) / (initialAircraftData.emptyWeight || 1), type: 'Fixed' },
                { id: 2, name: 'Front Seats', weight: 0, arm: initialAircraftData.stationArms?.frontSeats || 0, type: 'Normal' },
                { id: 3, name: 'Rear Seats', weight: 0, arm: initialAircraftData.stationArms?.rearSeats || 0, type: 'Normal' },
                { id: 4, name: 'Baggage 1', weight: 0, arm: initialAircraftData.stationArms?.baggage1 || 0, type: 'Normal' },
                { id: 5, name: 'Fuel', weight: 0, arm: initialAircraftData.stationArms?.fuel || 0, type: 'Fuel', gallons: 0, maxGallons: 53 },
            ];
            setStations(initialStations);
            setCgEnvelope(initialAircraftData.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || []);
        }

        if (bookingId && firestore) {
            const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
            const bookingSnap = await getDoc(bookingRef);
            if (bookingSnap.exists()) {
                const bookingData = bookingSnap.data() as Booking;
                setBooking(bookingData);
                if (bookingData.massAndBalance) {
                     // If existing data, load it into stations
                     setStations(prevStations => {
                        const newStations = [...prevStations];
                        Object.entries(bookingData.massAndBalance!).forEach(([key, value]) => {
                           const station = newStations.find(s => toCamelCase(s.name) === key);
                           if (station) {
                               station.weight = value.weight;
                               if(station.type === 'Fuel'){
                                   station.gallons = value.weight / FUEL_WEIGHT_PER_GALLON;
                               }
                           }
                        });
                        return newStations;
                    });
                }
            }
        }
        setIsLoading(false);
    };
    fetchInitialData();
  }, [initialAircraftData, bookingId, firestore, tenantId]);


  const handleWeightChange = (id: number, newWeight: number) => {
    setStations(stations.map(station =>
      station.id === id ? { ...station, weight: newWeight, gallons: station.type === 'Fuel' ? newWeight / FUEL_WEIGHT_PER_GALLON : station.gallons } : station
    ));
  };
  
  const handleGallonsChange = (id: number, newGallons: number) => {
    setStations(stations.map(station =>
        station.id === id && station.type === 'Fuel' ? { ...station, gallons: newGallons, weight: newGallons * FUEL_WEIGHT_PER_GALLON } : station
    ));
  }

  const handleApplyProfile = (profile: AircraftModelProfile) => {
    if (!profile) return;
    setStations(profile.stations || []);
    setCgEnvelope(profile.cgEnvelope || []);
    setChartLimits({
        xMin: profile.xMin || 0,
        xMax: profile.xMax || 100,
        yMin: profile.yMin || 0,
        yMax: profile.yMax || 3000,
    })
  }

  const { totalWeight, totalMoment } = useMemo(() => {
    return stations.reduce((acc, station) => {
      const moment = station.weight * station.arm;
      acc.totalWeight += station.weight;
      acc.totalMoment += moment;
      return acc;
    }, { totalWeight: 0, totalMoment: 0 });
  }, [stations]);

  const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
  
  const isWithinEnvelope = isPointInPolygon({ x: centerOfGravity, y: totalWeight }, cgEnvelope);

  const handleSaveToBooking = async () => {
    if (!firestore || !bookingId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Booking information is missing.' });
        return;
    }

    const massAndBalanceData = stations.reduce((acc, station) => {
        const key = toCamelCase(station.name);
        const moment = station.weight * station.arm;
        acc[key] = { weight: station.weight, moment: parseFloat(moment.toFixed(2)) };
        return acc;
    }, {} as Record<string, { weight: number, moment: number }>);
    
    try {
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
        await updateDoc(bookingRef, {
            massAndBalance: massAndBalanceData
        });
        toast({ title: 'Saved to Booking', description: 'Mass & Balance data has been saved successfully.' });
    } catch (error) {
        console.error("Error saving M&B data:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save data to booking.' });
    }
  };


  if (isLoading) {
    return <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {!aircraft && !aircraftId && (
        <AircraftProfileSelector onProfileSelect={handleApplyProfile} />
      )}

      {aircraftId && !aircraft && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <CardTitle>Aircraft Not Found</CardTitle>
          <CardDescription>
            The aircraft with ID `{aircraftId}` could not be found. Please select a different aircraft or check the ID.
          </CardDescription>
        </Alert>
      )}

      {aircraft && (
         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
                <MassBalanceChart 
                    envelope={cgEnvelope}
                    cgPoint={{ x: centerOfGravity, y: totalWeight }}
                    limits={chartLimits}
                />
            </div>
            
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{aircraft.tailNumber} - {aircraft.model}</CardTitle>
                        <CardDescription>
                           {booking ? `Mass & Balance for Booking #${booking.bookingNumber}` : 'Calculation'}
                        </CardDescription>
                    </CardHeader>
                </Card>

                <MassBalanceResults
                    totalWeight={totalWeight}
                    centerOfGravity={centerOfGravity}
                    isWithinEnvelope={isWithinEnvelope}
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Loading Stations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Station</TableHead>
                          <TableHead className="text-right">Weight (lbs)</TableHead>
                          <TableHead className="w-[100px] text-right">Arm</TableHead>
                          <TableHead className="text-right">Moment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stations.map(station => (
                          <TableRow key={station.id}>
                            <TableCell className="font-medium">{station.name}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={Math.round(station.weight)}
                                onChange={e => handleWeightChange(station.id, parseFloat(e.target.value) || 0)}
                                className="w-24 ml-auto text-right"
                                disabled={station.type === 'Fixed'}
                              />
                            </TableCell>
                            <TableCell className="text-right">{station.arm.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{(station.weight * station.arm).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <Separator className="my-4" />

                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div className='space-y-2'>
                           <Label htmlFor="fuel-gallons">Fuel (Gallons)</Label>
                           <Input
                             id="fuel-gallons"
                             type="number"
                             value={Math.round(stations.find(s => s.type === 'Fuel')?.gallons || 0)}
                             onChange={e => handleGallonsChange(stations.find(s => s.type === 'Fuel')!.id, parseFloat(e.target.value))}
                           />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="w-full" onClick={() => handleGallonsChange(stations.find(s => s.type === 'Fuel')!.id, 0)}>Empty</Button>
                            <Button variant="outline" className="w-full" onClick={() => handleGallonsChange(stations.find(s => s.type === 'Fuel')!.id, (stations.find(s => s.type === 'Fuel')?.maxGallons || 0) / 2)}>Half</Button>
                            <Button variant="outline" className="w-full" onClick={() => handleGallonsChange(stations.find(s => s.type === 'Fuel')!.id, stations.find(s => s.type === 'Fuel')?.maxGallons || 0)}>Full</Button>
                        </div>
                    </div>

                  </CardContent>
                   <CardFooter className="flex justify-end gap-2 border-t pt-6">
                        <Button variant="secondary">Print</Button>
                        {bookingId && <Button onClick={handleSaveToBooking}>Save to Booking</Button>}
                    </CardFooter>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}
