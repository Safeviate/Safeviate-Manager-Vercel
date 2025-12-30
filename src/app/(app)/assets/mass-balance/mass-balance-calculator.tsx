
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isPointInPolygon } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { AircraftModelProfile } from '@/types/aircraft';
import { MassBalanceGraph } from './mass-balance-graph';

interface Station {
    id: number;
    name: string;
    weight: number;
    arm: number;
    type: 'weight' | 'fuel';
    gallons: number;
    maxGallons?: number;
}

const toCamelCase = (str: string) => {
  if (!str) return '';
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
    index === 0 ? word.toLowerCase() : word.toUpperCase()
  ).replace(/\s+/g, '');
};


function MassBalanceCalculatorContent() {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const aircraftId = searchParams.get('aircraftId');
    const tenantId = 'safeviate';

    const firestore = useFirestore();

    const profilesQuery = useMemoFirebase(() => firestore ? collection(firestore, `tenants/${tenantId}/massAndBalance`) : null, [firestore, tenantId]);
    const { data: profiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);

    const [stations, setStations] = useState<Station[]>([]);
    const [emptyWeight, setEmptyWeight] = useState(0);
    const [emptyWeightMoment, setEmptyWeightMoment] = useState(0);
    const [maxTakeoffWeight, setMaxTakeoffWeight] = useState(0);
    const [cgEnvelope, setCgEnvelope] = useState<{x: number, y: number}[]>([]);
    const [chartBounds, setChartBounds] = useState({ xMin: 0, xMax: 0, yMin: 0, yMax: 0 });

    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (aircraftId && profiles) {
            const profileForAircraft = profiles.find(p => p.id === aircraftId);
            if (profileForAircraft) {
                loadProfile(profileForAircraft);
                setSelectedProfileId(profileForAircraft.id);
            }
        }
    }, [aircraftId, profiles]);

    const handleStationChange = (id: number, field: keyof Station, value: any) => {
        setStations(prev =>
            prev.map(station => {
                if (station.id === id) {
                    const updatedStation = { ...station, [field]: value };
                    if (field === 'gallons') {
                        updatedStation.weight = value * FUEL_WEIGHT_PER_GALLON;
                    }
                    if (field === 'weight' && station.type === 'fuel') {
                        updatedStation.gallons = value / FUEL_WEIGHT_PER_GALLON;
                    }
                    return updatedStation;
                }
                return station;
            })
        );
    };

    const addStation = (type: 'weight' | 'fuel') => {
        const newStation: Station = {
            id: stations.length,
            name: type === 'fuel' ? 'New Fuel Tank' : 'New Station',
            weight: 0,
            arm: 0,
            type: type,
            gallons: 0,
        };
        setStations(prev => [...prev, newStation]);
    };

    const removeStation = (id: number) => {
        setStations(prev => prev.filter(station => station.id !== id).map((s, index) => ({...s, id: index})));
    };

    const zeroAircraftWeight = emptyWeight + stations.reduce((acc, station) => station.type === 'fuel' ? acc : acc + station.weight, 0);
    const zeroAircraftMoment = emptyWeightMoment + stations.reduce((acc, station) => station.type === 'fuel' ? acc : acc + (station.weight * station.arm), 0);
    
    const takeoffWeight = emptyWeight + stations.reduce((acc, station) => acc + station.weight, 0);
    const takeoffMoment = emptyWeightMoment + stations.reduce((acc, station) => acc + (station.weight * station.arm), 0);
    const takeoffCg = takeoffWeight > 0 ? takeoffMoment / takeoffWeight : 0;
    
    const landingWeight = zeroAircraftWeight; // Assuming all fuel is burned
    const landingMoment = zeroAircraftMoment;
    const landingCg = landingWeight > 0 ? landingMoment / landingWeight : 0;

    const isTakeoffCgInEnvelope = isPointInPolygon({ x: takeoffCg, y: takeoffWeight }, cgEnvelope);
    const isLandingCgInEnvelope = isPointInPolygon({ x: landingCg, y: landingWeight }, cgEnvelope);
    const isTakeoffWeightOk = takeoffWeight <= maxTakeoffWeight;

    const loadProfile = (profile: AircraftModelProfile) => {
        setStations(profile.stations || []);
        setEmptyWeight(profile.emptyWeight || 0);
        setEmptyWeightMoment(profile.emptyWeightMoment || 0);
        setMaxTakeoffWeight(profile.maxTakeoffWeight || 0);
        setCgEnvelope(profile.cgEnvelope || []);
        setChartBounds({
            xMin: profile.xMin || 0,
            xMax: profile.xMax || 0,
            yMin: profile.yMin || 0,
            yMax: profile.yMax || 0,
        });
        toast({ title: "Profile Loaded", description: `Loaded "${profile.profileName}".` });
    };

    const handleLoadProfile = (profileId: string) => {
        const profileToLoad = profiles?.find(p => p.id === profileId);
        if (profileToLoad) {
            loadProfile(profileToLoad);
            setSelectedProfileId(profileId);
        }
    };

    const handleSaveProfile = async () => {
        if (!newProfileName.trim()) {
            toast({ variant: "destructive", title: "Name Required", description: "Please enter a name for the new profile." });
            return;
        }
        if (!firestore) return;

        const profileData = {
            profileName: newProfileName,
            stations,
            emptyWeight,
            emptyWeightMoment,
            maxTakeoffWeight,
            cgEnvelope,
            xMin: chartBounds.xMin,
            xMax: chartBounds.xMax,
            yMin: chartBounds.yMin,
            yMax: chartBounds.yMax,
        };

        try {
            await addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/massAndBalance`), profileData);
            toast({ title: "Profile Saved", description: `Saved "${newProfileName}".` });
            setNewProfileName('');
            setIsProfileDialogOpen(false);
        } catch (error) {
            console.error("Error saving profile:", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save the profile." });
        }
    };

    const handleDeleteProfile = async (profileId: string) => {
        if (!firestore) return;
        try {
            await deleteDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/massAndBalance`, profileId));
            toast({ title: "Profile Deleted" });
            if(selectedProfileId === profileId) {
                // If the deleted profile was the active one, clear the form
                setStations([]);
                setEmptyWeight(0);
                // etc.
            }
        } catch (error) {
            console.error("Error deleting profile:", error);
            toast({ variant: "destructive", title: "Delete Failed" });
        }
    }

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
        
        const massAndBalanceData = stations.reduce((acc, station) => {
            const key = toCamelCase(station.name);
            if (key) {
                acc[key] = {
                    weight: station.weight,
                    moment: station.weight * station.arm,
                };
            }
            return acc;
        }, {} as { [key: string]: { weight: number, moment: number } });
        
        updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });

        toast({
            title: "Saved to Booking",
            description: "The mass and balance has been saved to the booking.",
        });
    };

    if (isLoadingProfiles) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Aircraft & Profile</CardTitle>
                                <CardDescription>Load a profile or manually enter aircraft data.</CardDescription>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Select onValueChange={handleLoadProfile} value={selectedProfileId || ''}>
                                    <SelectTrigger className='w-48'>
                                        <SelectValue placeholder="Load Profile..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {profiles?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedProfileId && (
                                     <Button variant="destructive" size="icon" onClick={() => handleDeleteProfile(selectedProfileId)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-1">
                            <Label htmlFor="empty-weight">Empty Weight (lbs)</Label>
                            <Input id="empty-weight" type="number" value={emptyWeight} onChange={e => setEmptyWeight(Number(e.target.value))} />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="empty-weight-moment">EW Moment (lbs-in)</Label>
                            <Input id="empty-weight-moment" type="number" value={emptyWeightMoment} onChange={e => setEmptyWeightMoment(Number(e.target.value))} />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="max-takeoff-weight">Max Takeoff Wt (lbs)</Label>
                            <Input id="max-takeoff-weight" type="number" value={maxTakeoffWeight} onChange={e => setMaxTakeoffWeight(Number(e.target.value))} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Loading Stations</CardTitle>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => addStation('weight')}><PlusCircle className="mr-2 h-4 w-4" /> Add Weight</Button>
                                <Button size="sm" variant="outline" onClick={() => addStation('fuel')}><PlusCircle className="mr-2 h-4 w-4" /> Add Fuel</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/3">Station</TableHead>
                                    <TableHead>Weight (lbs)</TableHead>
                                    <TableHead>Arm (in)</TableHead>
                                    <TableHead>Moment (lbs-in)</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stations.map(station => (
                                    <TableRow key={station.id}>
                                        <TableCell>
                                            <Input value={station.name} onChange={e => handleStationChange(station.id, 'name', e.target.value)} />
                                            {station.type === 'fuel' && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Input type="number" value={station.gallons} onChange={e => handleStationChange(station.id, 'gallons', Number(e.target.value))} className="h-8" />
                                                    <span className="text-sm text-muted-foreground">gal</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={station.weight} onChange={e => handleStationChange(station.id, 'weight', Number(e.target.value))} disabled={station.type === 'fuel'}/>
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={station.arm} onChange={e => handleStationChange(station.id, 'arm', Number(e.target.value))} />
                                        </TableCell>
                                        <TableCell>{(station.weight * station.arm).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => removeStation(station.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {bookingId && (
                            <div className="flex justify-end mt-4">
                                <Button onClick={handleSaveToBooking}>
                                    <Save className="mr-2 h-4 w-4"/>
                                    Save to Booking
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Calculation Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className='grid grid-cols-2 gap-4 text-sm'>
                            <p className='font-medium'>Takeoff Weight</p><p className='text-right'>{takeoffWeight.toFixed(2)} lbs</p>
                            <p className='font-medium'>Takeoff CG</p><p className='text-right'>{takeoffCg.toFixed(2)} in</p>
                            <p className='font-medium'>Landing Weight</p><p className='text-right'>{landingWeight.toFixed(2)} lbs</p>
                            <p className='font-medium'>Landing CG</p><p className='text-right'>{landingCg.toFixed(2)} in</p>
                        </div>
                        <div className='space-y-2'>
                           {!isTakeoffWeightOk && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Overweight</AlertTitle><AlertDescription>Takeoff weight exceeds maximum.</AlertDescription></Alert>}
                           {!isTakeoffCgInEnvelope && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Out of CG Limits</AlertTitle><AlertDescription>Takeoff CG is outside the envelope.</AlertDescription></Alert>}
                           {!isLandingCgInEnvelope && <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Check Landing CG</AlertTitle><AlertDescription>Landing CG is outside the envelope.</AlertDescription></Alert>}
                        </div>
                    </CardContent>
                </Card>
                <MassBalanceGraph 
                    cgEnvelope={cgEnvelope}
                    takeoffWeight={takeoffWeight}
                    takeoffCg={takeoffCg}
                    landingWeight={landingWeight}
                    landingCg={landingCg}
                    chartBounds={chartBounds}
                    setChartBounds={setChartBounds}
                    onSaveProfile={() => setIsProfileDialogOpen(true)}
                />
            </div>
            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save as New Profile</DialogTitle>
                        <DialogDescription>Save the current configuration as a new, reusable template.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="profile-name">Profile Name</Label>
                        <Input id="profile-name" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSaveProfile}>Save Profile</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


export default function MassBalanceCalculator() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MassBalanceCalculatorContent />
        </Suspense>
    )
}
