'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Save, Plane, BookCopy } from 'lucide-react';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { MassBalanceChart } from './mass-balance-chart';
import type { AircraftModelProfile, Station } from '@/types/aircraft';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface MassBalanceCalculatorProps {
  aircraftProfile: AircraftModelProfile;
  onSaveAsProfile: (profileName: string, stations: Station[]) => void;
  onAssignToAircraft: (profileId: string) => void;
  onClearAircraftMAndB: () => void;
  isAssigned: boolean;
}

export function MassBalanceCalculator({
  aircraftProfile,
  onSaveAsProfile,
  onAssignToAircraft,
  onClearAircraftMAndB,
  isAssigned,
}: MassBalanceCalculatorProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [profileName, setProfileName] = useState(aircraftProfile.profileName || '');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const bookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
    [firestore, tenantId]
  );
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);

  useEffect(() => {
    setStations(JSON.parse(JSON.stringify(aircraftProfile.stations || [])));
    setProfileName(aircraftProfile.profileName || '');
  }, [aircraftProfile]);

  const handleStationChange = (index: number, field: keyof Station, value: string | number) => {
    const newStations = [...stations];
    const station = newStations[index];
    if (!station) return;

    let numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) numericValue = 0;

    if (field === 'weight') {
        station.weight = numericValue;
        if (station.type === 'fuel') {
            station.gallons = numericValue / FUEL_WEIGHT_PER_GALLON;
        }
    } else if (field === 'gallons' && station.type === 'fuel') {
        station.gallons = numericValue;
        station.weight = numericValue * FUEL_WEIGHT_PER_GALLON;
    }
    
    setStations(newStations);
  };
  
  const handleSaveToBooking = () => {
    if (!selectedBookingId || !firestore) {
      toast({
        variant: "destructive",
        title: "No Booking Selected",
        description: "Please select a booking to save the M&B data to.",
      });
      return;
    }

    const { totalWeight, totalMoment, centerOfGravity } = calculatedCg;

    const massAndBalanceData = stations.reduce((acc, station) => {
      const stationKey = station.name.toLowerCase().replace(/\s+/g, '');
      acc[stationKey] = {
        weight: station.weight,
        moment: station.weight * station.arm,
      };
      return acc;
    }, {} as Record<string, { weight: number, moment: number }>);
    
    // Add totals
    massAndBalanceData['total'] = { weight: totalWeight, moment: totalMoment };
    massAndBalanceData['centerOfGravity'] = { weight: centerOfGravity, moment: 0 };


    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, selectedBookingId);
    updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });

    toast({
      title: "Saved to Booking",
      description: `Mass & Balance data has been saved to booking #${bookings?.find(b => b.id === selectedBookingId)?.bookingNumber}.`,
    });
  };

  const calculatedCg = useMemo(() => {
    const currentTotalWeight = stations.reduce((acc, station) => acc + (station.weight || 0), 0);
    const currentTotalMoment = stations.reduce((acc, station) => acc + (station.weight || 0) * (station.arm || 0), 0);
    const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
    
    const isCGInEnvelope = false; // Placeholder
    const isWeightOk = currentTotalWeight <= (aircraftProfile.maxTakeoffWeight || Infinity);
    
    return {
      totalWeight: currentTotalWeight,
      totalMoment: currentTotalMoment,
      centerOfGravity: cg,
      isCGInEnvelope,
      isWeightOk,
    };
  }, [stations, aircraftProfile]);

  const { totalWeight, totalMoment, centerOfGravity, isWeightOk, isCGInEnvelope } = calculatedCg;


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle>{profileName || 'New Mass & Balance Profile'}</CardTitle>
          <CardDescription>
            Enter weights for each station to calculate the aircraft's center of gravity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stations.map((station, index) => (
              <div key={station.id} className="grid grid-cols-3 gap-4 items-center">
                <Label htmlFor={`station-${index}`} className="text-right">
                  {station.name}
                </Label>
                <div className="col-span-2 grid grid-cols-3 gap-2">
                  <Input
                    id={`station-${index}`}
                    type="number"
                    value={station.weight.toFixed(2)}
                    onChange={(e) => handleStationChange(index, 'weight', e.target.value)}
                    className="col-span-1"
                  />
                  {station.type === 'fuel' && (
                    <>
                       <Input
                            type="number"
                            value={station.gallons?.toFixed(2) ?? ''}
                            onChange={(e) => handleStationChange(index, 'gallons', e.target.value)}
                            placeholder="Gallons"
                            className="col-span-1"
                        />
                         <span className="col-span-1 text-sm text-muted-foreground self-center">
                            / {station.maxGallons || 'N/A'} gal
                        </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 justify-end border-t pt-6">
            <div className="flex-grow flex items-center gap-2">
                <Select onValueChange={setSelectedBookingId} value={selectedBookingId} disabled={isLoadingBookings}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder={isLoadingBookings ? "Loading bookings..." : "Select a booking to save to..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {(bookings || []).map(b => (
                            <SelectItem key={b.id} value={b.id}>
                                #{b.bookingNumber} - {b.type} ({b.date})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Button onClick={handleSaveToBooking} disabled={!selectedBookingId}>
                    <BookCopy className="mr-2" /> Save to Booking
                </Button>
            </div>
            <Button variant="secondary" onClick={() => onAssignToAircraft(aircraftProfile.id)} disabled={!aircraftProfile.id || isAssigned}>
                <Plane className="mr-2" /> {isAssigned ? 'Assigned to Aircraft' : 'Assign to Aircraft'}
            </Button>
            {isAssigned && (
                <Button variant="destructive" onClick={onClearAircraftMAndB}>
                    Clear Aircraft M&amp;B
                </Button>
            )}
            <Button onClick={() => onSaveAsProfile(profileName, stations)}>
                <Save className="mr-2" /> Save as New Profile
            </Button>
        </CardFooter>
      </Card>
      <div className="space-y-6">
        <MassBalanceChart
            aircraftProfile={aircraftProfile}
            calculatedCg={{
              x: calculatedCg.centerOfGravity,
              y: calculatedCg.totalWeight,
            }}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Weight</CardDescription>
                    <CardTitle className={`text-2xl ${isWeightOk ? '' : 'text-destructive'}`}>
                        {totalWeight.toFixed(2)} lbs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">
                        Max: {aircraftProfile.maxTakeoffWeight || 'N/A'} lbs
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Moment</CardDescription>
                    <CardTitle className="text-2xl">
                        {totalMoment.toFixed(2)}
                    </CardTitle>
                </CardHeader>
                 <CardContent>
                    <p className="text-xs text-muted-foreground">&nbsp;</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>C.G.</CardDescription>
                     <CardTitle className={`text-2xl ${isCGInEnvelope ? '' : 'text-destructive'}`}>
                        {centerOfGravity.toFixed(2)} in
                    </CardTitle>
                </CardHeader>
                 <CardContent>
                    <p className="text-xs text-muted-foreground">&nbsp;</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Status</CardDescription>
                    <CardTitle className={`text-2xl ${isWeightOk && isCGInEnvelope ? 'text-green-600' : 'text-destructive'}`}>
                        {isWeightOk && isCGInEnvelope ? 'In Limits' : 'Out of Limits'}
                    </CardTitle>
                </CardHeader>
                 <CardContent>
                    <p className="text-xs text-muted-foreground">&nbsp;</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
