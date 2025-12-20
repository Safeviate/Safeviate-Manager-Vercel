
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Scatter, Label as RechartsLabel } from 'recharts';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile } from '@/types/aircraft';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon, cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { updateBooking } from '../../operations/bookings/booking-functions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const stationSchema = z.object({
    id: z.number(),
    name: z.string(),
    weight: z.number().nonnegative("Weight must be non-negative").optional(),
    arm: z.number(),
    type: z.string(),
    gallons: z.number().nonnegative().optional(),
});

const formSchema = z.object({
  profileId: z.string().min(1, "Please select a profile."),
  stations: z.array(stationSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function MassAndBalanceForm() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    
    const [selectedProfile, setSelectedProfile] = useState<AircraftModelProfile | null>(null);
    const [calculation, setCalculation] = useState<{ totalWeight: number, cg: number, isWithinLimits: boolean } | null>(null);
    const [loadedAircraft, setLoadedAircraft] = useState<Aircraft | null>(null);

    const bookingId = searchParams.get('bookingId');
    const aircraftIdFromParam = searchParams.get('aircraftId');

    // --- Data Fetching ---
    const tenantId = 'safeviate';
    const profilesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'massAndBalance') : null),
        [firestore]
    );
    const aircraftQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null),
        [firestore]
    );

    const { data: profiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftQuery);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { profileId: '', stations: [] },
    });
    
    const { fields, replace } = useFieldArray({ control: form.control, name: 'stations' });

    useEffect(() => {
        if (aircraftIdFromParam && aircrafts) {
            const aircraft = aircrafts.find(a => a.id === aircraftIdFromParam);
            if (aircraft) setLoadedAircraft(aircraft);
        }
    }, [aircraftIdFromParam, aircrafts]);

    const handleProfileChange = (profileId: string) => {
        const profile = profiles?.find(p => p.id === profileId);
        if (profile) {
            setSelectedProfile(profile);
            form.setValue('profileId', profile.id);
            const initialStations = profile.stations.map(s => ({...s, weight: s.type === 'BEW' ? s.weight : undefined, gallons: undefined}));
            replace(initialStations);
            setCalculation(null); // Reset calculation on profile change
        }
    };
    
    const loadAircraftData = (aircraftId: string) => {
        const aircraft = aircrafts?.find(a => a.id === aircraftId);
        if (aircraft) {
            setLoadedAircraft(aircraft);
            const profileToLoad = profiles?.find(p => p.profileName === aircraft.model);

            if (profileToLoad) {
                setSelectedProfile(profileToLoad);
                form.setValue('profileId', profileToLoad.id);
                
                const stationsWithAircraftData = profileToLoad.stations.map(station => {
                    if (station.type === 'BEW') {
                        return { ...station, weight: aircraft.emptyWeight, arm: station.arm };
                    }
                    return { ...station, weight: undefined, gallons: undefined };
                });
                replace(stationsWithAircraftData);
                toast({ title: "Aircraft Data Loaded", description: `Loaded M&B data for ${aircraft.tailNumber}.`});
            } else {
                toast({ variant: 'destructive', title: "Profile Not Found", description: `No M&B profile named "${aircraft.model}" found for this aircraft.`});
            }
        }
    }


    const onSubmit = (data: FormValues) => {
        if (!selectedProfile) return;

        let totalWeight = 0;
        let totalMoment = 0;

        data.stations.forEach(station => {
            const weight = station.weight ?? 0;
            totalWeight += weight;
            totalMoment += weight * station.arm;
        });

        const cg = totalWeight > 0 ? totalMoment / totalWeight : 0;
        const isWithinLimits = isPointInPolygon({ x: cg, y: totalWeight }, selectedProfile.cgEnvelope);

        setCalculation({ totalWeight, cg, isWithinLimits });

        toast({
            title: "Calculation Complete",
            description: `Total Weight: ${totalWeight.toFixed(2)} lbs, CG: ${cg.toFixed(2)} in.`,
        });
    };
    
    const handleSaveToBooking = async () => {
        if (!calculation || !bookingId || !firestore || !aircraftIdFromParam) {
            toast({ variant: 'destructive', title: "Cannot Save", description: "A calculation must be run and linked to a booking."});
            return;
        }

        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
        
        try {
            const massAndBalanceData = {
                stationWeights: form.getValues('stations').reduce((acc, station) => {
                    if (station.id && station.weight !== undefined) {
                        acc[station.id] = station.weight;
                    }
                    return acc;
                }, {} as {[key: string]: number}),
                totalWeight: calculation.totalWeight,
                totalMoment: calculation.totalWeight * calculation.cg,
                centerOfGravity: calculation.cg,
                isWithinLimits: calculation.isWithinLimits,
                calculatedAt: new Date().toISOString(),
            };

            await updateBooking({
                firestore,
                tenantId,
                bookingId,
                aircraft: loadedAircraft!,
                updateData: { massAndBalance: massAndBalanceData }
            });
            
            toast({ title: "Saved to Booking", description: "Mass & Balance data has been saved to the booking."});
        } catch (error: any) {
            console.error("Failed to save M&B to booking:", error);
            toast({ variant: 'destructive', title: "Save Failed", description: error.message });
        }
    };


    const handleStationWeightChange = (index: number, value: string) => {
        const weight = parseFloat(value);
        if (isNaN(weight)) {
            form.setValue(`stations.${index}.weight`, undefined);
            return;
        }
        form.setValue(`stations.${index}.weight`, weight);
    };

    const handleFuelGallonsChange = (index: number, value: string) => {
        const gallons = parseFloat(value);
        if (isNaN(gallons)) {
            form.setValue(`stations.${index}.gallons`, undefined);
            form.setValue(`stations.${index}.weight`, undefined);
            return;
        }
        form.setValue(`stations.${index}.gallons`, gallons);
        form.setValue(`stations.${index}.weight`, gallons * FUEL_WEIGHT_PER_GALLON);
    };
    
    const isLoading = isLoadingProfiles || isLoadingAircrafts;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Interactive Graph</CardTitle>
                                <CardDescription>Visualize the aircraft&apos;s center of gravity based on the configuration below.</CardDescription>
                            </div>
                            {calculation && (
                                <Badge variant={calculation.isWithinLimits ? 'default' : 'destructive'} className='text-base'>
                                    {calculation.isWithinLimits ? 'WITHIN LIMITS' : 'OUT OF LIMITS'}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className='w-full h-80' />
                        ) : (
                        <ResponsiveContainer width="100%" height={400}>
                            <AreaChart
                                data={selectedProfile?.cgEnvelope}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    type="number" 
                                    dataKey="x" 
                                    name="CG" 
                                    unit=" in"
                                    domain={selectedProfile ? [selectedProfile.xMin, selectedProfile.xMax] : ['auto', 'auto']}
                                    tickCount={8}
                                    tickFormatter={(tick) => `${tick}`}
                                >
                                     <RechartsLabel value="CG (inches)" offset={0} position="insideBottom" dy={15} />
                                </XAxis>
                                <YAxis 
                                    type="number" 
                                    dataKey="y" 
                                    name="Gross Weight" 
                                    unit=" lbs" 
                                    domain={selectedProfile ? [selectedProfile.yMin, selectedProfile.yMax] : ['auto', 'auto']}
                                />
                                <Tooltip
                                    formatter={(value, name) => [`${(value as number).toFixed(2)}${name === 'Gross Weight' ? ' lbs' : ' in'}`, name]}
                                    labelFormatter={(label) => ''}
                                />
                                <Area 
                                    type="linear" 
                                    dataKey="y" 
                                    stroke="hsl(var(--foreground))"
                                    fill="hsl(var(--primary))" 
                                    fillOpacity={0.1}
                                    strokeWidth={2}
                                    name="CG Envelope"
                                />
                                {calculation && (
                                    <Scatter 
                                        name="Calculated CG" 
                                        data={[{ x: calculation.cg, y: calculation.totalWeight }]} 
                                        fill={calculation.isWithinLimits ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                                        shape="circle"
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>
                            Load a profile or manually enter weights to calculate the center of gravity.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center p-4 rounded-lg bg-destructive/10 border border-destructive/50">
                            <p className="font-bold text-destructive">CONSULT AIRCRAFT POH BEFORE FLIGHT</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="profileId"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Load Saved Profile</Label>
                                        <Select onValueChange={handleProfileChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a profile..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="space-y-2">
                                <Label>Load from Aircraft Registration</Label>
                                <Select onValueChange={loadAircraftData} disabled={!aircrafts || aircrafts.length === 0} value={loadedAircraft?.id ?? ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an aircraft..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {aircrafts?.map(ac => <SelectItem key={ac.id} value={ac.id}>{ac.tailNumber}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedProfile && (
                            <>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="space-y-2">
                                            <Label>{field.name}</Label>
                                            {field.type === 'fuel' ? (
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="Gallons"
                                                        value={form.watch(`stations.${index}.gallons`) ?? ''}
                                                        onChange={(e) => handleFuelGallonsChange(index, e.target.value)}
                                                        max={field.maxGallons}
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="Weight (lbs)"
                                                        value={form.watch(`stations.${index}.weight`) ?? ''}
                                                        readOnly
                                                        className="bg-muted"
                                                    />
                                                </div>
                                            ) : (
                                                <Input
                                                    type="number"
                                                    placeholder="Weight (lbs)"
                                                    value={form.watch(`stations.${index}.weight`) ?? ''}
                                                    onChange={(e) => handleStationWeightChange(index, e.target.value)}
                                                    readOnly={field.type === 'BEW'}
                                                    className={cn(field.type === 'BEW' && 'bg-muted')}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        {bookingId && (
                             <Button type="button" onClick={handleSaveToBooking} disabled={!calculation}>
                                Save to Booking
                            </Button>
                        )}
                        <Button type="submit" disabled={!selectedProfile}>Calculate</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
