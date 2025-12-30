'use client';

import { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftModelProfile } from '@/types/aircraft';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save } from 'lucide-react';
import { MassBalanceChart } from './mass-balance-chart';
import { isPointInPolygon } from '@/lib/utils';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';

interface Station {
  id: number;
  name: string;
  weight: number;
  arm: number;
  type: 'crew' | 'pax' | 'cargo' | 'fuel';
  gallons?: number;
  maxGallons?: number;
}

const toCamelCase = (str: string) => {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
};


function MassBalanceCalculator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const bookingId = searchParams.get('bookingId');
  const aircraftId = searchParams.get('aircraftId');
  const profileId = searchParams.get('profileId');
  
  const [profileName, setProfileName] = useState('');
  const [stations, setStations] = useState<Station[]>([]);

  const bookingRef = useMemo(
    () => (firestore && bookingId ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null),
    [firestore, bookingId, tenantId]
  );
  const { data: booking } = useDoc<Booking>(bookingRef);
  
  const aircraftRef = useMemo(
      () => (firestore && aircraftId ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
      [firestore, aircraftId, tenantId]
  );
  const { data: aircraft } = useDoc<Aircraft>(aircraftRef);
  
  const profileRef = useMemo(
      () => (firestore && profileId ? doc(firestore, 'tenants', tenantId, 'massAndBalance', profileId) : null),
      [firestore, profileId, tenantId]
  );
  const { data: profile, isLoading: isLoadingProfile } = useDoc<AircraftModelProfile>(profileRef);

  useEffect(() => {
    if (profile) {
        setProfileName(profile.profileName);
        setStations(profile.stations || []);
    } else if (aircraft) {
        // Fallback to aircraft data if no profile is loaded
        setProfileName(aircraft.model || 'Aircraft Profile');
        const defaultStations: Station[] = [
            { id: 1, name: "Front Seats", weight: 0, arm: aircraft.stationArms?.frontSeats || 0, type: 'crew' },
            { id: 2, name: "Rear Seats", weight: 0, arm: aircraft.stationArms?.rearSeats || 0, type: 'pax' },
            { id: 3, name: "Fuel", weight: 0, arm: aircraft.stationArms?.fuel || 0, type: 'fuel', gallons: 0, maxGallons: 50 },
            { id: 4, name: "Baggage 1", weight: 0, arm: aircraft.stationArms?.baggage1 || 0, type: 'cargo' },
        ];
        setStations(defaultStations);
    }
  }, [profile, aircraft]);
  
  const {
    totalWeight,
    totalMoment,
    zeroFuelWeight,
    zeroFuelMoment,
    cg,
    zeroFuelCg,
    isWithinEnvelope
  } = useMemo(() => {
    const emptyWeight = profile?.emptyWeight || aircraft?.emptyWeight || 0;
    const emptyMoment = profile?.emptyWeightMoment || aircraft?.emptyWeightMoment || 0;
    const cgEnvelope = profile?.cgEnvelope || aircraft?.cgEnvelope || [];

    const stationsMoment = stations.reduce((sum, station) => sum + station.weight * station.arm, 0);
    const zfm = stations.filter(s => s.type !== 'fuel').reduce((sum, station) => sum + station.weight, 0) + emptyWeight;
    const zfMoment = stations.filter(s => s.type !== 'fuel').reduce((sum, station) => sum + station.weight * station.arm, 0) + emptyMoment;
    
    const totalW = stations.reduce((sum, station) => sum + station.weight, 0) + emptyWeight;
    const totalM = stationsMoment + emptyMoment;
    const currentCg = totalW > 0 ? totalM / totalW : 0;
    const zeroFuelCgVal = zfm > 0 ? zfMoment / zfm : 0;

    const point = { x: currentCg, y: totalW };
    const withinEnvelope = isPointInPolygon(point, cgEnvelope.map(p => ({ x: p.cg, y: p.weight })));
    
    return {
      totalWeight: totalW,
      totalMoment: totalM,
      zeroFuelWeight: zfm,
      zeroFuelMoment: zfMoment,
      cg: currentCg,
      zeroFuelCg: zeroFuelCgVal,
      isWithinEnvelope: withinEnvelope
    };
  }, [stations, profile, aircraft]);

  const handleStationChange = (id: number, field: keyof Station, value: number) => {
    setStations(prevStations =>
      prevStations.map(station => {
        if (station.id === id) {
          if (field === 'gallons' && station.type === 'fuel') {
            return { ...station, gallons: value, weight: value * FUEL_WEIGHT_PER_GALLON };
          }
          return { ...station, [field]: value };
        }
        return station;
      })
    );
  };
  
  const handleSaveToBooking = () => {
    if (!firestore || !bookingId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No booking is being referenced.",
      });
      return;
    }
    const bookingRef = doc(firestore, 'tenants', tenantId, 'bookings', bookingId);
    
    const massAndBalance = stations.reduce((acc, station) => {
      const key = toCamelCase(station.name);
      if (key) {
        acc[key] = {
          weight: station.weight,
          moment: station.weight * station.arm,
        };
      }
      return acc;
    }, {} as { [key: string]: { weight: number, moment: number } });

    updateDocumentNonBlocking(bookingRef, { massAndBalance });

    toast({
      title: "Saved to Booking",
      description: "The mass and balance has been saved to the booking.",
    });
  };
  
  const handleSaveAsProfile = () => {
      if (!firestore) return;
      if (!profileName.trim()) {
          toast({ variant: 'destructive', title: 'Name required', description: 'Please provide a name for the profile.' });
          return;
      }
      const profilesCollection = collection(firestore, `tenants/${tenantId}/massAndBalance`);
      const newProfileData: Omit<AircraftModelProfile, 'id'> = {
          profileName,
          emptyWeight: aircraft?.emptyWeight,
          emptyWeightMoment: aircraft?.emptyWeightMoment,
          maxTakeoffWeight: aircraft?.maxTakeoffWeight,
          maxLandingWeight: aircraft?.maxLandingWeight,
          stationArms: aircraft?.stationArms,
          cgEnvelope: aircraft?.cgEnvelope,
          xMin: profile?.xMin,
          xMax: profile?.xMax,
          yMin: profile?.yMin,
          yMax: profile?.yMax,
          stations: stations,
      }
      addDocumentNonBlocking(profilesCollection, newProfileData);
      toast({ title: 'Profile Saved', description: `New profile "${profileName}" created.` });
  };
  

  if (isLoadingProfile && profileId) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Mass & Balance Calculator</CardTitle>
          <CardDescription>
            For Aircraft: {aircraft?.tailNumber || '...'} ({aircraft?.model || 'Select an aircraft'})
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
            {stations.map(station => (
              <div key={station.id} className="grid grid-cols-5 items-center gap-4 p-4 border rounded-lg">
                <Label className="col-span-1">{station.name}</Label>
                <div className="col-span-2">
                  <Slider
                    value={[station.weight]}
                    onValueChange={([val]) => handleStationChange(station.id, 'weight', val)}
                    max={station.type === 'fuel' ? (station.maxGallons || 50) * FUEL_WEIGHT_PER_GALLON : 500}
                    step={1}
                    disabled={station.type === 'fuel'}
                  />
                  {station.type === 'fuel' && (
                     <Slider
                        className="mt-2"
                        value={[station.gallons || 0]}
                        onValueChange={([val]) => handleStationChange(station.id, 'gallons', val)}
                        max={station.maxGallons || 50}
                        step={1}
                    />
                  )}
                </div>
                 <div className="col-span-1">
                    <Input
                        type="number"
                        value={station.weight.toFixed(2)}
                        onChange={(e) => handleStationChange(station.id, 'weight', parseFloat(e.target.value) || 0)}
                        disabled={station.type === 'fuel'}
                    />
                    {station.type === 'fuel' && (
                      <Input
                          className="mt-2"
                          type="number"
                          value={station.gallons || 0}
                          onChange={(e) => handleStationChange(station.id, 'gallons', parseFloat(e.target.value) || 0)}
                      />
                    )}
                 </div>
                 <div className="col-span-1 text-center">
                    <p className="text-sm font-medium">{(station.weight * station.arm).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Moment (lbs-in)</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
              {bookingId && <Button onClick={handleSaveToBooking}>Save to Booking #{booking?.bookingNumber}</Button>}
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalWeight.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Weight (lbs)</p>
            </div>
             <div className="text-center">
              <p className="text-2xl font-bold">{totalMoment.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Moment</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{cg.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">C.G. (in)</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${isWithinEnvelope ? 'text-green-500' : 'text-red-500'}`}>
                {isWithinEnvelope ? 'In Limits' : 'Out of Limits'}
              </p>
              <p className="text-sm text-muted-foreground">Status</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>CG Envelope</CardTitle>
            </CardHeader>
            <CardContent>
                <MassBalanceChart
                    cgEnvelope={profile?.cgEnvelope || aircraft?.cgEnvelope || []}
                    zeroFuel={{ x: zeroFuelCg, y: zeroFuelWeight }}
                    takeoff={{ x: cg, y: totalWeight }}
                    xMin={profile?.xMin}
                    xMax={profile?.xMax}
                    yMin={profile?.yMin}
                    yMax={profile?.yMax}
                />
                 <div className="mt-4 flex flex-col gap-2">
                    <Input 
                      placeholder="Enter new profile name..." 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                    <Button onClick={handleSaveAsProfile}>
                        <Save className="mr-2 h-4 w-4" /> Save as new profile
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Suspense boundary for client components using searchParams
export default function MassBalanceCalculatorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MassBalanceCalculator />
        </Suspense>
    );
}
