
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Scale, Save, FileSignature, AlertTriangle, BookCopy } from 'lucide-react';
import type { Aircraft, AircraftModelProfile, Station } from '@/types/aircraft';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { MassBalanceChart } from './mass-balance-chart';
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Booking } from '@/types/booking';

interface MassBalanceCalculatorProps {
    aircraftProfile: Aircraft | AircraftModelProfile | null;
    onSaveProfile?: (profileName: string, stations: Station[]) => void;
    onAssignToAircraft?: (profileId: string) => void;
    onClearAircraftMb?: () => void;
}

export function MassBalanceCalculator({
    aircraftProfile,
    onSaveProfile,
    onAssignToAircraft,
    onClearAircraftMb
}: MassBalanceCalculatorProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const [stations, setStations] = useState<Station[]>([]);
    const [profileName, setProfileName] = useState('');
    const [selectedBookingId, setSelectedBookingId] = useState<string>('');

    const bookingsQuery = useMemoFirebase(
      () => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
      [firestore, tenantId]
    );
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);

    useEffect(() => {
        if (aircraftProfile) {
            setStations(aircraftProfile.stations || []);
            if ('profileName' in aircraftProfile && aircraftProfile.profileName) {
                setProfileName(aircraftProfile.profileName);
            }
        } else {
            setStations([]);
            setProfileName('');
        }
    }, [aircraftProfile]);

    const handleStationChange = (index: number, field: keyof Station, value: string | number) => {
        const newStations = [...stations];
        const station = newStations[index];

        if (field === 'weight' && typeof value === 'number') {
            station.weight = value;
            if (station.type === 'fuel') {
                station.gallons = value / FUEL_WEIGHT_PER_GALLON;
            }
        } else if (field === 'gallons' && typeof value === 'number') {
            station.gallons = value;
            station.weight = value * FUEL_WEIGHT_PER_GALLON;
        } else if (field === 'arm' && typeof value === 'number') {
            station.arm = value;
        } else if (field === 'name' && typeof value === 'string') {
            station.name = value;
        }
        
        setStations(newStations);
    };
    
    const handleSaveToBooking = async () => {
        if (!selectedBookingId || !firestore) {
            toast({
                variant: "destructive",
                title: "No Booking Selected",
                description: "Please select a booking to save the M&B data to.",
            });
            return;
        }

        const massAndBalanceData = stations.reduce((acc, station) => {
            const camelCaseName = station.name.replace(/\s+/g, ' ').trim().replace(/\s(.)/g, (match, group1) => group1.toUpperCase()).replace(/^(.)/, (match, group1) => group1.toLowerCase());
            acc[camelCaseName] = {
                weight: station.weight,
                moment: station.weight * station.arm,
            };
            return acc;
        }, {} as Record<string, { weight: number, moment: number }>);
        
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, selectedBookingId);
        
        try {
            await updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });
            toast({
                title: "Mass & Balance Saved",
                description: "The calculation has been saved to the selected booking.",
            });
        } catch (error) {
            console.error("Error saving M&B to booking:", error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "Could not save the M&B data to the booking.",
            });
        }
    };


    const addStation = () => setStations([...stations, { id: stations.length, name: 'New Station', weight: 0, arm: 0, type: 'weight' }]);
    const removeStation = (index: number) => setStations(stations.filter((_, i) => i !== index));
    const resetCalculator = () => setStations(stations.map(s => ({ ...s, weight: 0, gallons: 0 })));

    const { totalWeight, totalMoment, centerOfGravity, isCGInEnvelope, isWeightOk } = useMemo(() => {
        if (!aircraftProfile) return { totalWeight: 0, totalMoment: 0, centerOfGravity: 0, isCGInEnvelope: false, isWeightOk: true };

        const emptyWeight = 'emptyWeight' in aircraftProfile ? aircraftProfile.emptyWeight || 0 : 0;
        const emptyWeightMoment = 'emptyWeightMoment' in aircraftProfile ? aircraftProfile.emptyWeightMoment || 0 : 0;

        const currentTotalWeight = stations.reduce((acc, station) => acc + (station.weight || 0), emptyWeight);
        const currentTotalMoment = stations.reduce((acc, station) => acc + ((station.weight || 0) * (station.arm || 0)), emptyWeightMoment);
        const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
        
        const isWeightOk = currentTotalWeight <= (('maxTakeoffWeight' in aircraftProfile && aircraftProfile.maxTakeoffWeight) || Infinity);

        return {
            totalWeight: currentTotalWeight,
            totalMoment: currentTotalMoment,
            centerOfGravity: cg,
            isCGInEnvelope: false, // Placeholder, logic needs to be added
            isWeightOk: isWeightOk
        };
    }, [stations, aircraftProfile]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">
                    {stations.map((station, index) => (
                        <div key={station.id} className="grid grid-cols-[1fr,1fr,1fr,auto] items-center gap-2 p-3 rounded-lg border">
                           <div className="flex items-center">
                                <span className="text-sm font-semibold mr-2 bg-muted h-6 w-6 flex items-center justify-center rounded-full">{index + 1}</span>
                                <Input
                                    value={station.name}
                                    onChange={(e) => handleStationChange(index, 'name', e.target.value)}
                                    className="font-medium"
                                />
                            </div>
                           
                            {station.type === 'fuel' ? (
                                 <div className="relative">
                                    <Input
                                        type="number"
                                        value={Math.round(station.gallons || 0)}
                                        onChange={(e) => handleStationChange(index, 'gallons', parseFloat(e.target.value))}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">gal</span>
                                 </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={Math.round(station.weight || 0)}
                                        onChange={(e) => handleStationChange(index, 'weight', parseFloat(e.target.value))}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">lbs</span>
                                </div>
                            )}

                             <div className="relative">
                                <Input
                                    type="number"
                                    value={Math.round(station.arm || 0)}
                                    onChange={(e) => handleStationChange(index, 'arm', parseFloat(e.target.value))}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">in</span>
                             </div>

                            <Button variant="ghost" size="icon" onClick={() => removeStation(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" onClick={addStation}>
                        <Plus className="mr-2" /> Add Station
                    </Button>
                </div>

                <div className="space-y-4">
                    <MassBalanceChart
                        cgEnvelope={aircraftProfile?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight }))}
                        calculatedCg={{ x: centerOfGravity, y: totalWeight }}
                        xMin={('xMin' in aircraftProfile && aircraftProfile.xMin) ? aircraftProfile.xMin : undefined}
                        xMax={('xMax' in aircraftProfile && aircraftProfile.xMax) ? aircraftProfile.xMax : undefined}
                        yMin={('yMin' in aircraftProfile && aircraftProfile.yMin) ? aircraftProfile.yMin : undefined}
                        yMax={('yMax' in aircraftProfile && aircraftProfile.yMax) ? aircraftProfile.yMax : undefined}
                    />

                    <Card>
                        <CardHeader className="pb-2">
                             <CardTitle className="text-base flex items-center gap-2">
                                <Scale /> Summary
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Total Weight</p>
                                <p className="text-lg font-bold">{totalWeight.toFixed(2)} lbs</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Total Moment</p>
                                <p className="text-lg font-bold">{totalMoment.toFixed(2)}</p>
                            </div>
                             <div className="text-center">
                                <p className="text-sm text-muted-foreground">C.G.</p>
                                <p className="text-lg font-bold">{centerOfGravity.toFixed(2)} in</p>
                            </div>
                        </CardContent>
                    </Card>
                     {!isWeightOk && (
                        <div className="flex items-center gap-2 text-destructive-foreground bg-destructive p-3 rounded-lg">
                           <AlertTriangle />
                           <p className="font-semibold">Exceeds Max Takeoff Weight of {('maxTakeoffWeight' in aircraftProfile && aircraftProfile.maxTakeoffWeight) || 'N/A'} lbs</p>
                        </div>
                    )}
                </div>
            </div>

            <CardFooter className="flex-col sm:flex-row justify-between items-center gap-4 border-t pt-6">
                <div className="flex flex-wrap gap-2">
                    {onAssignToAircraft && (
                        <Button variant="outline" onClick={() => aircraftProfile && onAssignToAircraft(aircraftProfile.id)}>
                            <FileSignature className="mr-2" /> Assign to Aircraft
                        </Button>
                    )}
                    {onClearAircraftMb && (
                        <Button variant="destructive" onClick={onClearAircraftMb}>
                           <Trash2 className="mr-2" /> Clear Aircraft M&B
                        </Button>
                    )}
                </div>
                 <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[200px]">
                        <Select onValueChange={setSelectedBookingId} value={selectedBookingId} disabled={isLoadingBookings}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoadingBookings ? "Loading..." : "Select booking to save to..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {(bookings || []).map(b => (
                                    <SelectItem key={b.id} value={b.id}>
                                        #{b.bookingNumber} - {b.date}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleSaveToBooking} disabled={!selectedBookingId}>
                        <BookCopy className="mr-2" /> Save to Booking
                    </Button>
                    {onSaveProfile && (
                        <Button onClick={() => onSaveProfile(profileName, stations)}>
                            <Save className="mr-2" /> Save as New Profile
                        </Button>
                    )}
                </div>
            </CardFooter>
        </div>
    );
}
