
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile, Station } from '@/types/aircraft';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Booking } from '@/types/booking';

interface MassBalanceFormProps {
  aircrafts: Aircraft[];
  profiles: AircraftModelProfile[];
  tenantId: string;
}

interface StationWeight extends Station {
  currentWeight: number;
}

const calculateMoment = (weight: number, arm: number) => weight * arm;

export function MassBalanceForm({ aircrafts, profiles, tenantId }: MassBalanceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const firestore = useFirestore();

  const bookingId = searchParams.get('bookingId');
  const initialAircraftId = searchParams.get('aircraftId');

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(initialAircraftId);
  
  const bookingRef = useMemoFirebase(
    () => (firestore && bookingId ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null),
    [firestore, tenantId, bookingId]
  );
  const { data: booking } = useDoc<Booking>(bookingRef);

  const [profile, setProfile] = useState<AircraftModelProfile | null>(null);
  const [stations, setStations] = useState<StationWeight[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalMoment, setTotalMoment] = useState(0);
  const [centerOfGravity, setCenterOfGravity] = useState(0);
  const [isWithinLimits, setIsWithinLimits] = useState(false);
  
  const [calculationHistory, setCalculationHistory] = useState<{ x: number, y: number, name: string }[]>([]);

  const loadProfile = useCallback((profileData: AircraftModelProfile | Aircraft) => {
    const emptyWeight = profileData.emptyWeight || 0;
    const emptyWeightMoment = profileData.emptyWeightMoment || 0;

    const initialStations: StationWeight[] = (profileData.stations || []).map((s: Station) => ({
      ...s,
      currentWeight: s.weight || 0,
    }));

    setProfile(profileData as AircraftModelProfile);
    setStations(initialStations);
    setTotalWeight(emptyWeight);
    setTotalMoment(emptyWeightMoment);
  }, []);

  useEffect(() => {
    if (booking?.massAndBalance && stations.length > 0) {
      const updatedStations = stations.map(station => ({
        ...station,
        currentWeight: booking.massAndBalance?.stationWeights[station.id] || station.weight || 0
      }));
      setStations(updatedStations);
    }
  }, [booking, stations.length]);
  
  useEffect(() => {
    if (selectedAircraftId) {
      const aircraft = aircrafts.find(a => a.id === selectedAircraftId);
      if (aircraft) {
        loadProfile(aircraft);
        setSelectedProfileId(null);
      }
    } else if (selectedProfileId) {
      const selectedProf = profiles.find(p => p.id === selectedProfileId);
      if (selectedProf) {
        loadProfile(selectedProf);
        setSelectedAircraftId(null);
      }
    }
  }, [selectedProfileId, selectedAircraftId, aircrafts, profiles, loadProfile]);
  

  const handleStationWeightChange = (id: number, newWeight: number) => {
    setStations(
      stations.map((s) => (s.id === id ? { ...s, currentWeight: newWeight } : s))
    );
  };
  
  const handleStationGallonsChange = (id: number, newGallons: number) => {
    const maxGallons = stations.find(s => s.id === id)?.maxGallons || 0;
    const clampedGallons = Math.max(0, Math.min(newGallons, maxGallons));
    setStations(
      stations.map((s) => (s.id === id ? { ...s, gallons: clampedGallons, currentWeight: clampedGallons * FUEL_WEIGHT_PER_GALLON } : s))
    );
  };

  const handleCalculate = () => {
    if (!profile) return;
    let currentTotalWeight = profile.emptyWeight || 0;
    let currentTotalMoment = profile.emptyWeightMoment || 0;

    stations.forEach((station) => {
      currentTotalWeight += station.currentWeight;
      currentTotalMoment += calculateMoment(station.currentWeight, station.arm);
    });

    const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
    const point = { x: cg, y: currentTotalWeight };
    const envelope = profile.cgEnvelope || [];
    
    const inLimits = isPointInPolygon(point, envelope);

    setTotalWeight(currentTotalWeight);
    setTotalMoment(currentTotalMoment);
    setCenterOfGravity(cg);
    setIsWithinLimits(inLimits);

    const newHistoryPoint = { x: cg, y: currentTotalWeight, name: 'Current CG' };
    setCalculationHistory([newHistoryPoint]);

    toast({
        title: 'Calculation Complete',
        description: `CG is ${cg.toFixed(2)} inches, Total Weight is ${currentTotalWeight.toFixed(2)} lbs.`,
        variant: inLimits ? 'default' : 'destructive',
    });
  };

  const handleSaveToBooking = () => {
    if (!firestore || !bookingId || !profile) return;
    
    const bookingDocRef = doc(firestore, 'tenants', tenantId, 'bookings', bookingId);
    
    const stationWeights = stations.reduce((acc, station) => {
        acc[station.id] = station.currentWeight;
        return acc;
    }, {} as {[key: string]: number});
    
    const massAndBalanceData = {
        stationWeights,
        totalWeight,
        totalMoment,
        centerOfGravity,
        isWithinLimits,
        calculatedAt: new Date().toISOString(),
    };

    setDocumentNonBlocking(bookingDocRef, { massAndBalance: massAndBalanceData }, { merge: true });

    toast({
        title: "Saved to Booking",
        description: "The mass and balance calculation has been saved to the current booking.",
    });
  }

  const chartData = useMemo(() => {
    if (!profile || !profile.cgEnvelope) return [];
    return profile.cgEnvelope.map(p => ({ x: p.x, y: p.y }));
  }, [profile]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Mass & Balance Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="x" name="CG (inches)" unit="in" domain={[profile?.xMin || 75, profile?.xMax || 95]} />
                <YAxis type="number" dataKey="y" name="Weight (lbs)" unit="lbs" domain={[profile?.yMin || 1800, profile?.yMax || 2600]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Area type="monotone" dataKey="y" data={chartData} stroke="hsl(var(--foreground))" fill="hsl(var(--primary) / 0.2)" name="CG Envelope" />
                <Scatter name="Current CG" data={calculationHistory} fill="#8884d8" />
                 {profile?.maxTakeoffWeight && (
                    <ReferenceLine y={profile.maxTakeoffWeight} label={{ value: `Max TO (${profile.maxTakeoffWeight} lbs)`, position: 'insideTopRight' }} stroke="red" strokeDasharray="3 3" />
                )}
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Load a profile or manually enter weights. All weights are in lbs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
             <div className='flex gap-4 mb-6'>
                <Select onValueChange={setSelectedProfileId} value={selectedProfileId || ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="Load Saved Profile" />
                    </SelectTrigger>
                    <SelectContent>
                        {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select onValueChange={setSelectedAircraftId} value={selectedAircraftId || ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="Load from Aircraft Registration" />
                    </SelectTrigger>
                    <SelectContent>
                        {aircrafts.map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber} ({a.model})</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
             
             {profile && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stations.map(station => (
                        <div key={station.id} className="space-y-2">
                            <Label htmlFor={`station-${station.id}`}>{station.name} (Arm: {station.arm}in)</Label>
                            {station.type === 'fuel' ? (
                                <div className="flex items-center gap-2">
                                     <Input
                                        id={`station-gallons-${station.id}`}
                                        type="number"
                                        value={station.gallons || ''}
                                        onChange={(e) => handleStationGallonsChange(station.id, parseFloat(e.target.value))}
                                        placeholder="Gallons"
                                    />
                                    <Input
                                        id={`station-${station.id}`}
                                        type="number"
                                        value={station.currentWeight}
                                        onChange={(e) => handleStationWeightChange(station.id, parseFloat(e.target.value))}
                                        readOnly
                                        className="bg-muted"
                                    />
                                </div>
                            ) : (
                                <Input
                                    id={`station-${station.id}`}
                                    type="number"
                                    value={station.currentWeight}
                                    onChange={(e) => handleStationWeightChange(station.id, parseFloat(e.target.value))}
                                    placeholder="Weight (lbs)"
                                />
                            )}
                        </div>
                    ))}
                 </div>
             )}
            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                {bookingId && <Button onClick={handleSaveToBooking} variant="secondary">Save to Booking</Button>}
                <Button onClick={handleCalculate} disabled={!profile}>Calculate</Button>
            </div>

            {profile && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 border rounded-lg">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Weight</p>
                        <p className="text-2xl font-bold">{totalWeight.toFixed(2)} lbs</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Moment</p>
                        <p className="text-2xl font-bold">{totalMoment.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Center of Gravity</p>
                        <p className="text-2xl font-bold">{centerOfGravity.toFixed(2)} in</p>
                    </div>
                     <div className="text-center">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className={`text-2xl font-bold ${isWithinLimits ? 'text-green-600' : 'text-red-600'}`}>
                            {isWithinLimits ? 'In Limits' : 'Out of Limits'}
                        </p>
                    </div>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    