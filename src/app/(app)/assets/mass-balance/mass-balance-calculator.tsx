
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Fuel, Save } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { isPointInPolygon } from '@/lib/utils';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { AircraftModelProfile, Station } from './page';
import type { Booking } from '@/types/booking';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

const toCamelCase = (str: string) => {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
};

export default function MassBalanceCalculator() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const tenantId = 'safeviate'; // Hardcoded for now

    const aircraftId = searchParams.get('aircraftId');
    const bookingId = searchParams.get('bookingId');
    const profileId = searchParams.get('profileId');
    
    const [stations, setStations] = useState<Station[]>([]);
    const [cgEnvelope, setCgEnvelope] = useState<{ x: number, y: number }[]>([]);
    const [chartLimits, setChartLimits] = useState({ xMin: 0, xMax: 100, yMin: 0, yMax: 3000 });
    const [profileName, setProfileName] = useState('');

    const aircraftRef = useMemoFirebase(
        () => (firestore && aircraftId ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const bookingRef = useMemoFirebase(
        () => (firestore && bookingId ? doc(firestore, `tenants/${tenantId}/bookings`, bookingId) : null),
        [firestore, tenantId, bookingId]
    );

    const profileRef = useMemoFirebase(
        () => (firestore && profileId ? doc(firestore, `tenants/${tenantId}/massAndBalance`, profileId) : null),
        [firestore, tenantId, profileId]
    );

    const { data: aircraft } = useDoc<any>(aircraftRef);
    const { data: booking } = useDoc<Booking>(bookingRef);
    const { data: profile } = useDoc<AircraftModelProfile>(profileRef);

    useEffect(() => {
        let initialStations: Station[] = [];
        if (profile) { // If loading from a template
            initialStations = profile.stations || [];
            setCgEnvelope(profile.cgEnvelope || []);
            setChartLimits({ xMin: profile.xMin || 0, xMax: profile.xMax || 100, yMin: profile.yMin || 0, yMax: profile.yMax || 3000 });
            setProfileName(profile.profileName || '');
        } else if (aircraft) { // If loading from an aircraft's own config
             if (booking?.massAndBalance) {
                const loadedStations: Station[] = [];
                // This logic needs to map the flat camelCase object back to the stations array
                // For simplicity, we will rely on a pre-defined station list from the aircraft/profile for now
            }
            initialStations = [
                { id: 1, name: 'Basic Empty Weight', weight: aircraft.emptyWeight || 0, arm: (aircraft.emptyWeightMoment || 0) / (aircraft.emptyWeight || 1), type: 'fixed' },
                { id: 2, name: 'Front Seats', weight: 0, arm: aircraft.stationArms?.frontSeats || 0, type: 'variable' },
                { id: 3, name: 'Rear Seats', weight: 0, arm: aircraft.stationArms?.rearSeats || 0, type: 'variable' },
                { id: 4, name: 'Baggage 1', weight: 0, arm: aircraft.stationArms?.baggage1 || 0, type: 'variable' },
                { id: 5, name: 'Fuel', weight: 0, arm: aircraft.stationArms?.fuel || 0, type: 'fuel', gallons: 0, maxGallons: 50 },
            ];
            setCgEnvelope(aircraft.cgEnvelope || []);
        }
        setStations(initialStations);
    }, [aircraft, profile, booking]);

    const handleWeightChange = (id: number, newWeight: number) => {
        setStations(prev =>
            prev.map(station =>
                station.id === id ? { ...station, weight: newWeight } : station
            )
        );
    };

    const handleGallonsChange = (id: number, newGallons: number) => {
         setStations(prev =>
            prev.map(station =>
                station.id === id && station.type === 'fuel' ? { ...station, gallons: newGallons, weight: newGallons * FUEL_WEIGHT_PER_GALLON } : station
            )
        );
    }
    
    const addNewStation = () => {
        setStations(prev => [...prev, {
            id: prev.length > 0 ? Math.max(...prev.map(s => s.id)) + 1 : 1,
            name: 'New Station',
            weight: 0,
            arm: 0,
            type: 'variable'
        }]);
    }

    const addNewFuelStation = () => {
        setStations(prev => [...prev, {
            id: prev.length > 0 ? Math.max(...prev.map(s => s.id)) + 1 : 1,
            name: 'Aux Fuel',
            weight: 0,
            arm: 0,
            type: 'fuel',
            gallons: 0,
            maxGallons: 30
        }]);
    }
    
    const removeStation = (id: number) => {
        setStations(prev => prev.filter(s => s.id !== id));
    }


    const { totalWeight, totalMoment, centerOfGravity } = useMemo(() => {
        let weight = 0;
        let moment = 0;
        stations.forEach(station => {
            weight += station.weight;
            moment += station.weight * station.arm;
        });
        return {
            totalWeight: parseFloat(weight.toFixed(2)),
            totalMoment: parseFloat(moment.toFixed(2)),
            centerOfGravity: weight > 0 ? parseFloat((moment / weight).toFixed(2)) : 0
        };
    }, [stations]);

    const isWithinLimits = useMemo(() => {
        return isPointInPolygon({ x: centerOfGravity, y: totalWeight }, cgEnvelope);
    }, [centerOfGravity, totalWeight, cgEnvelope]);

    const chartData = [
        { x: centerOfGravity, y: totalWeight, isCenterOfGravity: true }
    ];

    const handleSaveToBooking = () => {
        if (!bookingRef) {
            toast({
                variant: "destructive",
                title: "No Booking Selected",
                description: "You must access this page from a booking to save the calculation.",
            });
            return;
        }

        const massAndBalance = stations.reduce((acc, station) => {
            const key = toCamelCase(station.name);
            acc[key] = {
                weight: station.weight,
                moment: station.weight * station.arm
            };
            return acc;
        }, {} as { [key: string]: { weight: number; moment: number } });


        updateDocumentNonBlocking(bookingRef, { massAndBalance });
        
        toast({
            title: "Saved to Booking",
            description: "The mass and balance calculation has been saved.",
        });
    };
    
    const [isSaving, setIsSaving] = useState(false);
    const handleSaveAsProfile = async () => {
        if (!profileName.trim()) {
            toast({ variant: 'destructive', title: 'Profile name required' });
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave: Omit<AircraftModelProfile, 'id'> = {
                profileName,
                stations,
                cgEnvelope,
                xMin: chartLimits.xMin,
                xMax: chartLimits.xMax,
                yMin: chartLimits.yMin,
                yMax: chartLimits.yMax,
            };
            const collectionRef = collection(firestore, `tenants/${tenantId}/massAndBalance`);
            await updateDocumentNonBlocking(doc(collectionRef, profileName.toLowerCase().replace(/\s/g, '-')), dataToSave);
            toast({ title: 'Profile Saved', description: `Profile "${profileName}" has been saved.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error saving profile' });
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Loading Stations</CardTitle>
                        <div className="flex gap-2 pt-2">
                           <Button size="sm" variant="outline" onClick={addNewFuelStation}><Fuel className="mr-2 h-4 w-4" /> Add Fuel</Button>
                           <Button size="sm" variant="outline" onClick={addNewStation}><Plus className="mr-2 h-4 w-4" /> Add</Button>
                           {bookingId && (
                                <Button size="sm">Save</Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Station</TableHead>
                                    <TableHead>Weight (lbs)</TableHead>
                                    <TableHead>Arm (in)</TableHead>
                                    <TableHead>Moment (lb-in)</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stations.map(station => (
                                    <TableRow key={station.id}>
                                        <TableCell className="font-medium">{station.name}</TableCell>
                                        <TableCell>
                                            {station.type === 'fuel' ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={station.gallons}
                                                        onChange={e => handleGallonsChange(station.id, parseFloat(e.target.value) || 0)}
                                                        className="w-24"
                                                    />
                                                     <span className="text-muted-foreground text-xs">gal</span>
                                                </div>
                                            ) : (
                                                <Input
                                                    type="number"
                                                    value={station.weight}
                                                    onChange={e => handleWeightChange(station.id, parseFloat(e.target.value) || 0)}
                                                    readOnly={station.type === 'fixed'}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>{station.arm.toFixed(2)}</TableCell>
                                        <TableCell>{(station.weight * station.arm).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                           {station.type !== 'fixed' && (
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
                        <CardTitle>Save Configuration</CardTitle>
                        <CardDescription>Save the current stations and chart settings as a reusable profile.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="flex gap-2">
                            <Input 
                                placeholder="Enter profile name..." 
                                value={profileName} 
                                onChange={(e) => setProfileName(e.target.value)} 
                                disabled={isSaving}
                            />
                            <Button onClick={handleSaveAsProfile} disabled={isSaving || !profileName}>
                                {isSaving ? 'Saving...' : 'Save as Profile'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Totals &amp; CG</CardTitle>
                        <div className='flex justify-between items-center'>
                            <CardDescription>
                                Calculated totals and center of gravity.
                            </CardDescription>
                            {bookingId && (
                                <Button onClick={handleSaveToBooking}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save to Booking
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Total Weight</p>
                            <p className="text-2xl font-bold">{totalWeight} lbs</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Total Moment</p>
                            <p className="text-2xl font-bold">{totalMoment} lb-in</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Center of Gravity</p>
                            <p className="text-2xl font-bold">{centerOfGravity} in</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Center of Gravity Envelope</CardTitle>
                        <CardDescription className={isWithinLimits ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
                            {isWithinLimits ? 'Within operational limits.' : 'OUTSIDE of operational limits.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-96 w-full">
                             <ChartContainer config={{}} className="h-full w-full">
                                <AreaChart data={cgEnvelope} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                     <defs>
                                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--muted))" strokeWidth="0.5"/>
                                        </pattern>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="transparent" />
                                    <rect width="100%" height="100%" fill="url(#grid)" />
                                    <XAxis
                                        type="number"
                                        dataKey="x"
                                        domain={[chartLimits.xMin, chartLimits.xMax]}
                                        tickCount={10}
                                        tickFormatter={(value) => value.toFixed(1)}
                                        name="CG (in)"
                                    >
                                        <Label value="Center of Gravity (inches)" offset={-15} position="insideBottom" />
                                    </XAxis>
                                    <YAxis
                                        type="number"
                                        dataKey="y"
                                        domain={[chartLimits.yMin, chartLimits.yMax]}
                                        tickCount={10}
                                        name="Weight (lbs)"
                                    >
                                        <Label value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                    </YAxis>
                                    <Tooltip
                                        cursor={{ stroke: 'hsl(var(--primary))' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const point = payload[0].payload;
                                                return (
                                                    <div className="bg-background border p-2 rounded-md shadow-lg">
                                                        <p>Weight: {point.y.toFixed(2)} lbs</p>
                                                        <p>CG: {point.x.toFixed(2)} in</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area type="monotone" dataKey="y" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                                    {/* CG Point */}
                                     {chartData.map((point, index) => (
                                        <ReferenceLine key={`point-${index}`} x={point.x} y={point.y} ifOverflow="visible">
                                             <Label
                                                value="CG"
                                                position="top"
                                                fill={isWithinLimits ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
                                                fontSize="12"
                                                fontWeight="bold"
                                             />
                                        </ReferenceLine>
                                     ))}
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Chart Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Input type="number" value={chartLimits.xMin} onChange={e => setChartLimits(p => ({...p, xMin: Number(e.target.value)}))} placeholder="X Min" />
                        <Input type="number" value={chartLimits.xMax} onChange={e => setChartLimits(p => ({...p, xMax: Number(e.target.value)}))} placeholder="X Max" />
                        <Input type="number" value={chartLimits.yMin} onChange={e => setChartLimits(p => ({...p, yMin: Number(e.target.value)}))} placeholder="Y Min" />
                        <Input type="number" value={chartLimits.yMax} onChange={e => setChartLimits(p => ({...p, yMax: Number(e.target.value)}))} placeholder="Y Max" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

