
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Scatter } from 'recharts';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import type { Aircraft } from '../../assets/page';
import type { AircraftModelProfile } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import { useToast } from '@/hooks/use-toast';
import { updateBooking } from '../../operations/bookings/booking-functions';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import { isPointInPolygon } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

const isNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);

const defaultStations = [
    { id: 1, name: 'Front Seats', weight: 0, arm: 0, type: 'pilot' },
    { id: 2, name: 'Rear Seats', weight: 0, arm: 0, type: 'passenger' },
    { id: 3, name: 'Fuel', weight: 0, arm: 0, type: 'fuel', gallons: 0, maxGallons: 0 },
    { id: 4, name: 'Baggage 1', weight: 0, arm: 0, type: 'baggage' },
    { id: 5, name: 'Baggage 2', weight: 0, arm: 0, type: 'baggage' },
];

export function MassBalanceForm({ booking, aircraft }: { booking: Booking; aircraft: Aircraft }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const tenantId = 'safeviate';

    // State for form inputs and calculations
    const [stations, setStations] = useState(defaultStations);
    const [basicEmptyWeight, setBasicEmptyWeight] = useState(aircraft.emptyWeight || 0);
    const [basicEmptyWeightMoment, setBasicEmptyWeightMoment] = useState(aircraft.emptyWeightMoment || 0);
    const [cgEnvelope, setCgEnvelope] = useState<{x: number, y: number}[]>([]);
    const [chartLimits, setChartLimits] = useState({ xMin: 60, xMax: 100, yMin: 1500, yMax: 2600 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch aircraft model profiles for selection
    const profilesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `tenants/${tenantId}/massAndBalance`)) : null,
        [firestore, tenantId]
    );
    const { data: profiles, isLoading: isLoadingProfiles } = useCollection<AircraftModelProfile>(profilesQuery);

    // Calculation logic
    const calculation = useMemo(() => {
        const moment = (weight: number, arm: number) => isNumber(weight) && isNumber(arm) ? weight * arm : 0;
        
        const zeroFuelWeight = basicEmptyWeight + stations.reduce((acc, station) => {
            return station.type !== 'fuel' ? acc + (isNumber(station.weight) ? station.weight : 0) : acc;
        }, 0);

        const zeroFuelMoment = basicEmptyWeightMoment + stations.reduce((acc, station) => {
            return station.type !== 'fuel' ? acc + moment(station.weight, station.arm) : acc;
        }, 0);

        const totalWeight = zeroFuelWeight + (stations.find(s => s.type === 'fuel')?.weight || 0);
        const totalMoment = zeroFuelMoment + moment(stations.find(s => s.type === 'fuel')?.weight || 0, stations.find(s => s.type === 'fuel')?.arm || 0);
        const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;
        
        const isWithinLimits = isPointInPolygon({ x: centerOfGravity, y: totalWeight }, cgEnvelope)
            && totalWeight <= (aircraft.maxTakeoffWeight || Infinity);

        return { totalWeight, totalMoment, centerOfGravity, isWithinLimits };
    }, [stations, basicEmptyWeight, basicEmptyWeightMoment, cgEnvelope, aircraft.maxTakeoffWeight]);
    
    // Effect to initialize state from booking or aircraft data
    useEffect(() => {
        if (booking.massAndBalance) {
            // Load from saved booking data
            const mbStations = booking.massAndBalance.stationWeights;
            const newStations = defaultStations.map(s => ({
                ...s,
                weight: mbStations[s.name] || s.weight
            }));
            setStations(newStations);

        } else if (aircraft.stations) {
            // Load from aircraft's default configuration
            const mergedStations = defaultStations.map(defaultStation => {
                const acStation = aircraft.stations?.find(s => s.name === defaultStation.name);
                return acStation ? { ...defaultStation, ...acStation } : defaultStation;
            });
            setStations(mergedStations);
            
            // Set envelope and limits from aircraft
            if (aircraft.cgEnvelope) {
                setCgEnvelope(aircraft.cgEnvelope.map(p => ({ x: p.cg, y: p.weight })));
            }
            if(aircraft.xMin && aircraft.xMax && aircraft.yMin && aircraft.yMax) {
                setChartLimits({ xMin: aircraft.xMin, xMax: aircraft.xMax, yMin: aircraft.yMin, yMax: aircraft.yMax });
            }
        }
    }, [booking, aircraft]);


    const handleStationWeightChange = (id: number, weight: number) => {
        setStations(prev => prev.map(s => s.id === id ? { ...s, weight, gallons: s.type === 'fuel' ? weight / FUEL_WEIGHT_PER_GALLON : s.gallons } : s));
    };
    
    const handleFuelGallonsChange = (gallons: number) => {
        setStations(prev => prev.map(s => s.type === 'fuel' ? { ...s, gallons, weight: gallons * FUEL_WEIGHT_PER_GALLON } : s));
    };
    
    const loadProfile = (profileId: string) => {
        const profile = profiles?.find(p => p.id === profileId);
        if (!profile) return;
        
        setStations(profile.stations || defaultStations);
        setBasicEmptyWeight(profile.emptyWeight || 0);
        setBasicEmptyWeightMoment(profile.emptyWeightMoment || 0);
        
        // Update chart data from profile
        setCgEnvelope(profile.cgEnvelope || []);
        setChartLimits({
            xMin: profile.xMin,
            xMax: profile.xMax,
            yMin: profile.yMin,
            yMax: profile.yMax,
        });

        toast({ title: "Profile Loaded", description: `Loaded M&B profile: ${profile.profileName}` });
    };

    const handleSaveToBooking = async () => {
        if (!firestore) return;
        setIsSubmitting(true);

        const massAndBalanceData = {
            stationWeights: stations.reduce((acc, s) => ({ ...acc, [s.name]: s.weight }), {}),
            totalWeight: calculation.totalWeight,
            totalMoment: calculation.totalMoment,
            centerOfGravity: calculation.centerOfGravity,
            isWithinLimits: calculation.isWithinLimits,
            calculatedAt: new Date().toISOString(),
        };

        try {
            await updateBooking({
                firestore,
                tenantId,
                bookingId: booking.id,
                updateData: { massAndBalance: massAndBalanceData },
                aircraft
            });
            toast({
                title: 'Mass & Balance Saved',
                description: 'The calculation has been saved to this booking.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: error.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    const chartData = useMemo(() => {
        if (cgEnvelope.length === 0) return [];
        // Ensure the polygon is closed
        return [...cgEnvelope, cgEnvelope[0]];
    }, [cgEnvelope]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>CG Envelope</CardTitle>
                </CardHeader>
                <CardContent className="h-96 w-full">
                    <ResponsiveContainer>
                        <AreaChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                type="number" 
                                dataKey="x" 
                                name="CG (in)" 
                                unit=" in" 
                                domain={[chartLimits.xMin, chartLimits.xMax]} 
                                label={{ value: "Center of Gravity (inches from datum)", position: "insideBottom", offset: -15 }}
                            />
                            <YAxis 
                                type="number" 
                                dataKey="y" 
                                name="Weight (lbs)" 
                                unit=" lbs"
                                domain={[chartLimits.yMin, chartLimits.yMax]}
                                label={{ value: "Weight (lbs)", angle: -90, position: "insideLeft", offset: -5 }}
                            />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Area type="linear" dataKey="y" stroke="hsl(var(--foreground))" fill="hsl(var(--primary) / 0.2)" name="CG Limit" />
                            <Scatter data={[{ x: calculation.centerOfGravity, y: calculation.totalWeight }]} fill={calculation.isWithinLimits ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} name="Current CG"/>
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Loading Information</CardTitle>
                    <div className="flex justify-between items-start gap-4">
                        <CardDescription>
                            Load a template profile or enter the weights for each station below.
                        </CardDescription>
                        <Select onValueChange={loadProfile} disabled={isLoadingProfiles}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder={isLoadingProfiles ? "Loading profiles..." : "Load from Template"} />
                            </SelectTrigger>
                            <SelectContent>
                                {profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.profileName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stations.map(station => (
                            <div key={station.id} className="space-y-2">
                                <Label htmlFor={`station-${station.id}`}>{station.name}</Label>
                                {station.type === 'fuel' ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={station.gallons ? Math.round(station.gallons) : ''}
                                            onChange={e => handleFuelGallonsChange(Number(e.target.value))}
                                            placeholder="Gallons"
                                            max={station.maxGallons}
                                        />
                                        <span className='text-sm text-muted-foreground'>({station.weight.toFixed(1)} lbs)</span>
                                    </div>
                                ) : (
                                    <Input
                                        id={`station-${station.id}`}
                                        type="number"
                                        value={station.weight || ''}
                                        onChange={e => handleStationWeightChange(station.id, Number(e.target.value))}
                                        placeholder="Weight (lbs)"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Calculation Results</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Weight (lbs)</TableHead>
                                <TableHead className="text-right">Arm (in)</TableHead>
                                <TableHead className="text-right">Moment (lbs-in)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>Basic Empty Weight</TableCell>
                                <TableCell className="text-right">{basicEmptyWeight.toFixed(2)}</TableCell>
                                <TableCell className="text-right">N/A</TableCell>
                                <TableCell className="text-right">{basicEmptyWeightMoment.toFixed(2)}</TableCell>
                            </TableRow>
                            {stations.filter(s => s.weight > 0).map(s => (
                                <TableRow key={s.id}>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell className="text-right">{s.weight.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{s.arm.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{(s.weight * s.arm).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="font-bold bg-muted/50">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right">{calculation.totalWeight.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{calculation.centerOfGravity.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{calculation.totalMoment.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4">
                    {!calculation.isWithinLimits && (
                        <div className="flex items-center gap-2 text-destructive border border-destructive/50 bg-destructive/10 p-3 rounded-md">
                            <AlertCircle className="h-5 w-5" />
                            <p className="font-semibold">Warning: Center of Gravity or Total Weight is outside of the allowable limits.</p>
                        </div>
                    )}
                    <Button onClick={handleSaveToBooking} disabled={isSubmitting || !calculation.isWithinLimits}>
                        {isSubmitting ? 'Saving...' : 'Save Calculation to Booking'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
