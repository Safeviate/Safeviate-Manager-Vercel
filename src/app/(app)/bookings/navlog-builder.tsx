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

// Leaflet Imports
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents, GeoJSON, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix missing leaf images in NextJS & Custom SVGs
const createLabeledIcon = (label: string, color: string) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); font-size: 10px;">${label}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

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

        // Source 1: NOAA Aviation Weather (fastest, returns coords inside METAR)
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

        // Source 2: OpenAIP airport database (global coverage â€” reliable for FA** airports)
        try {
            const openAipRes = await fetch(`/api/openaip?resource=airports&icaoCode=${station}&limit=1`);
            if (openAipRes.ok) {
                const openAipData = await openAipRes.json();
                const airport = openAipData.items?.[0];
                if (airport?.geometry?.coordinates?.length >= 2) {
                    // GeoJSON order is [longitude, latitude]
                    const lon = Number(airport.geometry.coordinates[0]);
                    const lat = Number(airport.geometry.coordinates[1]);
                    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
                }
            }
        } catch (e) { console.warn('OpenAIP lookup failed:', e); }

        // Source 3: AVWX (last resort)
        try {
            const avwxRes = await fetch(`/api/weather/avwx?icao=${station}`);
            if (avwxRes.ok) {
                const avwxJson = await avwxRes.json();
                const lat = Number(avwxJson?.lat ?? avwxJson?.latitude ?? avwxJson?.station?.latitude);
                const lon = Number(avwxJson?.lon ?? avwxJson?.longitude ?? avwxJson?.station?.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
            }
        } catch (e) { console.warn('AVWX lookup failed:', e); }

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

                // Variation is positive east and negative west.
                // Magnetic heading = true heading - variation.
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

    const getFlightCategory = (data: any): string | null => {
        if (!data) return null;
        if (data.fltcat && data.fltcat !== 'UNKNOWN') return data.fltcat;
        const vis = parseFloat(data.visib);
        let ceiling = 10000;
        if (data.clouds?.length > 0) {
            const layers = data.clouds.filter((c: any) => c.cover === 'BKN' || c.cover === 'OVC');
            if (layers.length > 0) ceiling = Math.min(...layers.map((l: any) => l.base || 10000));
        }
        if (vis > 5 && ceiling > 3000) return 'VFR';
        if (vis >= 3 && ceiling >= 1000) return 'MVFR';
        if (vis >= 1 && ceiling >= 500) return 'IFR';
        return 'LIFR';
    };

    const flightCatColor = (cat: string | null) => {
        switch (cat) {
            case 'VFR':  return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'MVFR': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'IFR':  return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'LIFR': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default:     return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
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
                        Wind {briefing.metar.wdir ?? '--'}Â° @ {briefing.metar.wspd ?? '--'}kt
                        {briefing.metar.wgst ? ` gust ${briefing.metar.wgst}kt` : ''}
                    </p>
                    <p className="text-muted-foreground">
                        Vis {briefing.metar.visib ?? '--'} SM
                        {briefing.metar.temp != null ? `, Temp ${briefing.metar.temp}Â°C` : ''}
                        {briefing.metar.dewp != null ? `, Dewpoint ${briefing.metar.dewp}Â°C` : ''}
                    </p>
                    {briefing.taf ? (
                        <p className="text-muted-foreground">
                            TAF: <span className="font-mono">{briefing.taf.rawTAF ?? 'No raw TAF available'}</span>
                        </p>
                    ) : (
                        <p className="text-muted-foreground">TAF: unavailable</p>
                    )}
                </div>
            ) : (
                <p className="text-[10px] text-muted-foreground">No weather briefing loaded yet.</p>
            )}
            {!collapsedBriefings[type] && !loading && icao ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[9px] font-black uppercase tracking-widest"
                    onClick={() => void loadAirportBriefing(type, icao)}
                >
                    Refresh Weather
                </Button>
            ) : null}
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
                </div>
                </div>
                {!isReadOnly && (
                    <Dialog open={plannerOpen} onOpenChange={setPlannerOpen}>
                        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden bg-slate-900 border-slate-700 flex flex-col">
                            <DialogHeader className="p-4 bg-slate-950 border-b border-white/5 shrink-0">
                                <DialogTitle className="text-white text-sm font-black uppercase tracking-widest">Mission Route Planner</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 relative w-full h-full min-h-0 bg-slate-900">
                                <MapContainer
                                    center={departureLatitude && departureLongitude ? [departureLatitude, departureLongitude] : [-25.7479, 28.2293]}
                                    zoom={10}
                                    className="w-full h-full z-0"
                                >
                                    <TileLayer 
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    />
                                    
                                    <AviationLayerController 
                                        departure={{ lat: departureLatitude, lng: departureLongitude }}
                                        legs={legs}
                                        arrival={{ lat: arrivalLatitude, lng: arrivalLongitude }}
                                        mapMode={mapMode}
                                        setMapMode={setMapMode}
                                        setDepartureLatitude={setDepartureLatitude}
                                        setDepartureLongitude={setDepartureLongitude}
                                        setDeparture={setDeparture}
                                        setArrivalLatitude={setArrivalLatitude}
                                        setArrivalLongitude={setArrivalLongitude}
                                        setArrival={setArrival}
                                        setLegs={setLegs}
                                        onClear={handleClearPlan}
                                        lookupICAO={fetchCoordinatesForIcao}
                                        recalculateLegs={recalculateLegs}
                                    />
                                    
                                    {departureLatitude !== undefined && departureLongitude !== undefined && (
                                        <Marker position={[departureLatitude, departureLongitude]} icon={createLabeledIcon('D', '#3b82f6')} />
                                    )}
                                    {legs.map((l, i) => (
                                        l.latitude !== undefined && l.longitude !== undefined && (
                                            <Marker 
                                                key={l.id} 
                                                position={[l.latitude, l.longitude]} 
                                                icon={createLabeledIcon((i + 1).toString(), '#ef4444')} 
                                            />
                                        )
                                    ))}
                                    {arrivalLatitude !== undefined && arrivalLongitude !== undefined && (
                                        <Marker position={[arrivalLatitude, arrivalLongitude]} icon={createLabeledIcon('A', '#10b981')} />
                                    )}
                                    <Polyline
                                        positions={[
                                            ...(departureLatitude !== undefined && departureLongitude !== undefined ? [[departureLatitude, departureLongitude] as [number, number]] : []),
                                            ...legs.filter(l => l.latitude !== undefined && l.longitude !== undefined).map(l => [l.latitude!, l.longitude!] as [number, number]),
                                            ...(arrivalLatitude !== undefined && arrivalLongitude !== undefined ? [[arrivalLatitude, arrivalLongitude] as [number, number]] : [])
                                        ]}
                                        color="#F59E0B"
                                        weight={3}
                                        opacity={0.8}
                                    />
                                </MapContainer>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                <div className="p-3 border-b bg-muted/10 grid grid-cols-1 gap-3 lg:grid-cols-6">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Navigation className="h-3 w-3" /> TAS (KT)</label>
                        <Input type="number" value={globalTas} onChange={(e) => setGlobalTas(Number(e.target.value))} className="h-8 w-full max-w-[140px] font-mono text-xs bg-slate-900/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Navigation className="h-3 w-3" /> Wind Dir (Â°T)</label>
                        <Input type="number" value={globalWindDir} onChange={(e) => setGlobalWindDir(Number(e.target.value))} className="h-8 w-full max-w-[140px] font-mono text-xs bg-slate-900/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Navigation className="h-3 w-3" /> Wind Spd (KT)</label>
                        <Input type="number" value={globalWindSpd} onChange={(e) => setGlobalWindSpd(Number(e.target.value))} className="h-8 w-full max-w-[140px] font-mono text-xs bg-slate-900/50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Navigation className="h-3 w-3" /> Mag Var (Â°) <span className="text-emerald-500 text-[8px] font-black">AUTO</span></label>
                        <div className="flex gap-1 items-center">
                            <Input
                                type="number"
                                value={globalVariation}
                                onChange={(e) => setGlobalVariation(Number(e.target.value))}
                                className="h-8 w-full max-w-[110px] font-mono text-xs bg-slate-900/50"
                                placeholder="fallback"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[8px] font-black uppercase px-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-black"
                                title="Auto-fill from departure coordinates"
                                onClick={() => {
                                    if (departureLatitude !== undefined && departureLongitude !== undefined) {
                                        setGlobalVariation(getMagneticVariation(departureLatitude, departureLongitude));
                                    }
                                }}
                                disabled={departureLatitude === undefined}
                            >
                                FILL
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1"><Droplets className="h-3 w-3 text-emerald-500" /> Fuel Burn</label>
                        <div className="flex flex-wrap gap-1 items-center">
                            <Input type="number" value={globalFuelBurn} onChange={(e) => setGlobalFuelBurn(Number(e.target.value))} className="h-8 w-full max-w-[110px] font-mono text-xs bg-slate-900/50" />
                            <Button variant="outline" size="sm" className="h-8 text-[8px] font-black uppercase px-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-black" onClick={() => setGlobalFuelBurnUnit(globalFuelBurnUnit === 'GPH' ? 'LPH' : 'GPH')}>{globalFuelBurnUnit}</Button>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase whitespace-nowrap">Endurance (hrs)</span>
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={fuelEnduranceHours ?? ''}
                                onChange={(e) => setFuelEnduranceHours(e.target.value ? Number(e.target.value) : undefined)}
                                className="h-8 w-full max-w-[90px] font-mono text-xs bg-slate-900/50"
                            />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                {fuelEnduranceHours !== undefined ? `Max flight ${formatDuration(fuelEnduranceHours * 60)}` : 'Set on aircraft'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Weather Briefing Panel */}
                <div className="border-b">
                    <div className="px-4 py-2 flex items-center justify-between bg-sky-950/30 border-b border-sky-500/10">
                        <div className="flex items-center gap-2">
                            <CloudLightning className="h-3.5 w-3.5 text-sky-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">Flight Briefing</span>
                            {Object.keys(briefingData).length > 0 && !briefingLoading && (
                                <Badge variant="outline" className="text-[8px] border-sky-500/30 text-sky-400 px-1.5 h-4">
                                    {Object.keys(briefingData).length} Stations
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {Object.keys(briefingData).length > 0 && (
                                <Button size="sm" variant="ghost" className="h-7 text-[9px] font-black uppercase text-muted-foreground hover:text-foreground" onClick={() => setBriefingExpanded(!briefingExpanded)}>
                                    {briefingExpanded ? 'Hide' : 'Show'}
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-[9px] font-black uppercase text-sky-400 hover:bg-sky-500/10" onClick={fetchBriefing} disabled={briefingLoading}>
                                {briefingLoading ? <Info className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
                                {briefingLoading ? 'Fetching...' : 'Fetch Briefing'}
                            </Button>
                        </div>
                    </div>
                    {briefingExpanded && Object.keys(briefingData).length > 0 && (
                        <div className="flex gap-3 overflow-x-auto p-3 bg-sky-950/10" style={{ scrollbarWidth: 'none' }}>
                            {Object.entries(briefingData).map(([icao, data]) => {
                                const cat = getFlightCategory(data.metar);
                                return (
                                    <div key={icao} className="min-w-[195px] max-w-[195px] bg-slate-900/70 border border-white/8 rounded-lg p-3 space-y-2 flex-shrink-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-black uppercase text-white tracking-wider">{icao}</span>
                                            {cat
                                                ? <Badge className={cn('text-[8px] px-1.5 py-0 h-4 font-black border', flightCatColor(cat))}>{cat}</Badge>
                                                : <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-white/10 text-white/30">NO DATA</Badge>
                                            }
                                        </div>
                                        {data.metar ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-white/70">
                                                    <Wind className="h-2.5 w-2.5 text-sky-400" />
                                                    {data.metar.wdir === 'VRB' ? 'VRB' : `${data.metar.wdir ?? '--'}Â°`} @ {data.metar.wspd ?? '--'}kt
                                                    {data.metar.wgst ? <span className="text-red-400"> G{data.metar.wgst}kt</span> : null}
                                                </div>
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-white/70">
                                                    <Eye className="h-2.5 w-2.5 text-amber-400" />
                                                    {data.metar.visib ?? '--'} SM
                                                </div>
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-white/70">
                                                    <Thermometer className="h-2.5 w-2.5 text-orange-400" />
                                                    {data.metar.temp != null ? `${data.metar.temp}Â°C` : '--'} / DP {data.metar.dewp != null ? `${data.metar.dewp}Â°C` : '--'}
                                                </div>
                                                {data.metar.altim && (
                                                    <div className="text-[9px] font-bold text-white/50">QNH {data.metar.altim.toFixed(0)} hPa</div>
                                                )}
                                                <p className="text-[8px] font-mono text-white/25 break-all leading-relaxed pt-1 border-t border-white/5">
                                                    {(data.metar.rawOb ?? '').substring(0, 90)}{(data.metar.rawOb?.length ?? 0) > 90 ? 'â€¦' : ''}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-[9px] text-white/30 font-bold">No METAR available</p>
                                        )}
                                        {data.taf && (
                                            <div className="pt-1.5 border-t border-white/5">
                                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-wider">TAF Â· {data.taf.fcsts?.length ?? 0} periods</span>
                                                {data.taf.fcsts?.[0] && (
                                                    <p className="text-[8px] text-white/30 font-mono mt-0.5">
                                                        {(data.taf.rawTAF ?? '').substring(0, 60)}â€¦
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                                    <TableCell className="px-3 text-center text-[10px] font-black text-primary whitespace-nowrap">{Math.round(leg.trueCourse || 0)}Â°</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-black text-white bg-slate-900/30 whitespace-nowrap">{Math.round(leg.magneticHeading || 0).toString().padStart(3, '0')}Â°</TableCell>
                                    <TableCell className="px-3 text-center text-[11px] font-black text-amber-500 whitespace-nowrap">{leg.distance?.toFixed(1)} NM</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-bold text-primary whitespace-nowrap">{Math.round(leg.groundSpeed || 0)}</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-bold text-primary font-mono whitespace-nowrap">{formatEte(leg.ete || 0)}</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-bold text-emerald-500 font-mono whitespace-nowrap">{leg.tripFuel ? `${leg.tripFuel.toFixed(1)}` : 'â€”'}</TableCell>
                                    <TableCell className="px-3 text-center text-[10px] font-black text-white bg-slate-900/50 font-mono whitespace-nowrap">{formatEte(leg.cumulativeEte || 0)}</TableCell>
                                    {!isReadOnly && (
                                        <TableCell>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {leg.id !== 'terminal-leg' && (
                                                    <>
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-5 w-5 hover:text-primary hover:bg-primary/10"
                                                            onClick={() => handleMoveLeg(leg.id, 'up')}
                                                            disabled={legs.findIndex(l => l.id === leg.id) === 0}
                                                            title="Move Up"
                                                        >
                                                            <ChevronUp className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-5 w-5 hover:text-primary hover:bg-primary/10"
                                                            onClick={() => handleMoveLeg(leg.id, 'down')}
                                                            disabled={legs.findIndex(l => l.id === leg.id) === legs.length - 1}
                                                            title="Move Down"
                                                        >
                                                            <ChevronDown className="h-3 w-3" />
                                                        </Button>
                                                    </>
                                                )}
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
                        {computedLegs.length > 0 && (() => {
                            const totalDist = computedLegs.reduce((s, l) => s + (l.distance || 0), 0);
                            const totalEte = computedLegs[computedLegs.length - 1]?.cumulativeEte || 0;
                            const totalFuel = computedLegs.reduce((s, l) => s + (l.tripFuel || 0), 0);
                            return (
                                <tfoot>
                                    <tr className="border-t-2 border-primary/20 bg-muted/30">
                                        <td colSpan={6} className="text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground py-2 px-3 whitespace-nowrap">Route Totals</td>
                                        <td className="text-center text-[10px] font-black text-primary py-2 px-3 whitespace-nowrap">â€”</td>
                                        <td className="text-center text-[10px] font-black text-white bg-slate-900/30 py-2 px-3 whitespace-nowrap">â€”</td>
                                        <td className="text-center text-[11px] font-black text-amber-500 py-2 px-3 whitespace-nowrap">{totalDist.toFixed(1)} NM</td>
                                        <td className="text-center text-[10px] font-bold text-primary py-2 px-3 whitespace-nowrap">â€”</td>
                                        <td className="text-center text-[10px] font-black text-primary font-mono py-2 px-3 whitespace-nowrap">{formatEte(totalEte)}</td>
                                        <td className="text-center text-[10px] font-black text-emerald-500 font-mono py-2 px-3 whitespace-nowrap">{globalFuelBurn > 0 ? `${totalFuel.toFixed(1)} ${globalFuelBurnUnit}` : 'â€”'}</td>
                                        <td className="text-center text-[10px] font-black text-white bg-slate-900/50 font-mono py-2 px-3 whitespace-nowrap">{formatEte(totalEte)}</td>
                                        {!isReadOnly && <td />}
                                    </tr>
                                </tfoot>
                            );
                        })()}
                    </Table>
                    </div>
                </div>
                {computedLegs.length > 0 && globalFuelBurn > 0 && (() => {
                    const tripFuelTotal = computedLegs.reduce((s, l) => s + (l.tripFuel || 0), 0);
                    const reserve45 = parseFloat(((globalFuelBurn / 60) * 45).toFixed(1));
                    const blockFuel = parseFloat((tripFuelTotal + reserve45).toFixed(1));
                    const plannedFlightMinutes = computedLegs[computedLegs.length - 1]?.cumulativeEte || 0;
                    const enduranceMinutes = fuelEnduranceHours !== undefined ? fuelEnduranceHours * 60 : 0;
                    const remainingMinutes = fuelEnduranceHours !== undefined ? enduranceMinutes - plannedFlightMinutes : undefined;
                    return (
                        <div className="px-4 py-2 border-t bg-emerald-950/20 border-emerald-500/10 flex flex-wrap gap-x-6 gap-y-1 items-center">
                            <span className="text-[9px] font-black uppercase text-emerald-500/60 tracking-wider flex items-center gap-1"><Droplets className="h-3 w-3" /> Fuel Summary</span>
                            <span className="text-[10px] font-black text-emerald-400">Trip: {tripFuelTotal.toFixed(1)} {globalFuelBurnUnit}</span>
                            <span className="text-[10px] font-black text-amber-400">45min Reserve: {reserve45.toFixed(1)} {globalFuelBurnUnit}</span>
                            <span className="text-[10px] font-black text-white border-l border-white/20 pl-4">Block Required: <span className="text-emerald-300">{blockFuel.toFixed(1)} {globalFuelBurnUnit}</span></span>
                            <span className={cn(
                                "text-[10px] font-black border-l border-white/20 pl-4",
                                remainingMinutes === undefined ? "text-muted-foreground" : remainingMinutes >= 0 ? "text-sky-300" : "text-red-400"
                            )}>
                                Endurance: {fuelEnduranceHours !== undefined ? `${formatDuration(enduranceMinutes)} ${remainingMinutes !== undefined && remainingMinutes >= 0 ? `(res ${formatDuration(remainingMinutes)})` : remainingMinutes !== undefined ? `(short ${formatDuration(Math.abs(remainingMinutes))})` : ''}` : 'N/A'}
                            </span>
                        </div>
                    );
                })()}
                {!isReadOnly && (
                    <div className="mt-auto p-3 border-t bg-muted/5 flex justify-between items-center shrink-0">
                        <Button variant="outline" size="sm" onClick={handleAddLeg} className="gap-2 h-8 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary">
                            <Plus className="h-4 w-4" /> Add Manual Waypoint
                        </Button>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Pro Tip: Use the map planner for visual legs</p>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

/**
 * AviationLayerController
 * Handles the tactical map overlays and mission framing.
 */
function AviationLayerController({ 
    departure, legs, arrival, mapMode, setMapMode, 
    setDepartureLatitude, setDepartureLongitude, setDeparture,
    setArrivalLatitude, setArrivalLongitude, setArrival, 
    setLegs, onClear, lookupICAO, recalculateLegs 
}: { 
    departure: { lat?: number, lng?: number }, 
    legs: NavlogLeg[], 
    arrival: { lat?: number, lng?: number },
    mapMode: 'waypoint' | 'departure' | 'arrival',
    setMapMode: (mode: 'waypoint' | 'departure' | 'arrival') => void,
    setDepartureLatitude: (lat: number) => void,
    setDepartureLongitude: (lng: number) => void,
    setDeparture: (icao: string) => void,
    setArrivalLatitude: (lat: number) => void,
    setArrivalLongitude: (lng: number) => void,
    setArrival: (icao: string) => void,
    setLegs: (legs: NavlogLeg[]) => void,
    onClear: () => void,
    lookupICAO: (icao: string) => Promise<{ lat: number, lon: number }>,
    recalculateLegs: (legs: NavlogLeg[]) => NavlogLeg[]
}) {
    const map = useMap();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [showAero, setShowAero] = useState(true);
    const [showAirspaces, setShowAirspaces] = useState(true);
    const [showObstacles, setShowObstacles] = useState(false);
    const [showAirports, setShowAirports] = useState(true);
    const [airspacesGeoJson, setAirspacesGeoJson] = useState<any>({ type: 'FeatureCollection', features: [] });
    const [obstaclesGeoJson, setObstaclesGeoJson] = useState<any>({ type: 'FeatureCollection', features: [] });
    const [nearbyAirports, setNearbyAirports] = useState<any[]>([]);

    useEffect(() => {
        const toFeatureCollection = (items: any[]) => ({
            type: 'FeatureCollection',
            features: (items || [])
                .filter((item: any) => item?.geometry)
                .map((item: any) => ({
                    type: 'Feature',
                    geometry: item.geometry,
                    properties: item,
                })),
        });

        const computeDistanceMeters = (zoom: number) => {
            if (zoom >= 13) return 20000;
            if (zoom >= 11) return 45000;
            if (zoom >= 9) return 80000;
            return 120000;
        };

        const loadMapIntel = async () => {
            const center = map.getCenter();
            const dist = computeDistanceMeters(map.getZoom());
            const pos = `${center.lat},${center.lng}`;

            try {
                const [airspacesRes, obstaclesRes, airportsRes] = await Promise.all([
                    fetch(`/api/openaip?resource=airspaces&pos=${pos}&dist=${dist}&limit=120`),
                    fetch(`/api/openaip?resource=obstacles&pos=${pos}&dist=${dist}&limit=180`),
                    fetch(`/api/openaip?resource=airports&pos=${pos}&dist=${dist}&limit=60`),
                ]);

                const [airspacesData, obstaclesData, airportsData] = await Promise.all([
                    airspacesRes.ok ? airspacesRes.json() : { items: [] },
                    obstaclesRes.ok ? obstaclesRes.json() : { items: [] },
                    airportsRes.ok ? airportsRes.json() : { items: [] },
                ]);

                setAirspacesGeoJson(toFeatureCollection(airspacesData.items || []));
                setObstaclesGeoJson(toFeatureCollection(obstaclesData.items || []));
                setNearbyAirports(airportsData.items || []);
            } catch (error) {
                console.warn('Failed loading OpenAIP map layers', error);
            }
        };

        void loadMapIntel();
        const onMoveEnd = () => { void loadMapIntel(); };
        map.on('moveend', onMoveEnd);
        return () => {
            map.off('moveend', onMoveEnd);
        };
    }, [map]);

    useMapEvents({
        click: async (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            if (!lat || !lng) return;

            try {
                // Search within 15km
                const openAipRes = await fetch(`/api/openaip?resource=airports&pos=${lat},${lng}&dist=15000&limit=1`);
                const openAipData = await openAipRes.json();
                const nearest = openAipData.items?.[0];

                let name = `FIX ${legs.length + 1}`;
                let freq = '---';

                if (nearest) {
                    name = nearest.icaoCode || nearest.name.toUpperCase();
                    if (nearest.frequencies && nearest.frequencies.length > 0) {
                        const primary = nearest.frequencies.find((f: any) => ['TOWER', 'CTAF', 'INFO'].includes(f.type)) || nearest.frequencies[0];
                        freq = `${primary.value} ${primary.unit || 'MHz'}`;
                    }
                }

                if (mapMode === 'departure') {
                    setDepartureLatitude(lat);
                    setDepartureLongitude(lng);
                    setDeparture(name.substring(0, 10));
                    toast({ title: "Departure Set", description: `Mission start at ${name}.` });
                    setMapMode('waypoint');
                } else if (mapMode === 'arrival') {
                    setArrivalLatitude(lat);
                    setArrivalLongitude(lng);
                    setArrival(name.substring(0, 10));
                    toast({ title: "Arrival Set", description: `Mission end at ${name}.` });
                    setMapMode('waypoint');
                } else {
                    setLegs(recalculateLegs([...legs, { 
                        id: uuidv4(), 
                        waypoint: name.substring(0, 20), 
                        latitude: lat, 
                        longitude: lng, 
                        frequencies: freq !== '---' ? freq : '',
                    }]));
                }
            } catch (err) {
                console.error("Map intelligence error", err);
            }
        }
    });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery || !map) return;
        setSearching(true);
        try {
            const [airportsRes, navaidsRes, repPointsRes] = await Promise.all([
                fetch(`/api/openaip?resource=airports&search=${encodeURIComponent(searchQuery)}&limit=3`),
                fetch(`/api/openaip?resource=navaids&search=${encodeURIComponent(searchQuery)}&limit=3`),
                fetch(`/api/openaip?resource=reporting-points&search=${encodeURIComponent(searchQuery)}&limit=3`)
            ]);

            const [airports, navaids, repPoints] = await Promise.all([
                airportsRes.ok ? airportsRes.json() : { items: [] },
                navaidsRes.ok ? navaidsRes.json() : { items: [] },
                repPointsRes.ok ? repPointsRes.json() : { items: [] }
            ]);

            const results = [
                ...(airports.items?.map((item: any) => ({ ...item, pointType: 'AIRPORT', displayId: item.icaoCode || item.name })) || []),
                ...(navaids.items?.map((item: any) => ({ ...item, pointType: 'NAVAID', displayId: item.name || item.id })) || []),
                ...(repPoints.items?.map((item: any) => ({ ...item, pointType: 'REP. POINT', displayId: item.name || item.id })) || [])
            ];
            
            if (results.length === 0) {
                 toast({ title: "Radar Search Failed", description: "No matches found in aviation database.", variant: "destructive" });
                 setShowResults(false);
            } else {
                 setSearchResults(results);
                 setShowResults(true);
            }
        } catch (err: any) {
            toast({ title: "Radar Search Failed", description: err.message, variant: "destructive" });
        } finally {
            setSearching(false);
        }
    };

    const handleSelectResult = (item: any) => {
        const coords = item.geometry?.coordinates; 
        if (coords) {
            map.flyTo([coords[1], coords[0]], 12);
            toast({ title: "Radar Lock", description: `Centering on ${item.displayId}.` });
        }
        setShowResults(false);
        setSearchQuery('');
    };

    const fitRoute = () => {
        if (!map) return;
        const coords: L.LatLngTuple[] = [];
        if (departure.lat !== undefined && departure.lng !== undefined) coords.push([departure.lat, departure.lng]);
        legs.forEach(l => { if (l.latitude !== undefined && l.longitude !== undefined) coords.push([l.latitude, l.longitude]); });
        if (arrival.lat !== undefined && arrival.lng !== undefined) coords.push([arrival.lat, arrival.lng]);

        if (coords.length > 0) {
            const bounds = L.latLngBounds(coords);
            map.fitBounds(bounds, { padding: [50, 50] });
            toast({ title: "Fit Route", description: "Mission overview centered." });
        }
    };

    return (
        <>
            {showAero && (
                <TileLayer
                    url="https://{s}.api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=1cbf7bdd18e52e7fa977c6d106847397"
                    subdomains={['a', 'b', 'c']}
                    maxZoom={14}
                    opacity={0.9}
                    zIndex={10}
                />
            )}
            {showAirspaces && airspacesGeoJson.features.length > 0 && (
                <GeoJSON
                    data={airspacesGeoJson}
                    interactive={false}
                    style={(feature: any) => {
                        const clazz = String(feature?.properties?.type || feature?.properties?.classification || '').toUpperCase();
                        const color =
                            clazz.includes('CTR') ? '#f59e0b' :
                            clazz.includes('TMA') ? '#38bdf8' :
                            clazz.includes('RESTRICTED') ? '#ef4444' :
                            clazz.includes('DANGER') ? '#dc2626' :
                            clazz.includes('PROHIBITED') ? '#b91c1c' :
                            '#a78bfa';
                        return { color, weight: 1.2, opacity: 0.9, fillOpacity: 0.08 };
                    }}
                />
            )}
            {showObstacles && obstaclesGeoJson.features.length > 0 && (
                <GeoJSON
                    data={obstaclesGeoJson}
                    interactive={false}
                    pointToLayer={(_feature: any, latlng: any) => L.circleMarker(latlng, {
                        radius: 4,
                        color: '#f97316',
                        weight: 1.2,
                        fillColor: '#fb923c',
                        fillOpacity: 0.8,
                    })}
                />
            )}
            {showAirports && nearbyAirports.map((airport: any) => {
                const coords = airport?.geometry?.coordinates;
                if (!Array.isArray(coords) || coords.length < 2) return null;
                const lon = Number(coords[0]);
                const lat = Number(coords[1]);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                const ident = airport.icaoCode || airport.iataCode || airport.name || 'Airport';
                return (
                    <CircleMarker
                        key={airport._id || `${ident}-${lat}-${lon}`}
                        center={[lat, lon]}
                        radius={4}
                        interactive={false}
                        pathOptions={{ color: '#22d3ee', weight: 1.5, fillColor: '#0891b2', fillOpacity: 0.7 }}
                    />
                );
            })}

            <div 
                className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[300px]"
                ref={(ref) => { if (ref) { L.DomEvent.disableClickPropagation(ref); L.DomEvent.disableScrollPropagation(ref); } }}
            >
                <form onSubmit={handleSearch} className="relative group">
                    <Input 
                        placeholder="Search Airports, Navaids, Fixes..." 
                        className="bg-slate-950/80 border-white/20 text-white pl-9 h-10 rounded-xl backdrop-blur-md focus:bg-slate-900 transition-all shadow-2xl"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowResults(false);
                        }}
                    />
                    <Radio className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-pulse", searching && "text-amber-500")} />
                    <Button type="submit" size="sm" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 text-white/50 hover:text-white h-8">
                        GO
                    </Button>
                </form>

                {showResults && searchResults.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-slate-950/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col max-h-[300px] overflow-y-auto">
                        <div className="p-2 border-b border-white/10 bg-black/40 text-[10px] font-black uppercase text-white/50 tracking-widest">
                            Radar Matches
                        </div>
                        {searchResults.map((item, idx) => (
                            <button
                                key={idx}
                                className="w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/10 transition-colors flex justify-between items-center group"
                                onClick={() => handleSelectResult(item)}
                            >
                                <span className="text-xs font-bold text-white group-hover:text-amber-500 transition-colors">{item.displayId}</span>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-white/60">{item.pointType}</Badge>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div 
                className="absolute top-4 left-4 z-[1000] flex flex-col gap-2"
                ref={(ref) => { if (ref) { L.DomEvent.disableClickPropagation(ref); L.DomEvent.disableScrollPropagation(ref); } }}
            >
                <div className="bg-slate-950/90 border border-white/10 backdrop-blur-xl p-1 rounded-lg shadow-2xl flex flex-col gap-1">
                    <Button 
                        size="sm" 
                        variant={mapMode === 'departure' ? 'default' : 'ghost'} 
                        className={cn("h-8 gap-2 text-[9px] font-black uppercase justify-start px-3", mapMode === 'departure' ? "bg-amber-500 text-black hover:bg-amber-600" : "text-white hover:bg-white/5")} 
                        onClick={() => setMapMode('departure')}
                    >
                        <MapPin className="h-3 w-3" /> Set Departure
                    </Button>
                    <Button 
                        size="sm" 
                        variant={mapMode === 'waypoint' ? 'default' : 'ghost'} 
                        className={cn("h-8 gap-2 text-[9px] font-black uppercase justify-start px-3", mapMode === 'waypoint' ? "bg-primary text-white" : "text-white hover:bg-white/5")} 
                        onClick={() => setMapMode('waypoint')}
                    >
                        <Plus className="h-3 w-3" /> Add Waypoint
                    </Button>
                    <Button 
                        size="sm" 
                        variant={mapMode === 'arrival' ? 'default' : 'ghost'} 
                        className={cn("h-8 gap-2 text-[9px] font-black uppercase justify-start px-3", mapMode === 'arrival' ? "bg-amber-500 text-black hover:bg-amber-600" : "text-white hover:bg-white/5")} 
                        onClick={() => {
                            if (legs.length > 0) {
                                const last = legs[legs.length - 1];
                                if (last.latitude && last.longitude) {
                                    setArrivalLatitude(last.latitude);
                                    setArrivalLongitude(last.longitude);
                                    setArrival(last.waypoint.substring(0, 4));
                                    setLegs(legs.slice(0, -1)); 
                                    toast({ title: "Waypoint Promoted", description: `${last.waypoint} is now your arrival destination.` });
                                }
                            }
                            setMapMode('arrival');
                        }}
                    >
                        <MapPin className="h-3 w-3" /> Set Arrival
                    </Button>
                </div>
                <p className="text-[8px] font-bold text-white/30 uppercase pl-1">Targeting: <span className="text-amber-500">{mapMode}</span></p>
            </div>

            <div 
                className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end"
                ref={(ref) => { if (ref) { L.DomEvent.disableClickPropagation(ref); L.DomEvent.disableScrollPropagation(ref); } }}
            >
                <div className="bg-slate-950/90 border border-white/10 backdrop-blur-xl p-1 rounded-lg shadow-2xl flex flex-col gap-1 mb-2">
                    <p className="text-[7px] font-black text-white/30 uppercase px-2 py-1">Tactical Map Layers</p>
                    <div className="h-[1px] bg-white/5 w-full my-1" />
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className={cn("h-7 gap-2 text-[8px] font-black uppercase justify-start px-3", showAero ? "text-amber-500 bg-amber-500/10" : "text-white/40")} 
                        onClick={() => setShowAero(!showAero)}
                    >
                        {showAero ? 'Aero Chart: ON' : 'Aero Chart: OFF'}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-7 gap-2 text-[8px] font-black uppercase justify-start px-3", showAirspaces ? "text-violet-300 bg-violet-500/10" : "text-white/40")}
                        onClick={() => setShowAirspaces(!showAirspaces)}
                    >
                        {showAirspaces ? 'Airspaces: ON' : 'Airspaces: OFF'}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-7 gap-2 text-[8px] font-black uppercase justify-start px-3", showObstacles ? "text-orange-300 bg-orange-500/10" : "text-white/40")}
                        onClick={() => setShowObstacles(!showObstacles)}
                    >
                        {showObstacles ? 'Obstacles: ON' : 'Obstacles: OFF'}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-7 gap-2 text-[8px] font-black uppercase justify-start px-3", showAirports ? "text-cyan-300 bg-cyan-500/10" : "text-white/40")}
                        onClick={() => setShowAirports(!showAirports)}
                    >
                        {showAirports ? 'Airports: ON' : 'Airports: OFF'}
                    </Button>
                </div>

                <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-primary hover:bg-primary/90 border-none text-white text-[10px] font-black uppercase tracking-widest shadow-xl px-6 h-9 transition-all hover:scale-105" 
                    onClick={fitRoute}
                >
                    <Navigation className="h-3 w-3 mr-2 rotate-45" />
                    Center Mission Path
                </Button>
                <Button 
                    size="sm" 
                    variant="destructive" 
                    className="bg-red-600 hover:bg-red-700 border-none text-white text-[10px] font-black uppercase tracking-widest shadow-xl px-6 h-9 transition-all hover:scale-105" 
                    onClick={onClear}
                >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Clear Flight Plan
                </Button>
                <Badge variant="outline" className="bg-slate-900 border-amber-500/50 text-amber-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 mt-1">VFR Aeronautical Layer Active</Badge>
            </div>
        </>
    );
}


