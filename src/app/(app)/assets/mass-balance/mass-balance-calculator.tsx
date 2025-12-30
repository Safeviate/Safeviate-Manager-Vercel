
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Expand, Save, Droplets } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn, isPointInPolygon } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MassBalanceChart } from './mass-balance-chart';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile } from '@/types/aircraft';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';

type Station = {
  id: number;
  name: string;
  weight: number;
  arm: number;
  type: 'station' | 'fuel';
  gallons?: number;
  maxGallons?: number;
};

const AddFuelDialog = ({ onAddFuel }: { onAddFuel: (gallons: number, arm: number, maxGallons: number) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [gallons, setGallons] = useState(0);
    const [arm, setArm] = useState(0);
    const [maxGallons, setMaxGallons] = useState(0);

    const handleSave = () => {
        onAddFuel(gallons, arm, maxGallons);
        setIsOpen(false);
        setGallons(0);
        setArm(0);
        setMaxGallons(0);
    };
    
    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button>
                    <Droplets className="mr-2" /> Add Fuel
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Add Fuel Station</AlertDialogTitle>
                    <AlertDialogDescription>
                        Define the fuel tank characteristics. The weight will be calculated automatically.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="max-gallons">Max Gallons</Label>
                            <Input id="max-gallons" type="number" value={maxGallons} onChange={e => setMaxGallons(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="arm">Arm</Label>
                            <Input id="arm" type="number" value={arm} onChange={e => setArm(Number(e.target.value))} />
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSave}>Add</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function MassBalanceCalculator() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  
  const [stations, setStations] = useState<Station[]>([]);
  const [cgEnvelope, setCgEnvelope] = useState<{ x: number, y: number }[]>([]);
  const [xMin, setXMin] = useState(0);
  const [xMax, setXMax] = useState(100);
  const [yMin, setYMin] = useState(0);
  const [yMax, setYMax] = useState(3000);
  const [maxTakeoffWeight, setMaxTakeoffWeight] = useState(0);

  // --- Data Fetching ---
  const profilesQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/massAndBalance`) : null), [firestore, tenantId]);
  const aircraftsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
  const bookingQuery = useMemoFirebase(() => {
    const bookingId = searchParams.get('bookingId');
    if (!firestore || !bookingId) return null;
    return doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
  }, [firestore, tenantId, searchParams]);

  const { data: profiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);

  // --- Effects ---
  useEffect(() => {
    const profileId = searchParams.get('profileId');
    const aircraftId = searchParams.get('aircraftId');
    if (profileId) {
      setSelectedProfileId(profileId);
    }
    if (aircraftId) {
        setSelectedAircraftId(aircraftId);
    }
  }, [searchParams]);

  useEffect(() => {
    const profile = profiles?.find(p => p.id === selectedProfileId);
    if (profile) {
      setStations(profile.stations || []);
      setCgEnvelope(profile.cgEnvelope || []);
      setXMin(profile.xMin || 0);
      setXMax(profile.xMax || 100);
      setYMin(profile.yMin || 0);
      setYMax(profile.yMax || 3000);
      setMaxTakeoffWeight(profile.maxTakeoffWeight || 0);
    }
  }, [selectedProfileId, profiles]);

  // --- Calculations ---
  const moments = useMemo(() => stations.map(s => s.weight * s.arm), [stations]);
  const totalWeight = useMemo(() => stations.reduce((acc, s) => acc + s.weight, 0), [stations]);
  const totalMoment = useMemo(() => moments.reduce((acc, m) => acc + m, 0), [moments]);
  const centerOfGravity = useMemo(() => totalWeight > 0 ? totalMoment / totalWeight : 0, [totalWeight, totalMoment]);
  
  const isWithinCgEnvelope = useMemo(() => {
    return isPointInPolygon({ x: centerOfGravity, y: totalWeight }, cgEnvelope);
  }, [centerOfGravity, totalWeight, cgEnvelope]);

  const isOverweight = useMemo(() => totalWeight > maxTakeoffWeight, [totalWeight, maxTakeoffWeight]);


  // --- Handlers ---
  const handleStationChange = (index: number, field: keyof Station, value: string) => {
    const newStations = [...stations];
    const station = newStations[index];
    const numericValue = parseFloat(value) || 0;
    
    if (station.type === 'fuel' && field === 'gallons') {
        station.gallons = numericValue;
        station.weight = numericValue * FUEL_WEIGHT_PER_GALLON;
    } else if (field === 'weight') {
        station.weight = numericValue;
        if(station.type === 'fuel') {
            station.gallons = numericValue / FUEL_WEIGHT_PER_GALLON;
        }
    } else if (field === 'arm' || field === 'name') {
       (station[field] as any) = field === 'name' ? value : numericValue;
    }
    setStations(newStations);
  };
  
  const addStation = () => setStations([...stations, { id: Date.now(), name: '', weight: 0, arm: 0, type: 'station' }]);
  const removeStation = (index: number) => setStations(stations.filter((_, i) => i !== index));

  const addFuelStation = (gallons: number, arm: number, maxGallons: number) => {
    setStations([...stations, { id: Date.now(), name: 'Fuel', weight: gallons * FUEL_WEIGHT_PER_GALLON, arm, type: 'fuel', gallons, maxGallons}]);
  };
  
  const autoFitAxes = () => {
    if (cgEnvelope.length < 2) return;
    const x = cgEnvelope.map(p => p.x);
    const y = cgEnvelope.map(p => p.y);
    setXMin(Math.floor(Math.min(...x) - 5));
    setXMax(Math.ceil(Math.max(...x) + 5));
    setYMin(Math.floor(Math.min(...y) / 100) * 100 - 100);
    setYMax(Math.ceil(Math.max(...y) / 100) * 100 + 100);
  };

  const camelize = (str: string) => str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');

  const handleSaveToBooking = () => {
    const bookingId = searchParams.get('bookingId');
    if (!firestore || !bookingId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No booking is linked to this calculation.' });
      return;
    }

    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    const massAndBalanceData = {
      stationWeights: stations.reduce((acc, station) => {
        acc[camelize(station.name)] = {
          weight: station.weight,
          moment: station.weight * station.arm,
        };
        return acc;
      }, {} as Record<string, { weight: number, moment: number }>),
      totalWeight,
      totalMoment,
      centerOfGravity,
      isWithinLimits: isWithinCgEnvelope && !isOverweight,
      calculatedAt: new Date().toISOString(),
    };

    setDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData }, { merge: true });
    
    toast({
      title: "Saved to Booking",
      description: "The mass and balance calculations have been saved to the booking."
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Select onValueChange={setSelectedProfileId} value={selectedProfileId || ''} disabled={isLoadingProfiles}>
            <SelectTrigger><SelectValue placeholder="Select a profile..." /></SelectTrigger>
            <SelectContent>
                {profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>)}
            </SelectContent>
        </Select>
         <Select onValueChange={setSelectedAircraftId} value={selectedAircraftId || ''} disabled={isLoadingAircrafts}>
            <SelectTrigger><SelectValue placeholder="Select an aircraft..." /></SelectTrigger>
            <SelectContent>
                {aircrafts?.map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber} - {a.model}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,2fr] gap-6 items-start">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Loading Stations</CardTitle>
                            <CardDescription>
                                Add or remove loading stations for the aircraft.
                            </CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                             <Button><Save className="mr-2" /> Save</Button>
                            <AddFuelDialog onAddFuel={addFuelStation} />
                            <Button onClick={() => addStation()}>
                                <PlusCircle className="mr-2" /> Add
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-x-2 items-center font-medium text-sm text-muted-foreground px-2">
                        <span>Station Name</span>
                        <span className="text-right">Weight</span>
                        <span className="text-right">Arm</span>
                        <span className="text-right">Moment</span>
                        <span></span>
                    </div>
                    {stations.map((station, index) => (
                        <div key={station.id} className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-x-2 items-center">
                            <Input value={station.name} onChange={e => handleStationChange(index, 'name', e.target.value)} disabled={index === 0} />
                            <Input type="number" value={station.weight.toString()} onChange={e => handleStationChange(index, 'weight', e.target.value)} className="w-24 text-right" />
                            <Input type="number" value={station.arm.toString()} onChange={e => handleStationChange(index, 'arm', e.target.value)} className="w-20 text-right" disabled={index === 0} />
                            <Input value={moments[index].toFixed(0)} className="w-28 text-right" readOnly disabled />
                            <Button variant="ghost" size="icon" onClick={() => removeStation(index)} disabled={index === 0}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                             {station.type === 'fuel' && (
                                <>
                                    <Label htmlFor={`gallons-${station.id}`} className="text-right pr-2">Gallons</Label>
                                    <div className="relative">
                                        <Input
                                            id={`gallons-${station.id}`}
                                            type="number"
                                            value={station.gallons?.toFixed(2) || '0.00'}
                                            onChange={(e) => handleStationChange(index, 'gallons', e.target.value)}
                                            className="w-24 text-right pr-12"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Max: {station.maxGallons}</span>
                                    </div>
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                    <div></div>
                                </>
                             )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Chart Axis Limits</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="min-cg">Min CG</Label>
                        <Input id="min-cg" type="number" value={xMin} onChange={e => setXMin(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="max-cg">Max CG</Label>
                        <Input id="max-cg" type="number" value={xMax} onChange={e => setXMax(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="min-weight">Min Weight</Label>
                        <Input id="min-weight" type="number" value={yMin} onChange={e => setYMin(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="max-weight">Max Weight</Label>
                        <Input id="max-weight" type="number" value={yMax} onChange={e => setYMax(Number(e.target.value))} />
                    </div>
                </CardContent>
                <CardFooter>
                     <Button variant="outline" onClick={autoFitAxes}>
                        <Expand className="mr-2" /> Auto-Fit Axes
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <div className="space-y-6">
            <Card>
                 <CardHeader>
                    <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Total Weight</Label>
                        <Input value={totalWeight.toFixed(2)} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>Total Moment</Label>
                        <Input value={totalMoment.toFixed(2)} readOnly disabled />
                    </div>
                     <div className="space-y-2 col-span-2">
                        <Label>Center of Gravity</Label>
                        <Input value={centerOfGravity.toFixed(2)} readOnly disabled />
                    </div>
                </CardContent>
                 <CardFooter className={cn(
                    'p-4 rounded-b-lg text-white font-bold text-center flex items-center justify-center',
                    (isWithinCgEnvelope && !isOverweight) ? 'bg-green-500' : 'bg-red-500'
                )}>
                    {isOverweight ? 'Overweight' : (isWithinCgEnvelope ? 'Within Limits' : 'Out of CG Limits')}
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Mass & Balance Chart</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="aspect-square w-full">
                       <MassBalanceChart
                            envelope={cgEnvelope}
                            centerOfGravity={centerOfGravity}
                            totalWeight={totalWeight}
                            xMin={xMin}
                            xMax={xMax}
                            yMin={yMin}
                            yMax={yMax}
                            maxTakeoffWeight={maxTakeoffWeight}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      {searchParams.get('bookingId') && (
        <div className="flex justify-end pt-6">
            <Button size="lg" onClick={handleSaveToBooking}>Save to Booking</Button>
        </div>
      )}
    </div>
  );

    