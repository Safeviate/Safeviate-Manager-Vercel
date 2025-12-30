
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Droplets, Save } from 'lucide-react';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon } from '@/lib/utils';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, Line } from 'recharts';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile } from '../../assets/mass-balance-profiles/page';
import type { Booking } from '@/types/booking';
import { useToast } from '@/hooks/use-toast';
import { updateBooking } from '../../operations/bookings/booking-functions';
import { useFirestore } from '@/firebase';

type Station = {
  id: number;
  name: string;
  weight: number;
  arm: number;
  type: 'basic' | 'item' | 'fuel';
  gallons?: number;
  maxGallons?: number;
};

const camelCase = (str: string) => {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
};


interface MassBalanceCalculatorProps {
  aircrafts: Aircraft[];
  profiles: AircraftModelProfile[];
  booking?: Booking | null;
  tenantId: string;
}

function MassBalanceCalculator({ aircrafts, profiles, booking, tenantId }: MassBalanceCalculatorProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [stations, setStations] = useState<Station[]>([
    { id: 1, name: 'Basic Empty Weight', weight: 0, arm: 0, type: 'basic' },
    { id: 2, name: 'Front Seats', weight: 0, arm: 0, type: 'item' },
    { id: 3, name: 'Rear Seats', weight: 0, arm: 0, type: 'item' },
  ]);
  const [cgEnvelope, setCgEnvelope] = useState<{ x: number; y: number }[]>([]);
  const [chartAxisLimits, setChartAxisLimits] = useState({ xMin: 0, xMax: 100, yMin: 0, yMax: 3000 });
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(booking?.aircraftId || null);

  useEffect(() => {
    if (booking?.aircraftId) {
        handleSelectAircraft(booking.aircraftId);
    }
  }, [booking?.aircraftId, aircrafts]);

  const moments = useMemo(() => stations.map(s => s.weight * s.arm), [stations]);
  const totalWeight = useMemo(() => stations.reduce((acc, s) => acc + s.weight, 0), [stations]);
  const totalMoment = useMemo(() => moments.reduce((acc, m) => acc + m, 0), [moments]);
  const centerOfGravity = useMemo(() => (totalWeight > 0 ? totalMoment / totalWeight : 0), [totalWeight, totalMoment]);
  const isWithinCgEnvelope = useMemo(() => isPointInPolygon({ x: centerOfGravity, y: totalWeight }, cgEnvelope), [centerOfGravity, totalWeight, cgEnvelope]);

  const handleStationChange = (id: number, field: keyof Station, value: any) => {
    setStations(prev =>
      prev.map(s => {
        if (s.id === id) {
          const newStation = { ...s, [field]: value };
          if (s.type === 'fuel' && field === 'gallons') {
            newStation.weight = value * FUEL_WEIGHT_PER_GALLON;
          }
          return newStation;
        }
        return s;
      })
    );
  };

  const addStation = () => {
    setStations(prev => [
      ...prev,
      { id: Date.now(), name: 'New Item', weight: 0, arm: 0, type: 'item' },
    ]);
  };

  const addFuelStation = () => {
    if (stations.some(s => s.type === 'fuel')) {
      toast({
        variant: "destructive",
        title: "Fuel Station Exists",
        description: "A fuel station has already been added.",
      });
      return;
    }
    setStations(prev => [
      ...prev,
      { id: Date.now(), name: 'Fuel', weight: 0, arm: 0, type: 'fuel', gallons: 0, maxGallons: 50 },
    ]);
  };

  const removeStation = (id: number) => {
    setStations(prev => prev.filter(s => s.id !== id));
  };
  
  const handleSelectProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfileId(profile.id);
      setSelectedAircraftId(null);
      setStations(profile.stations || [
        { id: 1, name: 'Basic Empty Weight', weight: profile.emptyWeight || 0, arm: (profile.emptyWeightMoment || 0) / (profile.emptyWeight || 1), type: 'basic' },
      ]);
      setCgEnvelope(profile.cgEnvelope || []);
      setChartAxisLimits({
        xMin: profile.xMin || 0,
        xMax: profile.xMax || 100,
        yMin: profile.yMin || 0,
        yMax: profile.yMax || 3000,
      });
    }
  };
  
  const handleSelectAircraft = (aircraftId: string) => {
    const aircraft = aircrafts.find(a => a.id === aircraftId);
    if (aircraft) {
        setSelectedAircraftId(aircraft.id);
        setSelectedProfileId(null); // Deselect profile if aircraft is chosen
        
        const newStations: Station[] = [
            { id: 1, name: 'Basic Empty Weight', weight: aircraft.emptyWeight || 0, arm: (aircraft.emptyWeightMoment || 0) / (aircraft.emptyWeight || 1), type: 'basic' },
        ];

        const stationArms = aircraft.stationArms || {};
        if (stationArms.frontSeats) newStations.push({ id: 2, name: 'Front Seats', weight: 0, arm: stationArms.frontSeats, type: 'item'});
        if (stationArms.rearSeats) newStations.push({ id: 3, name: 'Rear Seats', weight: 0, arm: stationArms.rearSeats, type: 'item'});
        if (stationArms.fuel) newStations.push({ id: 4, name: 'Fuel', weight: 0, arm: stationArms.fuel, type: 'fuel', gallons: 0, maxGallons: 50 });
        if (stationArms.baggage1) newStations.push({ id: 5, name: 'Baggage 1', weight: 0, arm: stationArms.baggage1, type: 'item'});
        if (stationArms.baggage2) newStations.push({ id: 6, name: 'Baggage 2', weight: 0, arm: stationArms.baggage2, type: 'item'});

        setStations(newStations);
        setCgEnvelope(aircraft.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || []);
        
        // This logic for axis limits could be improved by calculating from envelope
        setChartAxisLimits({ xMin: 70, xMax: 100, yMin: 1000, yMax: aircraft.maxTakeoffWeight || 3000 });
    }
  }
  
  const handleSaveToBooking = async () => {
    if (!booking || !firestore) {
        toast({ variant: 'destructive', title: 'No Booking Selected', description: 'Cannot save to a booking without a booking context.'});
        return;
    }

    const massAndBalanceData = stations.reduce((acc, station) => {
        const key = camelCase(station.name);
        acc[key] = {
            weight: station.weight,
            moment: station.weight * station.arm,
        };
        return acc;
    }, {} as Record<string, { weight: number, moment: number }>);
    
    try {
        await updateBooking({
            firestore,
            tenantId,
            bookingId: booking.id,
            aircraft,
            updateData: {
                massAndBalance: massAndBalanceData
            }
        });
        toast({ title: 'Saved to Booking', description: 'Mass & Balance data has been successfully saved to the booking.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'An unknown error occurred.' });
    }
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <p className="text-center font-bold text-destructive">CONSULT AIRCRAFT POH BEFORE FLIGHT</p>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-2">
                            <Label>Load Saved Profile</Label>
                            <Select onValueChange={handleSelectProfile} value={selectedProfileId || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a profile" />
                                </SelectTrigger>
                                <SelectContent>
                                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label>Load from Aircraft Registration</Label>
                            <Select onValueChange={handleSelectAircraft} value={selectedAircraftId || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an aircraft" />
                                </SelectTrigger>
                                <SelectContent>
                                    {aircrafts.map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Loading Stations</CardTitle>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={addFuelStation}>
                                <Droplets className="mr-2 h-4 w-4" /> Add Fuel
                            </Button>
                            <Button type="button" variant="outline" onClick={addStation}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add
                            </Button>
                            {booking && (
                                <Button type="button">
                                    <Save className="mr-2 h-4 w-4" /> Save
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Station Name</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Arm</TableHead>
                                <TableHead>Moment</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stations.map((station, index) => (
                                <TableRow key={station.id}>
                                    <TableCell>
                                        <Input
                                            value={station.name}
                                            onChange={e => handleStationChange(station.id, 'name', e.target.value)}
                                            readOnly={station.type === 'basic'}
                                            className={station.type === 'basic' ? 'font-bold' : ''}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={station.weight}
                                            onChange={e => handleStationChange(station.id, 'weight', parseFloat(e.target.value))}
                                            readOnly={station.type === 'fuel'}
                                        />
                                        {station.type === 'fuel' && (
                                            <div className="flex items-center gap-2 mt-1">
                                            <Input
                                                type="number"
                                                placeholder="Gallons"
                                                value={station.gallons}
                                                onChange={e => handleStationChange(station.id, 'gallons', parseFloat(e.target.value))}
                                                className="w-24"
                                            />
                                            <span className="text-sm text-muted-foreground">Max: {station.maxGallons || 'N/A'}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={station.arm}
                                            onChange={e => handleStationChange(station.id, 'arm', parseFloat(e.target.value))}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input value={moments[index].toFixed(0)} readOnly />
                                    </TableCell>
                                    <TableCell>
                                        {station.type !== 'basic' && (
                                            <Button variant="ghost" size="icon" onClick={() => removeStation(station.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Chart Axis Limits</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Min CG</Label>
                        <Input type="number" value={chartAxisLimits.xMin} onChange={e => setChartAxisLimits(p => ({...p, xMin: parseFloat(e.target.value)}))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Max CG</Label>
                        <Input type="number" value={chartAxisLimits.xMax} onChange={e => setChartAxisLimits(p => ({...p, xMax: parseFloat(e.target.value)}))} />
                    </div>
                     <div className="space-y-2">
                        <Label>Min Weight</Label>
                        <Input type="number" value={chartAxisLimits.yMin} onChange={e => setChartAxisLimits(p => ({...p, yMin: parseFloat(e.target.value)}))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Max Weight</Label>
                        <Input type="number" value={chartAxisLimits.yMax} onChange={e => setChartAxisLimits(p => ({...p, yMax: parseFloat(e.target.value)}))} />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Totals</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-bold">Total Weight</TableCell>
                                <TableCell>{totalWeight.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">Total Moment</TableCell>
                                <TableCell>{totalMoment.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">Center of Gravity (CG)</TableCell>
                                <TableCell>{centerOfGravity.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
                {booking && (
                    <CardFooter>
                        <Button className="w-full" onClick={handleSaveToBooking}>Save to Booking</Button>
                    </CardFooter>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>CG Envelope</CardTitle>
                    <CardDescription className={isWithinCgEnvelope ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                        {isWithinCgEnvelope ? "Current CG is within limits" : "Current CG is OUTSIDE limits"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                   <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cgEnvelope}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="x" 
                                type="number" 
                                name="CG" 
                                domain={[chartAxisLimits.xMin, chartAxisLimits.xMax]} 
                                label={{ value: "Center of Gravity", position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis 
                                type="number" 
                                name="Weight" 
                                domain={[chartAxisLimits.yMin, chartAxisLimits.yMax]}
                                label={{ value: "Weight (lbs)", angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                             <Line 
                                type="monotone" 
                                dataKey="y" 
                                stroke="#8884d8" 
                                dot={false} 
                                name="CG Limit"
                                connectNulls
                            />
                             <Bar dataKey="y" fill="#8884d8" name="Current CG & Weight" barSize={0}>
                               <ReferenceLine x={centerOfGravity} stroke="red" label={{ value: "Current CG", position: 'insideBottomRight' }} />
                               <ReferenceLine y={totalWeight} stroke="red" label={{ value: "Current Weight", position: 'insideTopLeft' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}


export default function MassBalanceCalculatorWrapper() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const bookingId = searchParams.get('bookingId');
    const [booking, setBooking] = useState<Booking | null>(null);

    const aircraftsQuery = useMemoFirebase(() => firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null, [firestore, tenantId]);
    const profilesQuery = useMemoFirebase(() => firestore ? collection(firestore, `tenants/${tenantId}/massAndBalance`) : null, [firestore, tenantId]);
    
    const { data: aircrafts, isLoading: loadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
    const { data: profiles, isLoading: loadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);

    useEffect(() => {
        if (bookingId && aircrafts) {
            // In a real app, we'd fetch the specific booking. For now, we'll simulate finding it.
            // This part is simplified. You'd typically use a `useDoc` hook for the booking.
            const aircraft = aircrafts.find(a => a.id === booking?.aircraftId);
        }
    }, [bookingId, aircrafts]);

    if (loadingAircrafts || loadingProfiles) {
        return <div>Loading calculator...</div>
    }

    return (
        <MassBalanceCalculator 
            aircrafts={aircrafts || []} 
            profiles={profiles || []}
            booking={booking}
            tenantId={tenantId}
        />
    )
}
