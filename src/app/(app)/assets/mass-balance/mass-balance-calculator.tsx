'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, Save, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { AircraftModelProfile } from '@/types/aircraft';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { MassBalanceGraph } from './mass-balance-graph';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isPointInPolygon } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const stationSchema = z.object({
    id: z.number(),
    name: z.string().min(1, "Name is required"),
    weight: z.number().min(0, "Weight must be non-negative"),
    arm: z.number(),
    type: z.enum(['weight', 'fuel']),
    gallons: z.number().optional(),
    maxGallons: z.number().optional(),
});

type Station = z.infer<typeof stationSchema>;

const formSchema = z.object({
  profileName: z.string().min(1, 'Profile name is required'),
});

const toCamelCase = (str: string) => {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
};

export function MassBalanceCalculator() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const tenantId = 'safeviate';

    const aircraftId = searchParams.get('aircraftId');
    const bookingId = searchParams.get('bookingId');

    const [stations, setStations] = useState<Station[]>([]);
    const [profileName, setProfileName] = useState('');
    
    // Separate states for CG envelope chart limits
    const [xMin, setXMin] = useState(0);
    const [xMax, setXMax] = useState(100);
    const [yMin, setYMin] = useState(0);
    const [yMax, setYMax] = useState(1000);

    const [cgEnvelope, setCgEnvelope] = useState<{x: number, y: number}[]>([]);

    const aircraftProfilesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, `tenants/${tenantId}/massAndBalance`) : null),
        [firestore, tenantId]
    );
    const { data: savedProfiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(aircraftProfilesQuery);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          profileName: '',
        },
    });

    const { fields, append, remove } = useFieldArray({
      name: 'stations'
    });

    useEffect(() => {
        const aircraftProfile = savedProfiles?.find(p => p.id === aircraftId);
        if (aircraftProfile?.stations) {
            setStations(aircraftProfile.stations);
            setProfileName(aircraftProfile.profileName);
            setCgEnvelope(aircraftProfile.cgEnvelope || []);
            setXMin(aircraftProfile.xMin ?? 75);
            setXMax(aircraftProfile.xMax ?? 100);
            setYMin(aircraftProfile.yMin ?? 1500);
            setYMax(aircraftProfile.yMax ?? 2600);
        } else {
            // Default station if no profile is loaded
            if (stations.length === 0) {
                 setStations([{ id: 1, name: 'Empty Weight', weight: 0, arm: 0, type: 'weight' }]);
            }
        }
    }, [aircraftId, savedProfiles, stations.length]);
    

    const handleStationChange = (index: number, field: keyof Station, value: any) => {
        const newStations = [...stations];
        const station = newStations[index];

        if (field === 'weight' || field === 'arm' || field === 'gallons' || field === 'maxGallons') {
            (station as any)[field] = parseFloat(value) || 0;
        } else {
            (station as any)[field] = value;
        }

        if (station.type === 'fuel' && field === 'gallons') {
            station.weight = station.gallons! * FUEL_WEIGHT_PER_GALLON;
        }

        setStations(newStations);
    };

    const addStation = (type: 'weight' | 'fuel') => {
        const newId = stations.length > 0 ? Math.max(...stations.map(s => s.id)) + 1 : 1;
        const newStation: Station = {
            id: newId,
            name: type === 'fuel' ? 'Fuel' : 'New Station',
            weight: 0,
            arm: 0,
            type,
        };
        if (type === 'fuel') {
            newStation.gallons = 0;
            newStation.maxGallons = 50;
        }
        setStations([...stations, newStation]);
    };

    const removeStation = (index: number) => {
        const newStations = stations.filter((_, i) => i !== index);
        setStations(newStations);
    };

    const totalWeight = stations.reduce((acc, station) => acc + station.weight, 0);
    const totalMoment = stations.reduce((acc, station) => acc + (station.weight * station.arm), 0);
    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
    
    const isWithinLimits = isPointInPolygon({ x: centerOfGravity, y: totalWeight }, cgEnvelope);
    
    const handleSaveProfile = (name: string) => {
        if (!firestore) return;
        const profilesCollection = collection(firestore, `tenants/${tenantId}/massAndBalance`);
        addDocumentNonBlocking(profilesCollection, { profileName: name, stations, cgEnvelope, xMin, xMax, yMin, yMax });
        toast({ title: "Profile Saved", description: `Mass & Balance profile "${name}" has been saved.` });
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
        
        const massAndBalanceData = stations.reduce((acc, station) => {
            const key = toCamelCase(station.name);
            acc[key] = {
                weight: station.weight,
                moment: station.weight * station.arm,
            };
            return acc;
        }, {} as { [key: string]: { weight: number; moment: number } });

        updateDocumentNonBlocking(bookingRef, { massAndBalance: massAndBalanceData });
    
        toast({
            title: "Saved to Booking",
            description: "The mass and balance has been saved to the booking.",
        });
    };

    const loadProfile = (profileId: string) => {
        const profile = savedProfiles?.find(p => p.id === profileId);
        if (profile) {
            setStations(profile.stations || []);
            setProfileName(profile.profileName);
            setCgEnvelope(profile.cgEnvelope || []);
            setXMin(profile.xMin ?? 75);
            setXMax(profile.xMax ?? 100);
            setYMin(profile.yMin ?? 1500);
            setYMax(profile.yMax ?? 2600);
            toast({ title: "Profile Loaded", description: `Profile "${profile.profileName}" has been loaded.`});
        }
    };

    return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                <CardTitle>Mass &amp; Balance Calculator</CardTitle>
                <CardDescription>
                    Enter weights and arms for each station to calculate the total weight and center of gravity.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
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
                            {stations.map((station, index) => (
                            <TableRow key={station.id}>
                                <TableCell>
                                <Input
                                    value={station.name}
                                    onChange={(e) => handleStationChange(index, 'name', e.target.value)}
                                    className="font-medium"
                                />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={station.weight.toString()}
                                            onChange={(e) => handleStationChange(index, 'weight', e.target.value)}
                                            disabled={station.type === 'fuel'}
                                        />
                                        {station.type === 'fuel' && (
                                            <>
                                                <Input
                                                    type="number"
                                                    value={station.gallons?.toString()}
                                                    onChange={(e) => handleStationChange(index, 'gallons', e.target.value)}
                                                    className="w-24"
                                                />
                                                <span className="text-muted-foreground text-sm">gal</span>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                <Input
                                    type="number"
                                    value={station.arm.toString()}
                                    onChange={(e) => handleStationChange(index, 'arm', e.target.value)}
                                />
                                </TableCell>
                                <TableCell>
                                <Input
                                    readOnly
                                    value={(station.weight * station.arm).toFixed(2)}
                                    className="font-mono bg-muted"
                                />
                                </TableCell>
                                <TableCell className="text-right">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => removeStation(index)}
                                    disabled={stations.length <= 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <Button variant="outline" onClick={() => addStation('weight')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Weight Station
                        </Button>
                        <Button variant="outline" onClick={() => addStation('fuel')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Fuel Station
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <MassBalanceGraph
                totalWeight={totalWeight}
                centerOfGravity={centerOfGravity}
                cgEnvelope={cgEnvelope}
                setCgEnvelope={setCgEnvelope}
                xMin={xMin} setXMin={setXMin}
                xMax={xMax} setXMax={setXMax}
                yMin={yMin} setYMin={setYMin}
                yMax={yMax} setYMax={setYMax}
                onSaveProfile={handleSaveProfile}
                isWithinLimits={isWithinLimits}
            />
        </div>

        <Card className="lg:col-span-1 sticky top-6">
            <CardHeader>
            <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Total Weight:</span>
                <span className="font-bold text-2xl">{totalWeight.toFixed(2)} lbs</span>
                </div>
                <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Total Moment:</span>
                <span className="font-bold text-2xl">{totalMoment.toFixed(2)} lb-in</span>
                </div>
                <Separator />
                <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Center of Gravity:</span>
                <span className="font-bold text-2xl">{centerOfGravity.toFixed(2)} in</span>
                </div>

                <div className="pt-4">
                    {!isWithinLimits && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Out of Limits</AlertTitle>
                            <AlertDescription>
                                The current Center of Gravity is outside the acceptable envelope.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
            {bookingId && (
                <CardFooter>
                    <Button className="w-full" onClick={handleSaveToBooking}>
                        <Save className="mr-2 h-4 w-4" /> Save to Booking
                    </Button>
                </CardFooter>
            )}
        </Card>
        </div>
    );
}
