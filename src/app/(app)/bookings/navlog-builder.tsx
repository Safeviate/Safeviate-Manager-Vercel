'use client';

import { useState, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import type { Booking, NavlogLeg } from '@/types/booking';
import { useFirestore } from '@/firebase';
import { calculateWindTriangle, calculateEte, getBearing, getDistance, calculateFuelRequired, getMagneticVariation } from '@/lib/e6b';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '@/types/aircraft';
import { cn } from '@/lib/utils';

interface NavlogBuilderProps {
    booking: Booking;
    tenantId: string;
}

export function NavlogBuilder({ booking, tenantId }: NavlogBuilderProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const aircraftQuery = useMemoFirebase(
        () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null),
        [firestore, tenantId]
    );
    const { data: aircrafts } = useCollection<Aircraft>(aircraftQuery);
    
    const [legs, setLegs] = useState<NavlogLeg[]>(booking.navlog?.legs || []);
    const [departure, setDeparture] = useState(booking.navlog?.departureIcao || '');
    const [arrival, setArrival] = useState(booking.navlog?.arrivalIcao || '');
    const [departureLatitude, setDepartureLatitude] = useState<number | undefined>(booking.navlog?.departureLatitude);
    const [departureLongitude, setDepartureLongitude] = useState<number | undefined>(booking.navlog?.departureLongitude);
    const [arrivalLatitude, setArrivalLatitude] = useState<number | undefined>(booking.navlog?.arrivalLatitude);
    const [arrivalLongitude, setArrivalLongitude] = useState<number | undefined>(booking.navlog?.arrivalLongitude);
    const [lookupLoading, setLookupLoading] = useState<Record<string, boolean>>({});
    
    const [globalTas, setGlobalTas] = useState<number>(booking.navlog?.globalTas || 100);
    const [globalWindDir, setGlobalWindDir] = useState<number>(booking.navlog?.globalWindDirection || 0);
    const [globalWindSpd, setGlobalWindSpd] = useState<number>(booking.navlog?.globalWindSpeed || 0);
    const [globalVariation, setGlobalVariation] = useState<number>(booking.navlog?.globalVariation || 0);
    const [globalFuelBurn, setGlobalFuelBurn] = useState<number>(booking.navlog?.globalFuelBurn || 0);
    const [globalFuelBurnUnit, setGlobalFuelBurnUnit] = useState<'GPH' | 'LPH'>(booking.navlog?.globalFuelBurnUnit || 'LPH');

    const isReadOnly = booking.status === 'Completed';

    const fetchCoordinatesForIcao = async (icao: string) => {
        const station = icao.trim().toUpperCase();
        if (!station || station.length < 3) throw new Error('Enter a valid ICAO code.');
        const res = await fetch(`/api/weather?ids=${station}`);
        if (!res.ok) throw new Error(`Lookup failed for ${station}`);
        const json = await res.json();
        const first = Array.isArray(json) ? json[0] : null;
        const lat = Number(first?.lat ?? first?.latitude);
        const lon = Number(first?.lon ?? first?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
        throw new Error(`No coordinates for ${station}`);
    };

    const handleLookup = async (type: 'departure' | 'arrival') => {
        const station = type === 'departure' ? departure : arrival;
        const key = `${type}-lookup`;
        setLookupLoading(curr => ({ ...curr, [key]: true }));
        try {
            const coords = await fetchCoordinatesForIcao(station);
            if (type === 'departure') {
                setDepartureLatitude(coords.lat);
                setDepartureLongitude(coords.lon);
            } else {
                setArrivalLatitude(coords.lat);
                setArrivalLongitude(coords.lon);
            }
            toast({ title: 'Coordinates Found', description: `${station.toUpperCase()} location loaded.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Lookup Failed', description: error?.message });
        } finally {
            setLookupLoading(curr => ({ ...curr, [key]: false }));
        }
    };

    const recalculateLegs = (sourceLegs: NavlogLeg[]) => {
        let previousPoint =
            departureLatitude !== undefined && departureLongitude !== undefined
                ? { lat: departureLatitude, lon: departureLongitude }
                : null;

        let runningEte = 0;

        return sourceLegs.map((leg) => {
            const updatedLeg = { ...leg };

            if (previousPoint && updatedLeg.latitude !== undefined && updatedLeg.longitude !== undefined) {
                updatedLeg.trueCourse = parseFloat(getBearing(previousPoint, { lat: updatedLeg.latitude, lon: updatedLeg.longitude }).toFixed(1));
                updatedLeg.distance = parseFloat(getDistance(previousPoint, { lat: updatedLeg.latitude, lon: updatedLeg.longitude }).toFixed(1));
            }
            
            if (updatedLeg.trueCourse !== undefined) {
                const tas = updatedLeg.trueAirspeed || globalTas;
                const wDir = updatedLeg.windDirection || globalWindDir;
                const wSpd = updatedLeg.windSpeed || globalWindSpd;
                const autoVariation = (updatedLeg.latitude !== undefined && updatedLeg.longitude !== undefined)
                    ? getMagneticVariation(updatedLeg.latitude, updatedLeg.longitude)
                    : undefined;
                const varMg = updatedLeg.variation || autoVariation || globalVariation;

                const result = calculateWindTriangle({
                    trueCourse: Number(updatedLeg.trueCourse),
                    trueAirspeed: Number(tas),
                    windDirection: Number(wDir),
                    windSpeed: Number(wSpd),
                });

                updatedLeg.wca = parseFloat(result.windCorrectionAngle.toFixed(1));
                updatedLeg.trueHeading = parseFloat(result.heading.toFixed(1));
                updatedLeg.groundSpeed = parseFloat(result.groundSpeed.toFixed(1));
                updatedLeg.magneticHeading = (updatedLeg.trueHeading - Number(varMg) + 360) % 360;

                if (updatedLeg.distance !== undefined && updatedLeg.groundSpeed > 0) {
                    updatedLeg.ete = parseFloat(calculateEte(Number(updatedLeg.distance), updatedLeg.groundSpeed).toFixed(1));
                    const burn = updatedLeg.fuelBurnPerHour || globalFuelBurn;
                    if (burn > 0) {
                        updatedLeg.tripFuel = parseFloat(calculateFuelRequired(updatedLeg.ete, burn).toFixed(1));
                    }
                }
            }

            runningEte += Number(updatedLeg.ete || 0);
            updatedLeg.cumulativeEte = runningEte > 0 ? parseFloat(runningEte.toFixed(1)) : undefined;

            if (updatedLeg.latitude !== undefined && updatedLeg.longitude !== undefined) {
                previousPoint = { lat: updatedLeg.latitude, lon: updatedLeg.longitude };
            }

            return updatedLeg;
        });
    };

    const handleLegChange = (id: string, field: keyof NavlogLeg, value: any) => {
        const updatedLegs = legs.map(leg => (leg.id === id ? { ...leg, [field]: value } : leg));
        setLegs(recalculateLegs(updatedLegs));
    };

    const handleRemoveLeg = (id: string) => setLegs(legs.filter(l => l.id !== id));

    const formatEte = (minutes: number): string => {
        if (!minutes || minutes <= 0) return '--:--';
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const computedLegs = useMemo(() => {
        const fullRoute = [...legs];
        if (arrivalLatitude && arrivalLongitude) {
            fullRoute.push({
                id: 'terminal-leg',
                waypoint: arrival || 'ARRIVAL',
                latitude: arrivalLatitude,
                longitude: arrivalLongitude,
                legType: 'arrival-fix',
                trueAirspeed: legs.length > 0 ? legs[legs.length - 1].trueAirspeed : globalTas,
                variation: globalVariation,
            });
        }
        return recalculateLegs(fullRoute);
    }, [legs, arrivalLatitude, arrivalLongitude, departureLatitude, departureLongitude, arrival, globalTas, globalWindDir, globalWindSpd, globalVariation, globalFuelBurn]);

    return (
        <div className="flex flex-col h-full min-h-[600px]">
            {/* Header Inputs */}
            <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/5 border-b">
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Departure Info</Label>
                    <div className="flex gap-2">
                        <Input placeholder="DEP ICAO" value={departure} onChange={(e) => setDeparture(e.target.value.toUpperCase())} className="h-9 font-mono uppercase bg-background" />
                        <Button variant="outline" size="sm" onClick={() => handleLookup('departure')} disabled={lookupLoading['departure-lookup']} className="h-9 font-black uppercase text-[10px] border-slate-300">
                            Lookup
                        </Button>
                    </div>
                </div>
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arrival Info</Label>
                    <div className="flex gap-2">
                        <Input placeholder="ARR ICAO" value={arrival} onChange={(e) => setArrival(e.target.value.toUpperCase())} className="h-9 font-mono uppercase bg-background" />
                        <Button variant="outline" size="sm" onClick={() => handleLookup('arrival')} disabled={lookupLoading['arrival-lookup']} className="h-9 font-black uppercase text-[10px] border-slate-300">
                            Lookup
                        </Button>
                    </div>
                </div>
            </div>

            {/* Global Settings */}
            <div className="shrink-0 px-6 py-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 border-b">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">TAS (KT)</Label>
                    <Input type="number" value={globalTas} onChange={(e) => setGlobalTas(Number(e.target.value))} className="h-8 text-xs font-bold bg-background" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Wind Dir</Label>
                    <Input type="number" value={globalWindDir} onChange={(e) => setGlobalWindDir(Number(e.target.value))} className="h-8 text-xs font-bold bg-background" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Wind Spd</Label>
                    <Input type="number" value={globalWindSpd} onChange={(e) => setGlobalWindSpd(Number(e.target.value))} className="h-8 text-xs font-bold bg-background" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Fuel Burn</Label>
                    <div className="flex gap-1">
                        <Input type="number" value={globalFuelBurn} onChange={(e) => setGlobalFuelBurn(Number(e.target.value))} className="h-8 text-xs font-bold bg-background" />
                        <Button variant="outline" className="h-8 text-[8px] font-black" onClick={() => setGlobalFuelBurnUnit(globalFuelBurnUnit === 'LPH' ? 'GPH' : 'LPH')}>{globalFuelBurnUnit}</Button>
                    </div>
                </div>
            </div>

            {/* Navlog Table */}
            <div className="flex-1 min-h-0 px-6 py-6">
                <div className="h-full rounded-xl border overflow-hidden bg-card shadow-sm flex flex-col">
                    <div className="flex-1 overflow-auto no-scrollbar">
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-12 text-center text-[10px] uppercase font-bold tracking-wider">Seq</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold tracking-wider">Fix</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-center">TR</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-center">MH</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-right">Dist</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-center">ETE</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold tracking-wider text-center">Total</TableHead>
                                    {!isReadOnly && <TableHead className="w-10"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {computedLegs.map((leg, i) => (
                                    <TableRow key={leg.id} className="hover:bg-muted/5 group">
                                        <TableCell className="text-center font-bold text-xs text-muted-foreground">
                                            {leg.legType === 'arrival-fix' ? 'ARR' : (i + 1).toString().padStart(2, '0')}
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                value={leg.waypoint} 
                                                onChange={(e) => handleLegChange(leg.id, 'waypoint', e.target.value.toUpperCase())} 
                                                className="h-7 border-none bg-transparent font-black text-sm p-0 focus-visible:ring-0 uppercase"
                                                readOnly={isReadOnly || leg.id === 'terminal-leg'}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-xs">{Math.round(leg.trueCourse || 0)}°</TableCell>
                                        <TableCell className="text-center font-mono font-black text-xs text-primary">{Math.round(leg.magneticHeading || 0).toString().padStart(3, '0')}°</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-xs">{leg.distance?.toFixed(1)} NM</TableCell>
                                        <TableCell className="text-center font-mono font-bold text-xs text-emerald-600">{formatEte(leg.ete || 0)}</TableCell>
                                        <TableCell className="text-center font-mono font-black text-xs">{formatEte(leg.cumulativeEte || 0)}</TableCell>
                                        {!isReadOnly && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveLeg(leg.id)} className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {computedLegs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-64 text-center text-muted-foreground italic text-xs uppercase font-bold tracking-widest bg-muted/5">No waypoints defined.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
