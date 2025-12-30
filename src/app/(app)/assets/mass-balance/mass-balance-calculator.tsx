'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon } from '@/lib/utils';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile } from '../page';
import type { Booking } from '@/types/booking';

interface Station extends NonNullable<AircraftModelProfile['stations']>[0] {}

function camelCase(str: string) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
    index === 0 ? word.toLowerCase() : word.toUpperCase()
  ).replace(/\s+/g, '');
}

export function MassBalanceCalculator({
  profile,
  aircraft,
  booking,
}: {
  profile: AircraftModelProfile;
  aircraft: Aircraft | null;
  booking: Booking | null;
}) {
  const [stations, setStations] = useState<Station[]>(() => 
    booking?.massAndBalance 
      ? (profile.stations || []).map(pStation => {
          const bookingStationKey = camelCase(pStation.name);
          const bookingData = (booking.massAndBalance as any)[bookingStationKey];
          return bookingData ? { ...pStation, weight: bookingData.weight || 0 } : pStation;
        })
      : profile.stations || []
  );

  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();

  const totals = useMemo(() => {
    let totalWeight = profile.emptyWeight || 0;
    let totalMoment = profile.emptyWeightMoment || 0;
    
    stations.forEach(station => {
      totalWeight += Number(station.weight || 0);
      totalMoment += Number(station.weight || 0) * station.arm;
    });
    return { totalWeight, totalMoment };
  }, [stations, profile]);

  const centerOfGravity = useMemo(() => {
    return totals.totalWeight > 0 ? totals.totalMoment / totals.totalWeight : 0;
  }, [totals]);

  const isWithinLimits = useMemo(() => {
    if (!profile.cgEnvelope) return true;
    
    const isWeightOk = totals.totalWeight <= (profile.maxTakeoffWeight || Infinity);
    const isCgOk = isPointInPolygon({ x: centerOfGravity, y: totals.totalWeight }, profile.cgEnvelope);

    return isWeightOk && isCgOk;
  }, [totals, centerOfGravity, profile]);


  const handleWeightChange = (id: number, value: string) => {
    const newWeight = parseFloat(value);
    setStations(prevStations =>
      prevStations.map(station =>
        station.id === id
          ? { ...station, weight: isNaN(newWeight) ? 0 : newWeight }
          : station
      )
    );
  };
  
  const handleGallonsChange = (id: number, value: string) => {
      const newGallons = parseFloat(value);
      setStations(prevStations =>
        prevStations.map(station =>
          station.id === id
            ? { ...station, weight: (isNaN(newGallons) ? 0 : newGallons) * FUEL_WEIGHT_PER_GALLON, gallons: isNaN(newGallons) ? 0 : newGallons }
            : station
        )
      );
  }

  const handleSaveToBooking = async () => {
    if (!booking || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No active booking to save to.' });
      return;
    }
    
    const massAndBalanceData = stations.reduce((acc, station) => {
      const key = camelCase(station.name);
      acc[key] = {
        weight: Number(station.weight || 0),
        moment: Number(station.weight || 0) * station.arm
      };
      return acc;
    }, {} as Record<string, { weight: number, moment: number }>);
    
    const tenantId = 'safeviate';
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings/${booking.id}`);
    
    try {
        await updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });
        toast({
            title: 'Saved to Booking',
            description: `Mass & Balance data has been saved to booking #${booking.bookingNumber}.`
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message,
        });
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Mass &amp; Balance Calculator</CardTitle>
        <CardDescription>
          For {aircraft?.tailNumber || profile.profileName} - Empty Weight: {profile.emptyWeight} lbs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead className="w-[150px]">Weight (lbs)</TableHead>
              {stations.some(s => s.type === 'fuel') && <TableHead className="w-[150px]">Gallons</TableHead>}
              <TableHead>Arm (in)</TableHead>
              <TableHead>Moment (lbs-in)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.map(station => (
              <TableRow key={station.id}>
                <TableCell className="font-medium">{station.name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={station.weight || ''}
                    onChange={e => handleWeightChange(station.id, e.target.value)}
                    placeholder="0"
                    disabled={station.type === 'fuel'}
                  />
                </TableCell>
                {station.type === 'fuel' &&
                    <TableCell>
                         <Input
                            type="number"
                            value={station.gallons || ''}
                            onChange={(e) => handleGallonsChange(station.id, e.target.value)}
                            placeholder="0"
                            max={station.maxGallons}
                         />
                    </TableCell>
                }
                <TableCell>{station.arm}</TableCell>
                <TableCell>{((station.weight || 0) * station.arm).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 border-t pt-6">
        <div className="flex justify-between w-full font-bold text-lg">
            <span>Total Weight: {totals.totalWeight.toFixed(2)} lbs</span>
            <span>Total Moment: {totals.totalMoment.toFixed(2)} lbs-in</span>
        </div>
        <div className="flex justify-between w-full font-bold text-lg">
            <span>Center of Gravity: {centerOfGravity.toFixed(2)} in</span>
             <span className={isWithinLimits ? "text-green-600" : "text-red-600"}>
                {isWithinLimits ? 'Within Limits' : 'OUT OF LIMITS'}
            </span>
        </div>
        {booking && <Button onClick={handleSaveToBooking}>Save to Booking #{booking.bookingNumber}</Button>}
      </CardFooter>
    </Card>
  );
}
