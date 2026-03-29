'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Navigation, MapPin, Save, Info, Radio, Droplets, ChevronUp, ChevronDown, CloudLightning, Wind, Eye, Thermometer } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Booking, NavlogLeg, Navlog } from '@/types/booking';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { calculateWindTriangle, calculateEte, getBearing, getDistance, calculateFuelRequired, getMagneticVariation } from '@/lib/e6b';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCollection, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '@/types/aircraft';
import { MainPageHeader } from '@/components/page-header';

// Leaflet Imports with SSR safety
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import Leaflet components to avoid window resolution issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

interface NavlogBuilderProps {
    booking: Booking;
    tenantId: string;
}

const HeaderWithTooltip = ({ label, tooltip, highlight = false }: { label: string, tooltip: string, highlight?: boolean }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <div className={cn("flex items-center justify-center gap-1 cursor-help", highlight && "text-primary")}>
                {label}
                <Info className="h-2 w-2 opacity-50" />
            </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-[10px]">
            <p>{tooltip}</p>
        </TooltipContent>
    </Tooltip>
);

export function NavlogBuilder({ booking, tenantId }: NavlogBuilderProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const aircraftQuery = useMemoFirebase(
        () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null),
        [firestore, tenantId]
    );
    const { data: aircrafts } = useCollection<Aircraft>(aircraftQuery);
    const aircraft = useMemo(() => aircrafts?.find((ac) => ac.id === booking.aircraftId), [aircrafts, booking.aircraftId]);
    
    const [legs, setLegs] = useState<NavlogLeg[]>(booking.navlog?.legs || []);
    const [departure, setDeparture] = useState(booking.navlog?.departureIcao || '');
    const [arrival, setArrival] = useState(booking.navlog?.arrivalIcao || '');
    const [departureLatitude, setDepartureLatitude] = useState<number | undefined>(booking.navlog?.departureLatitude);
    const [departureLongitude, setDepartureLongitude] = useState<number | undefined>(booking.navlog?.departureLongitude);
    const [arrivalLatitude, setArrivalLatitude] = useState<number | undefined>(booking.navlog?.arrivalLatitude);
    const [arrivalLongitude, setArrivalLongitude] = useState<number | undefined>(booking.navlog?.arrivalLongitude);
    const [lookupLoading, setLookupLoading] = useState<Record<string, boolean>>({});
    const [mapMode, setMapMode] = useState<'waypoint' | 'departure' | 'arrival'>('departure');
    const [globalTas, setGlobalTas] = useState<number>(booking.navlog?.globalTas || 100);
    const [globalWindDir, setGlobalWindDir] = useState<number>(booking.navlog?.globalWindDirection || 0);
    const [globalWindSpd, setGlobalWindSpd] = useState<number>(booking.navlog?.globalWindSpeed || 0);
    const [globalVariation, setGlobalVariation] = useState<number>(booking.navlog?.globalVariation || 0);
    const [globalFuelBurn, setGlobalFuelBurn] = useState<number>(booking.navlog?.globalFuelBurn || 0);
    const [globalFuelBurnUnit, setGlobalFuelBurnUnit] = useState<'GPH' | 'LPH'>(booking.navlog?.globalFuelBurnUnit || 'LPH');
    const [fuelEnduranceHours, setFuelEnduranceHours] = useState<number | undefined>(booking.navlog?.fuelEnduranceHours ?? aircraft?.fuelEnduranceHours);
    const [briefingData, setBriefingData] = useState<Record<string, { metar: any | null; taf: any | null }>>({});
    const [briefingLoading, setBriefingLoading] = useState(false);
    const [briefingExpanded, setBriefingExpanded] = useState(true);
    const [airportBriefings, setAirportBriefings] = useState<Record<'departure' | 'arrival', { metar: any | null; taf: any | null }>>({
        departure: { metar: null, taf: null },
        arrival: { metar: null, taf: null },
    });
    const [airportBriefingLoading, setAirportBriefingLoading] = useState<Record<'departure' | 'arrival', boolean>>({
        departure: false,
        arrival: false,
    });
    const [collapsedBriefings, setCollapsedBriefings] = useState<Record<'departure' | 'arrival', boolean>>({
        departure: false,
        arrival: false,
    });
    const [plannerOpen, setPlannerOpen] = useState(false);

    const isReadOnly = booking.status === 'Completed';

    useEffect(() => {
        if (booking.navlog?.fuelEnduranceHours !== undefined) return;
        if (aircraft?.fuelEnduranceHours !== undefined) {
            setFuelEnduranceHours(aircraft.fuelEnduranceHours);
        }
    }, [aircraft?.fuelEnduranceHours, booking.navlog?.fuelEnduranceHours]);

    useEffect(() => {
        const openPlanner = () => setPlannerOpen(true);
        window.addEventListener('open-navlog-planner', openPlanner);
        return () => window.removeEventListener('open-navlog-planner', openPlanner);
    }, []);

    const fetchCoordinatesForIcao = async (icao: string) => {
        const station = icao.trim().toUpperCase();
        if (!station || station.length < 3) {
            throw new Error('Enter a valid ICAO code (3-4 characters).');
        }

        try {
            const noaaRes = await fetch(`/api/weather?ids=${station}`);
            if (noaaRes.ok) {
                const noaaJson = await noaaRes.json();
                const first = Array.isArray(noaaJson) ? noaaJson[0] : null;
                const lat = Number(first?.lat ?? first?.latitude);
                const lon = Number(first?.lon ?? first?.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
            }
        } catch (e) { console.warn('NOAA lookup failed:', e); }

        throw new Error(`No coordinates found for ${station}. Check the ICAO code and try again.`);
    };

    const fetchAirportBriefing = async (icao: string) => {
        const station = icao.trim().toUpperCase();
        if (!station || station.length < 3) return { metar: null, taf: null };

        const [metarRes, tafRes] = await Promise.all([
            fetch(`/api/weather?ids=${station}`).catch(() => null),
            fetch(`/api/weather/taf?ids=${station}`).catch(() => null),
        ]);

        const metar = metarRes?.ok ? ((await metarRes.json())?.[0] ?? null) : null;
        const taf = tafRes?.ok ? ((await tafRes.json())?.[0] ?? null) : null;

        return { metar, taf };
    };

    const loadAirportBriefing = async (type: 'departure' | 'arrival', icao: string) => {
        const station = icao.trim().toUpperCase();
        if (!station) return;

        setAirportBriefingLoading((current) => ({ ...current, [type]: true }));
        try {
            const briefing = await fetchAirportBriefing(station);
            setAirportBriefings((current) => ({ ...current, [type]: briefing }));
        } catch (error) {
            console.warn(`Failed to load ${type} airport briefing`, error);
            setAirportBriefings((current) => ({ ...current, [type]: { metar: null, taf: null } }));
        } finally {
            setAirportBriefingLoading((current) => ({ ...current, [type]: false }));
        }
    };


    const handleLookupEndpoint = async (type: 'departure' | 'arrival') => {
        const station = type === 'departure' ? departure : arrival;
        const key = `${type}-lookup`;
        setLookupLoading((current) => ({ ...current, [key]: true }));
        try {
            const coords = await fetchCoordinatesForIcao(station);
            if (type === 'departure') {
                setDepartureLatitude(coords.lat);
                setDepartureLongitude(coords.lon);
            } else {
                setArrivalLatitude(coords.lat);
                setArrivalLongitude(coords.lon);
            }
            void loadAirportBriefing(type, station);
            toast({ title: 'Coordinates Found', description: `${station.toUpperCase()} coordinates loaded.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Lookup Failed', description: error?.message || 'Could not resolve ICAO coordinates.' });
        } finally {
            setLookupLoading((current) => ({ ...current, [key]: false }));
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
                const tas = updatedLeg.trueAirspeed ?? globalTas;
                const wDir = updatedLeg.windDirection ?? globalWindDir;
                const wSpd = updatedLeg.windSpeed ?? globalWindSpd;
                const autoVariation = (updatedLeg.latitude !== undefined && updatedLeg.longitude !== undefined)
                    ? getMagneticVariation(updatedLeg.latitude, updatedLeg.longitude)
                    : undefined;
                const varMg = updatedLeg.variation ?? autoVariation ?? globalVariation;

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
                    const burn = updatedLeg.fuelBurnPerHour ?? globalFuelBurn;
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

    const fetchBriefing = async () => {
        const icaos = new Set<string>();
        if (departure && departure.length >= 3) icaos.add(departure.toUpperCase().trim());
        legs.forEach(leg => {
            if (leg.waypoint && /^[A-Z0-9]{3,4}$/.test(leg.waypoint.trim().toUpperCase())) {
                icaos.add(leg.waypoint.trim().toUpperCase());
            }
        });
        if (arrival && arrival.length >= 3) icaos.add(arrival.toUpperCase().trim());

        if (icaos.size === 0) {
            toast({ title: 'No Stations', description: 'Set a departure or arrival ICAO first.', variant: 'destructive' });
            return;
        }

        setBriefingLoading(true);
        setBriefingExpanded(true);
        const results: Record<string, { metar: any | null; taf: any | null }> = {};

        await Promise.all([...icaos].map(async (icao) => {
            const [metarRes, tafRes] = await Promise.all([
                fetch(`/api/weather?ids=${icao}`).catch(() => null),
                fetch(`/api/weather/taf?ids=${icao}`).catch(() => null),
            ]);
            const metar = metarRes?.ok ? ((await metarRes.json())?.[0] ?? null) : null;
            const taf = tafRes?.ok ? ((await tafRes.json())?.[0] ?? null) : null;
            results[icao] = { metar, taf };
        }));

        setBriefingData(results);
        setBriefingLoading(false);
    };

    const formatEte = (minutes: number): string => {
        if (!minutes || minutes <= 0) return '--:--';
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const formatDuration = (minutes: number): string => {
        if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) return '--:--';
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const renderWeatherBriefing = (
        label: string,
        icao: string,
        briefing: { metar: any | null; taf: any | null },
        loading: boolean,
        type: 'departure' | 'arrival',
    ) => (
        <div className="rounded-lg border bg-background/80 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] h-4 px-1.5">
                        {icao ? icao.toUpperCase() : '---'}
                    </Badge>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-[8px] font-black uppercase tracking-widest"
                        onClick={() => setCollapsedBriefings((current) => ({ ...current, [type]: !current[type] }))}
                    >
                        {collapsedBriefings[type] ? 'Show' : 'Hide'}
                    </Button>
                </div>
            </div>
            {collapsedBriefings[type] ? null : loading ? (
                <p className="text-[10px] text-muted-foreground">Loading weather...</p>
            ) : briefing.metar ? (
                <div className="space-y-1 text-[10px]">
                    <p className="font-bold text-foreground">
                        METAR: <span className="font-mono font-normal text-muted-foreground">{briefing.metar.rawOb ?? 'No raw METAR available'}</span>
                    </p>
                    <p className="text-muted-foreground">
                        Wind {briefing.metar.wdir ?? '--'}° @ {briefing.metar.wspd ?? '--'}kt
                        {briefing.metar.wgst ? ` gust ${briefing.metar.wgst}kt` : ''}
                    </p>
                    <p className="text-muted-foreground">
                        Vis {briefing.metar.visib ?? '--'} SM
                        {briefing.metar.temp != null ? `, Temp ${briefing.metar.temp}°C` : ''}
                        {briefing.metar.dewp != null ? `, Dewpoint ${briefing.metar.dewp}°C` : ''}
                    </p>
                </div>
            ) : (
                <p className="text-[10px] text-muted-foreground">No weather briefing loaded yet.</p>
            )}
        </div>
    );

    const handleAddLeg = () => {
        const newLeg: NavlogLeg = {
            id: uuidv4(),
            waypoint: '',
            legType: 'waypoint',
            trueAirspeed: 100,
            variation: 0,
        };
        setLegs([...legs, newLeg]);
    };

    const handleRemoveLeg = (id: string) => setLegs(legs.filter(l => l.id !== id));

    const handleMoveLeg = (id: string, direction: 'up' | 'down') => {
        const index = legs.findIndex(l => l.id === id);
        if (index === -1) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= legs.length) return;
        const newLegs = [...legs];
        [newLegs[index], newLegs[targetIndex]] = [newLegs[targetIndex], newLegs[index]];
        setLegs(recalculateLegs(newLegs));
    };

    const handleClearArrival = () => {
        setArrival('');
        setArrivalLatitude(undefined);
        setArrivalLongitude(undefined);
    };

    const handleClearPlan = () => {
        setLegs([]);
        setDeparture('');
        setArrival('');
        setDepartureLatitude(undefined);
        setDepartureLongitude(undefined);
        setArrivalLatitude(undefined);
        setArrivalLongitude(undefined);
        toast({ title: "Flight Plan Cleared", description: "All mission data has been reset." });
    };

    const handleLegChange = (id: string, field: keyof NavlogLeg, value: any) => {
        const updatedLegs = legs.map(leg => (leg.id === id ? { ...leg, [field]: value } : leg));
        setLegs(recalculateLegs(updatedLegs));
    };

    const handleSave = () => {
        if (!firestore) return;
        const navlog: Navlog = {
            legs,
            departureIcao: departure,
            arrivalIcao: arrival,
            departureLatitude,
            departureLongitude,
            arrivalLatitude,
            arrivalLongitude,
            globalTas,
            globalWindDirection: globalWindDir,
            globalWindSpeed: globalWindSpd,
            globalVariation,
            globalFuelBurn,
            globalFuelBurnUnit,
            fuelEnduranceHours,
        };
        updateDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/bookings`, booking.id), { navlog });
        toast({ title: 'Navlog Saved', description: 'Flight planning data has been updated.' });
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
                trueAirspeed: legs.length > 0 ? legs[legs.length - 1].trueAirspeed : 100,
                variation: 0,
            });
        }
        return recalculateLegs(fullRoute);
    }, [legs, arrivalLatitude, arrivalLongitude, departureLatitude, departureLongitude, arrival, globalTas, globalWindDir, globalWindSpd, globalVariation, globalFuelBurn, globalFuelBurnUnit]);

    return (
        <TooltipProvider>
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">

                
                <div className="p-4 border-b bg-muted/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Departure ICAO</label>
                        <div className="flex gap-2">
                            <Input placeholder="DEP" value={departure} onChange={(e) => setDeparture(e.target.value.toUpperCase())} className="h-8 uppercase font-mono" />
                            <Button variant="outline" size="sm" onClick={() => handleLookupEndpoint('departure')} className="h-8 gap-1 text-[9px] font-black uppercase">
                                {lookupLoading['departure-lookup'] ? <Info className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
                                Lookup
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Input type="number" placeholder="Lat" value={departureLatitude ?? ''} onChange={(e) => setDepartureLatitude(Number(e.target.value))} className="h-7 text-[10px]" />
                            <Input type="number" placeholder="Lon" value={departureLongitude ?? ''} onChange={(e) => setDepartureLongitude(Number(e.target.value))} className="h-7 text-[10px]" />
                        </div>
                        {renderWeatherBriefing('Departure Weather', departure, airportBriefings.departure, airportBriefingLoading.departure, 'departure')}
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Arrival ICAO</label>
                        <div className="flex gap-2">
                            <Input placeholder="ARR" value={arrival} onChange={(e) => setArrival(e.target.value.toUpperCase())} className="h-8 uppercase font-mono" />
                            <Button variant="outline" size="sm" onClick={() => handleLookupEndpoint('arrival')} className="h-8 gap-1 text-[9px] font-black uppercase">
                                {lookupLoading['arrival-lookup'] ? <Info className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
                                Lookup
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Input type="number" placeholder="Lat" value={arrivalLatitude ?? ''} onChange={(e) => setArrivalLatitude(Number(e.target.value))} className="h-7 text-[10px]" />
                            <Input type="number" placeholder="Lon" value={arrivalLongitude ?? ''} onChange={(e) => setArrivalLongitude(Number(e.target.value))} className="h-7 text-[10px]" />
                        </div>
                        {renderWeatherBriefing('Arrival Weather', arrival, airportBriefings.arrival, airportBriefingLoading.arrival, 'arrival')}
                    </div>
                </div>

                <div className="p-3 border-b bg-muted/10 grid grid-cols-1 gap-3 lg:grid-cols-6">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Navigation className="h-3 w-3" /> TAS (KT)</label>
                        <Input type="number" value={globalTas} onChange={(e) => setGlobalTas(Number(e.target.value))} className="h-8 w-full max-w-[140px] font-mono text-xs bg-slate-900/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Navigation className="h-3 w-3" /> Wind Dir (°T)</label>
                        <Input type="number" value={globalWindDir} onChange={(e) => setGlobalWindDir(Number(e.target.value))} className="h-8 w-full max-w-[140px] font-mono text-xs bg-slate-900/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Navigation className="h-3 w-3" /> Wind Spd (KT)</label>
                        <Input type="number" value={globalWindSpd} onChange={(e) => setGlobalWindSpd(Number(e.target.value))} className="h-8 w-full max-w-[140px] font-mono text-xs bg-slate-900/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Navigation className="h-3 w-3" /> Mag Var (°)</label>
                        <div className="flex gap-1 items-center">
                            <Input
                                type="number"
                                value={globalVariation}
                                onChange={(e) => setGlobalVariation(Number(e.target.value))}
                                className="h-8 w-full max-w-[110px] font-mono text-xs bg-slate-900/50"
                                placeholder="fallback"
                            />
                        </div>
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Droplets className="h-3 w-3 text-emerald-500" /> Fuel Burn</label>
                        <div className="flex flex-wrap gap-1 items-center">
                            <Input type="number" value={globalFuelBurn} onChange={(e) => setGlobalFuelBurn(Number(e.target.value))} className="h-8 w-full max-w-[110px] font-mono text-xs bg-slate-900/50" />
                            <Button variant="outline" size="sm" className="h-8 text-[8px] font-black uppercase px-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-black" onClick={() => setGlobalFuelBurnUnit(globalFuelBurnUnit === 'GPH' ? 'LPH' : 'GPH')}>{globalFuelBurnUnit}</Button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[1320px]">
                    <Table className="w-full table-fixed">
                        <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-[58px] px-2 text-[10px] font-black uppercase tracking-widest text-center">Seq</TableHead>
                                <TableHead className="w-[50px] px-2 text-[10px] font-black uppercase tracking-widest">Fix</TableHead>
                                <TableHead className="w-[58px] px-2 text-[10px] font-black uppercase tracking-widest text-center">Coords</TableHead>
                                <TableHead className="w-[68px] px-2 text-[10px] font-black uppercase tracking-widest text-center">Freq</TableHead>
                                <TableHead className="w-[110px] px-2 text-[10px] font-black uppercase tracking-widest">Notes</TableHead>
                                <TableHead className="w-[58px] px-2 text-[10px] font-black uppercase tracking-widest text-center text-sky-400">Alt</TableHead>
                                <TableHead className="w-[58px] px-2 text-[10px] font-black uppercase tracking-widest text-center text-primary">TR</TableHead>
                                <TableHead className="w-[58px] px-2 text-[10px] font-black uppercase tracking-widest text-center text-white">MH</TableHead>
                                <TableHead className="w-[64px] px-2 text-[10px] font-black uppercase tracking-widest text-center text-amber-500">Dist</TableHead>
                                <TableHead className="w-[58px] px-2 text-[10px] font-black uppercase tracking-widest text-center text-primary">GS</TableHead>
                                <TableHead className="w-[58px] px-2 text-[10px] font-black uppercase tracking-widest text-center text-primary">ETE</TableHead>
                                <TableHead className="w-[58px] px-2 text-[10px] font-black uppercase tracking-widest text-center text-emerald-500">Fuel</TableHead>
                                <TableHead className="w-[72px] px-2 text-[10px] font-black uppercase tracking-widest text-center text-white bg-slate-900/20">Total</TableHead>
                                {!isReadOnly && <TableHead className="w-[48px] px-1 text-center"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {computedLegs.length === 0 ? (
                                <TableRow><TableCell colSpan={12} className="h-32 text-center text-[10px] font-black uppercase opacity-20">No route defined</TableCell></TableRow>
                            ) : computedLegs.map((leg, i) => (
                                <TableRow key={leg.id} className="group border-b hover:bg-muted/10 transition-colors">
                                    <TableCell className="px-3 text-center font-black text-[10px] text-muted-foreground/50 whitespace-nowrap">
                                        {leg.legType === 'arrival-fix' ? <Badge variant="outline" className="bg-amber-500/10 text-amber-500 text-[8px] px-1 font-black">ARR</Badge> : (i + 1).toString().padStart(2, '0')}
                                    </TableCell>
                                    <TableCell className="px-3">
                                        <Input value={leg.waypoint} onChange={(e) => leg.id === 'terminal-leg' ? setArrival(e.target.value.toUpperCase()) : handleLegChange(leg.id, 'waypoint', e.target.value.toUpperCase())} className="h-7 w-full px-1 text-xs font-black uppercase border-none bg-transparent" />
                                    </TableCell>
                                    <TableCell className="px-3 text-center font-mono text-[9px] text-muted-foreground leading-tight whitespace-nowrap">
                                        <div>{leg.latitude?.toFixed(4)}</div><div>{leg.longitude?.toFixed(4)}</div>
                                    </TableCell>
                                    <TableCell className="px-2 text-center"><Input value={leg.frequencies || ''} onChange={(e) => handleLegChange(leg.id, 'frequencies', e.target.value)} className="mx-auto h-7 w-[62px] px-1 text-[9px] text-center bg-transparent border-none font-mono" placeholder="---" maxLength={8} /></TableCell>
                                    <TableCell className="px-3"><Input value={leg.notes || ''} onChange={(e) => handleLegChange(leg.id, 'notes', e.target.value)} className="h-7 w-full px-1 text-[10px] bg-transparent border-none" placeholder="..." /></TableCell>
                                    <TableCell className="px-3">
                                        <Input
                                            type="number"
                                            value={leg.altitude ?? ''}
                                            onChange={(e) => handleLegChange(leg.id, 'altitude', e.target.value ? Number(e.target.value) : undefined)}
                                            className="h-7 w-full px-1 text-[9px] text-center bg-transparent border-none font-mono text-sky-400"
                                            placeholder="---"
                                        />
                                    </TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-black text-primary whitespace-nowrap">{Math.round(leg.trueCourse || 0)}°</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-black text-white bg-slate-900/30 whitespace-nowrap">{Math.round(leg.magneticHeading || 0).toString().padStart(3, '0')}°</TableCell>
                                    <TableCell className="px-3 text-center text-[11px] font-black text-amber-500 whitespace-nowrap">{leg.distance?.toFixed(1)} NM</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-bold text-primary whitespace-nowrap">{Math.round(leg.groundSpeed || 0)}</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-bold text-primary font-mono whitespace-nowrap">{formatEte(leg.ete || 0)}</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-bold text-emerald-500 font-mono whitespace-nowrap">{leg.tripFuel ? `${leg.tripFuel.toFixed(1)}` : '—'}</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-black text-white bg-slate-900/50 font-mono whitespace-nowrap">{formatEte(leg.cumulativeEte || 0)}</TableCell>
                                    {!isReadOnly && (
                                        <TableCell>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-5 w-5 hover:text-red-500 hover:bg-red-500/10"
                                                    onClick={() => leg.id === 'terminal-leg' ? handleClearArrival() : handleRemoveLeg(leg.id)}
                                                    title={leg.id === 'terminal-leg' ? 'Clear Arrival' : 'Delete Leg'}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </div>
                {!isReadOnly && (
                    <div className="mt-auto p-3 border-t bg-muted/5 flex justify-between items-center shrink-0">
                        <Button variant="outline" size="sm" onClick={handleAddLeg} className="gap-2 h-8 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary">
                            <Plus className="h-4 w-4" /> Add Manual Waypoint
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleSave} className="gap-2 h-8 text-[10px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-600">
                            <Save className="h-4 w-4" /> Save Navlog
                        </Button>
                    </div>
                )}
            </div>
            </div>
        </TooltipProvider>
    );
}
