
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, PlusCircle, Trash2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { isPointInPolygon } from '@/lib/utils';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { AircraftModelProfile, Station } from './page';
import type { Booking } from '@/types/booking';

interface MassBalanceCalculatorProps {
  profile: AircraftModelProfile;
  booking?: Booking;
}

// Ensure stations from profile have a unique ID for react keys
const ensureStationIds = (stations: Station[]): Station[] => {
    return stations.map((station, index) => ({
        ...station,
        id: station.id || index, // Use existing id or index as fallback
    }));
}

export function MassBalanceCalculator({ profile, booking }: MassBalanceCalculatorProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const [stations, setStations] = useState<Station[]>(() => ensureStationIds(profile.stations || []));

  useEffect(() => {
    setStations(ensureStationIds(profile.stations || []));
  }, [profile]);

  const handleStationChange = (id: number, field: keyof Station, value: string | number) => {
    setStations(prevStations =>
      prevStations.map(station => {
        if (station.id === id) {
          const newStation = { ...station, [field]: value };
          if (field === 'gallons' && newStation.type === 'fuel') {
            newStation.weight = Number(value) * FUEL_WEIGHT_PER_GALLON;
          }
          return newStation;
        }
        return station;
      })
    );
  };

  const addStation = (type: string) => {
    setStations(prev => [...prev, { id: Date.now(), name: '', arm: 0, weight: 0, type }]);
  }

  const addFuelStation = () => {
    setStations(prev => [...prev, { id: Date.now(), name: 'Fuel', arm: 0, weight: 0, type: 'fuel', gallons: 0, maxGallons: 100 }]);
  };

  const removeStation = (id: number) => {
    setStations(prev => prev.filter(station => station.id !== id));
  };
  
  const handleSaveToBooking = async () => {
    if (!booking || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No booking is associated with this calculation.',
      });
      return;
    }

    const totalWeight = stations.reduce((acc, station) => acc + (Number(station.weight) || 0), profile.emptyWeight || 0);
    const totalMoment = stations.reduce((acc, station) => acc + (Number(station.weight) || 0) * (Number(station.arm) || 0), profile.emptyWeightMoment || 0);
    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
    
    const isWithinLimits = isPointInPolygon({ x: centerOfGravity, y: totalWeight }, profile.cgEnvelope || []) && totalWeight <= (profile.maxTakeoffWeight || Infinity);
    
    const stationWeights = stations.reduce((acc, station) => {
        acc[station.id] = Number(station.weight) || 0;
        return acc;
    }, {} as Record<number, number>);

    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
    
    const massAndBalanceData = {
        stationWeights,
        totalWeight,
        totalMoment,
        centerOfGravity,
        isWithinLimits,
        calculatedAt: new Date().toISOString(),
    };

    await updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });
    
    toast({
        title: 'Saved to Booking',
        description: `Mass & Balance data has been saved to booking #${booking.bookingNumber}.`,
    });
  };

  const { totalWeight, totalMoment, centerOfGravity, isWithinLimits } = useMemo(() => {
    const emptyWeight = profile.emptyWeight || 0;
    const emptyWeightMoment = profile.emptyWeightMoment || 0;

    const stationsWeight = stations.reduce((acc, station) => acc + (Number(station.weight) || 0), 0);
    const stationsMoment = stations.reduce((acc, station) => acc + (Number(station.weight) || 0) * (Number(station.arm) || 0), 0);
    
    const totalWeight = emptyWeight + stationsWeight;
    const totalMoment = emptyWeightMoment + stationsMoment;
    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;

    const isWithin = isPointInPolygon({ x: centerOfGravity, y: totalWeight }, profile.cgEnvelope || []) && totalWeight <= (profile.maxTakeoffWeight || Infinity);

    return { totalWeight, totalMoment, centerOfGravity, isWithinLimits: isWithin };
  }, [stations, profile]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Stations</CardTitle>
            <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addFuelStation}>
                    <PlusCircle className="mr-2" /> Add Fuel
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addStation('Front Seats')}>
                    <PlusCircle className="mr-2" /> Add
                </Button>
                {booking && (
                    <Button type="button" size="sm" variant="secondary">
                        <Save className="mr-2" /> Save
                    </Button>
                )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Station</TableHead>
                  <TableHead>Weight (lbs)</TableHead>
                  <TableHead>Arm (in)</TableHead>
                  <TableHead>Moment (lb-in)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                    <TableCell className="font-semibold">Basic Empty Weight</TableCell>
                    <TableCell>{profile.emptyWeight?.toFixed(2)}</TableCell>
                    <TableCell>N/A</TableCell>
                    <TableCell>{profile.emptyWeightMoment?.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                </TableRow>
                {stations.map(station => (
                  <TableRow key={station.id}>
                    <TableCell>
                      <Input
                        value={station.name}
                        onChange={e => handleStationChange(station.id, 'name', e.target.value)}
                        placeholder="Station Name"
                      />
                    </TableCell>
                    <TableCell>
                      {station.type === 'fuel' ? (
                          <div className='flex items-center gap-2'>
                            <Input
                                value={station.gallons || ''}
                                onChange={e => handleStationChange(station.id, 'gallons', e.target.value)}
                                type="number"
                                placeholder="gal"
                                className='w-20'
                            />
                            <span className='text-muted-foreground'>/ {station.maxGallons} gal</span>
                          </div>
                      ) : (
                        <Input
                          value={station.weight || ''}
                          onChange={e => handleStationChange(station.id, 'weight', e.target.value)}
                          type="number"
                          placeholder="0.00"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={station.arm || ''}
                        onChange={e => handleStationChange(station.id, 'arm', e.target.value)}
                        type="number"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      {((Number(station.weight) || 0) * (Number(station.arm) || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="icon" onClick={() => removeStation(station.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Weight:</span>
                    <span className="font-bold">{totalWeight.toFixed(2)} lbs</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Moment:</span>
                    <span className="font-bold">{totalMoment.toFixed(2)} lb-in</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Center of Gravity:</span>
                    <span className="font-bold">{centerOfGravity.toFixed(2)} in</span>
                 </div>
                 <div className={`p-4 rounded-md ${isWithinLimits ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    <div className="flex items-center gap-2">
                        {!isWithinLimits && <AlertTriangle className="text-destructive h-5 w-5" />}
                        <h4 className="font-semibold">{isWithinLimits ? 'Within Limits' : 'Out of Limits'}</h4>
                    </div>
                     {!isWithinLimits && <p className="text-sm text-destructive-foreground mt-1">Check CG envelope and max takeoff weight.</p>}
                 </div>
                 {booking && (
                    <Button onClick={handleSaveToBooking} className="w-full mt-4">
                        Save to Booking #{booking.bookingNumber}
                    </Button>
                 )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
