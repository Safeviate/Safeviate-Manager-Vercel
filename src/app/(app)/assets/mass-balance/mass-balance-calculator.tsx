
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Save, Plane, BookOpen, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { AircraftModelProfile, Station, Aircraft } from '@/types/aircraft';
import { isPointInPolygon } from '@/lib/utils';
import { MassBalanceChart } from './mass-balance-chart';
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MassBalanceCalculatorProps {
    aircraftProfile: Aircraft;
    onSaveAsProfile: (profileName: string, stations: Station[], cgEnvelope: {x:number, y:number}[]) => void;
    onAssignToAircraft: (stations: Station[], cgEnvelope: {x:number, y:number}[]) => void;
    onClearAircraftMB: () => void;
}

export function MassBalanceCalculator({
    aircraftProfile,
    onSaveAsProfile,
    onAssignToAircraft,
    onClearAircraftMB
}: MassBalanceCalculatorProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [stations, setStations] = useState<Station[]>([]);
    const [profileName, setProfileName] = useState('');
    const [selectedBookingId, setSelectedBookingId] = useState<string>('');

    const bookingsQuery = useMemoFirebase(
      () => (firestore ? query(collection(firestore, 'tenants', 'safeviate', 'bookings')) : null),
      [firestore]
    );
    const { data: bookings } = useCollection<Booking>(bookingsQuery);

    useEffect(() => {
        if (aircraftProfile?.stations) {
            setStations(JSON.parse(JSON.stringify(aircraftProfile.stations)));
        } else {
            setStations([]);
        }
    }, [aircraftProfile]);

    const { totalWeight, totalMoment, centerOfGravity, isCGInEnvelope, isWeightOk } = useMemo(() => {
        if (!aircraftProfile) {
            return { totalWeight: 0, totalMoment: 0, centerOfGravity: 0, isCGInEnvelope: false, isWeightOk: true };
        }

        let currentTotalWeight = aircraftProfile.emptyWeight || 0;
        let currentTotalMoment = aircraftProfile.emptyWeightMoment || 0;

        stations.forEach(station => {
            const weight = station.weight || 0;
            const arm = station.arm || 0;
            currentTotalWeight += weight;
            currentTotalMoment += weight * arm;
        });
        
        const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
        const cgEnvelopePoints = (aircraftProfile.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight }));
        const isCGInEnvelope = isPointInPolygon({ x: cg, y: currentTotalWeight }, cgEnvelopePoints);
        const isWeightOk = currentTotalWeight <= (aircraftProfile.maxTakeoffWeight || Infinity);
        
        return {
            totalWeight: currentTotalWeight,
            totalMoment: currentTotalMoment,
            centerOfGravity: cg,
            isCGInEnvelope,
            isWeightOk,
        };
    }, [stations, aircraftProfile]);

    const handleStationChange = (index: number, field: 'weight' | 'gallons', value: string) => {
        const newStations = [...stations];
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            if (field === 'gallons') {
                newStations[index].gallons = numValue;
                newStations[index].weight = numValue * FUEL_WEIGHT_PER_GALLON;
            } else {
                newStations[index].weight = numValue;
                if (newStations[index].type === 'fuel') {
                  newStations[index].gallons = numValue / FUEL_WEIGHT_PER_GALLON;
                }
            }
            setStations(newStations);
        } else {
             if (field === 'gallons') {
                newStations[index].gallons = 0;
                newStations[index].weight = 0;
            } else {
                newStations[index].weight = 0;
                 if (newStations[index].type === 'fuel') {
                  newStations[index].gallons = 0;
                }
            }
            setStations(newStations);
        }
    };
    
    const handleSaveToBooking = async () => {
        if (!selectedBookingId || !firestore) {
            toast({
                variant: 'destructive',
                title: 'No Booking Selected',
                description: 'Please select a booking from the dropdown.',
            });
            return;
        }

        const massAndBalanceData = stations.reduce((acc, station) => {
            const weight = station.weight || 0;
            const arm = station.arm || 0;
            const stationKey = station.name.toLowerCase().replace(/\s+/g, '');
            if (stationKey) {
                acc[stationKey] = {
                    weight: weight,
                    moment: weight * arm,
                };
            }
            return acc;
        }, {} as Record<string, { weight: number, moment: number }>);
        
        const bookingRef = doc(firestore, 'tenants', 'safeviate', 'bookings', selectedBookingId);
        
        try {
            await updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });
            toast({
                title: 'Saved to Booking',
                description: 'Mass & Balance data has been saved to the selected booking.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: 'Could not save data to the booking.',
            });
        }
    };
    
    if (!aircraftProfile) {
        return <p>Select an aircraft to view its Mass & Balance configuration.</p>;
    }
    
    if (!aircraftProfile.stations || !aircraftProfile.cgEnvelope) {
        return <p className="text-destructive">Aircraft configuration missing stations or CG envelope.</p>
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{aircraftProfile.tailNumber} - Loading Stations</CardTitle>
                        <CardDescription>Enter weights for each station. Fuel can be entered in gallons or lbs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stations.map((station, index) => (
                                <Card key={station.id} className="p-4">
                                    <Label className="font-semibold">{station.name}</Label>
                                    <div className="flex gap-2 mt-2">
                                        {station.type === 'fuel' ? (
                                             <Input
                                                type="number"
                                                placeholder="gallons"
                                                value={station.gallons ? Math.round(station.gallons * 100) / 100 : ''}
                                                onChange={(e) => handleStationChange(index, 'gallons', e.target.value)}
                                            />
                                        ) : (
                                            <Input
                                                type="number"
                                                placeholder="lbs"
                                                value={station.weight || ''}
                                                onChange={(e) => handleStationChange(index, 'weight', e.target.value)}
                                            />
                                        )}
                                        <Input
                                            type="number"
                                            readOnly
                                            disabled
                                            value={Math.round(station.weight * 100) / 100 || ''}
                                            className="bg-muted"
                                            placeholder="lbs"
                                        />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardFooter className="flex flex-wrap gap-2">
                         <div className="flex items-center gap-2">
                           <Select onValueChange={setSelectedBookingId}>
                               <SelectTrigger className="w-[180px]">
                                   <SelectValue placeholder="Select Booking..." />
                               </SelectTrigger>
                               <SelectContent>
                                   {bookings?.map((booking) => (
                                       <SelectItem key={booking.id} value={booking.id}>
                                           #{booking.bookingNumber} - {booking.type}
                                       </SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                           <Button onClick={handleSaveToBooking} disabled={!selectedBookingId}>
                               <Save className="mr-2" /> Save to Booking
                           </Button>
                       </div>
                        <Button variant="secondary" onClick={() => onAssignToAircraft(stations, (aircraftProfile.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight })))}>
                            <Plane className="mr-2" /> Assign to Aircraft
                        </Button>
                        <Button variant="destructive" onClick={onClearAircraftMB}>
                            <Trash2 className="mr-2" /> Clear Aircraft M&B
                        </Button>
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="New profile name..."
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="w-48"
                            />
                            <Button onClick={() => onSaveAsProfile(profileName, stations, (aircraftProfile.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight })))} disabled={!profileName.trim()}>
                                <PlusCircle className="mr-2" /> Save as New Profile
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>CG Envelope</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MassBalanceChart
                            envelopePoints={(aircraftProfile.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight }))}
                            cgPoint={{ x: centerOfGravity, y: totalWeight }}
                            xMin={aircraftProfile.xMin}
                            xMax={aircraftProfile.xMax}
                            yMin={aircraftProfile.yMin}
                            yMax={aircraftProfile.yMax}
                            isCGInEnvelope={isCGInEnvelope}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className={`p-4 rounded-lg ${isWeightOk ? 'bg-green-100' : 'bg-red-100'}`}>
                           <p className="text-sm font-medium">Total Weight</p>
                           <p className="text-2xl font-bold">{totalWeight.toFixed(2)} lbs</p>
                           <p className="text-xs text-muted-foreground">Max: {aircraftProfile.maxTakeoffWeight} lbs</p>
                       </div>
                       <div className={`p-4 rounded-lg ${isCGInEnvelope ? 'bg-green-100' : 'bg-red-100'}`}>
                           <p className="text-sm font-medium">Center of Gravity</p>
                           <p className="text-2xl font-bold">{centerOfGravity.toFixed(2)} in</p>
                       </div>
                       <div className="p-4 rounded-lg bg-muted">
                           <p className="text-sm font-medium">Total Moment</p>
                           <p className="text-2xl font-bold">{totalMoment.toFixed(2)} lbs-in</p>
                       </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
