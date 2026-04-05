'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking, NavlogLeg, Navlog, PreFlightData, PostFlightData } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle, Loader2, RotateCcw, Trash2, FileText, Settings2, Scale, Map as NavIcon, Wind, Eye, Radio, Activity, CheckCircle2, AlertOctagon, Droplet, Thermometer, Clock, ListFilter, ChevronRight, MapPinned } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { NavlogBuilder } from '../../navlog-builder';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { BookingDetailHeader } from '@/components/booking-detail-header';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { createNavlogLegFromCoordinates } from '@/lib/flight-planner';

// Dynamic import for Leaflet to avoid SSR issues
const AeronauticalMap = dynamic(
  () => import('@/components/flight-planner/aeronautical-map'),
  { 
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto" />
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">Initializing Chart Engine...</p>
            </div>
        </div>
    )
  }
);

const FUEL_WEIGHT_PER_GALLON = 6;
const DEFAULT_GRAPH_CONFIG = {
    xMin: 80,
    xMax: 94,
    yMin: 1295,
    yMax: 2600,
    envelope: [
        { x: 82, y: 1400 },
        { x: 82, y: 1950 },
        { x: 86.5, y: 2450 },
        { x: 93, y: 2450 },
        { x: 93, y: 1400 },
        { x: 82, y: 1400 },
    ] as { x: number; y: number }[],
};
const DEFAULT_BASIC_EMPTY = { weight: 1416, moment: 120360, arm: 85 };
const DEFAULT_STATIONS = [
    { id: 2, name: 'Pilot & Front Pax', weight: 340, arm: 85.5, type: 'standard' },
    { id: 3, name: 'Fuel', weight: 288, arm: 95, type: 'fuel', gallons: 48, maxGallons: 50 },
    { id: 4, name: 'Rear Pax', weight: 0, arm: 118.1, type: 'standard' },
    { id: 5, name: 'Baggage', weight: 0, arm: 142.8, type: 'standard' },
];

interface ViewBookingDetailsProps {
    booking: Booking;
}

const DetailItem = ({ label, value, children }: { label: string, value?: string | undefined | null, children?: React.ReactNode }) => (
    <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        {children ? children : <p className="text-sm font-semibold">{value || 'N/A'}</p>}
    </div>
);

const formatDateSafe = (dateString: string | undefined, formatString: string): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return format(date, formatString);
    } catch (e) {
        return 'Invalid Date';
    }
};

function stripUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => stripUndefinedDeep(item)).filter((item) => item !== undefined) as T;
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, any>)
                .filter(([, nested]) => nested !== undefined)
                .map(([key, nested]) => [key, stripUndefinedDeep(nested)])
        ) as T;
    }

    return value;
}

const WeatherCard = ({ icao, title, onHide }: { icao?: string, title: string, onHide: () => void }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWeather = useCallback(async () => {
        if (!icao || icao.length < 3) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/weather?ids=${icao}`);
            if (!res.ok) throw new Error('Fetch failed');
            const weather = await res.json();
            setData(weather);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [icao]);

    useEffect(() => {
        fetchWeather();
    }, [fetchWeather]);

    return (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
                <div className="flex items-center gap-2">
                    {icao && <Badge variant="outline" className="text-[9px] font-black uppercase">{icao}</Badge>}
                    <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase" onClick={onHide}>Hide</Button>
                </div>
            </div>
            
            {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-bold uppercase">Fetching METAR/TAF...</span>
                </div>
            ) : error ? (
                <div className="space-y-2 py-2">
                    <p className="text-xs text-destructive font-bold">{error}</p>
                    <Button variant="ghost" className="h-8 p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={fetchWeather}>Retry</Button>
                </div>
            ) : data ? (
                <div className="space-y-4">
                    {/* METAR SECTION */}
                    {data.metar && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600">
                                <Activity className="h-3 w-3" /> METAR
                            </div>
                            <p className="text-xs font-mono font-bold leading-tight bg-background/50 p-2 rounded border border-border/50">
                                {data.metar.rawOb || data.metar.raw}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                                <div className="flex items-center gap-2">
                                    <Wind className="h-3 w-3 text-sky-500" />
                                    <span className="text-[10px] font-black uppercase">{data.metar.wspd || 0}KT @ {data.metar.wdir || '0'}°</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Eye className="h-3 w-3 text-sky-500" />
                                    <span className="text-[10px] font-black uppercase">{data.metar.visib || 'N/A'} SM</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Thermometer className="h-3 w-3 text-sky-500" />
                                    <span className="text-[10px] font-black uppercase">{data.metar.temp}°C / {data.metar.dewp}°C</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAF SECTION */}
                    {data.taf && (
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600">
                                <Clock className="h-3 w-3" /> TAF
                            </div>
                            <p className="text-xs font-mono font-medium leading-relaxed whitespace-pre-line opacity-80">
                                {data.taf.rawTAF || data.taf.raw}
                            </p>
                        </div>
                    )}

                    {!data.metar && !data.taf && <p className="text-xs italic text-muted-foreground">No reports available for this station.</p>}
                    
                    <Button variant="ghost" className="h-8 w-full mt-2 text-[9px] font-black uppercase border border-dashed hover:bg-background/50" onClick={fetchWeather}>Refresh Weather</Button>
                </div>
            ) : (
                <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground font-bold italic mb-4">No weather briefing loaded yet.</p>
                    <Button variant="outline" className="h-8 text-[10px] font-black uppercase" onClick={fetchWeather}>Fetch Weather</Button>
                </div>
            )}
        </div>
    );
};

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const { tenantId } = useUserProfile();
    const [activeTab, setActiveTab] = useState('flight-details');
    const [isSaving, setIsSaving] = useState(false);
    const [showRouteSummary, setShowRouteSummary] = useState(!isMobile);
    const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
    const [personnel, setPersonnel] = useState<any[]>([]);
    const [loadingAc, setLoadingAc] = useState(true);
    const [loadingPeople, setLoadingPeople] = useState(true);

    const aircraft = useMemo(() => aircrafts?.find(a => a.id === booking.aircraftId), [aircrafts, booking.aircraftId]);
    const instructorLabel = useMemo(() => {
        if (!booking.instructorId) return 'N/A';
        const instructor = personnel.find((person) => person.id === booking.instructorId);
        return instructor ? `${instructor.firstName} ${instructor.lastName}` : booking.instructorId;
    }, [personnel, booking.instructorId]);

    const studentLabel = useMemo(() => {
        if (!booking.studentId) return 'N/A';
        const student = personnel.find((person) => person.id === booking.studentId);
        return student ? `${student.firstName} ${student.lastName}` : booking.studentId;
    }, [personnel, booking.studentId]);
    const [graphConfig, setGraphConfig] = useState(DEFAULT_GRAPH_CONFIG);
    const [basicEmpty, setBasicEmpty] = useState(DEFAULT_BASIC_EMPTY);
    const [stations, setStations] = useState<any[]>(DEFAULT_STATIONS);
    const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            if (!tenantId) {
                setLoadingAc(false);
                setLoadingPeople(false);
                return;
            }

            try {
                const [aircraftRes, usersRes] = await Promise.all([
                    fetch(`/api/aircraft/${booking.aircraftId}`),
                    fetch('/api/users'),
                ]);

                if (!aircraftRes.ok) throw new Error('Failed to load aircraft data.');
                if (!usersRes.ok) throw new Error('Failed to load personnel data.');

                const aircraftData = await aircraftRes.json();
                const peopleData = await usersRes.json();

                if (!cancelled) {
                    setAircrafts(aircraftData?.aircraft ? [aircraftData.aircraft] : []);
                    setPersonnel(peopleData.users || peopleData.personnel || []);
                }
            } catch {
                if (!cancelled) {
                    setAircrafts([]);
                    setPersonnel([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingAc(false);
                    setLoadingPeople(false);
                }
            }
        };

        loadData();
        return () => {
            cancelled = true;
        };
    }, [tenantId]);

    // Planning state
    const [plannedLegs, setPlannedLegs] = useState<NavlogLeg[]>(booking.navlog?.legs || []);
    const [depIcao, setDepIcao] = useState(booking.navlog?.departureIcao || '');
    const [arrIcao, setArrIcao] = useState(booking.navlog?.arrivalIcao || '');
    const [depLat, setDepLat] = useState(booking.navlog?.departureLatitude?.toString() || '');
    const [depLon, setDepLon] = useState(booking.navlog?.departureLongitude?.toString() || '');
    const [arrLat, setArrLat] = useState(booking.navlog?.arrivalLatitude?.toString() || '');
    const [arrLon, setArrLon] = useState(booking.navlog?.arrivalLongitude?.toString() || '');
    const [showDepWeather, setShowDepWeather] = useState(true);
    const [showArrWeather, setShowArrWeather] = useState(true);
    const [isLookingUpDep, setIsLookingUpDep] = useState(false);
    const [isLookingUpArr, setIsLookingUpArr] = useState(false);

    // Operations state
    const [preFlight, setPreFlight] = useState<PreFlightData>(booking.preFlightData || { hobbs: 0, tacho: 0, fuelUpliftGallons: 0, fuelUpliftLitres: 0, oilUplift: 0, documentsChecked: false });
    const [postFlight, setPostFlight] = useState<PostFlightData>(booking.postFlightData || { hobbs: 0, tacho: 0, fuelUpliftGallons: 0, fuelUpliftLitres: 0, oilUplift: 0, defects: '' });

    useEffect(() => {
        if (aircraft) {
        if (aircraft?.cgEnvelope?.length) {
            const envelope = aircraft.cgEnvelope.map((point) => ({ x: point.cg, y: point.weight }));
            setGraphConfig({
                xMin: Math.min(...envelope.map((point) => point.x)) - 2,
                xMax: Math.max(...envelope.map((point) => point.x)) + 2,
                yMin: Math.min(...envelope.map((point) => point.y)) - 200,
                yMax: Math.max(...envelope.map((point) => point.y)) + 200,
                envelope,
            });
        } else {
            setGraphConfig(DEFAULT_GRAPH_CONFIG);
        }

        const arm = aircraft?.emptyWeight && aircraft.emptyWeight > 0
            ? (aircraft.emptyWeightMoment || 0) / aircraft.emptyWeight
            : DEFAULT_BASIC_EMPTY.arm;
        setBasicEmpty({
            weight: aircraft?.emptyWeight && aircraft.emptyWeight > 0 ? aircraft.emptyWeight : DEFAULT_BASIC_EMPTY.weight,
            moment: aircraft?.emptyWeight && aircraft.emptyWeight > 0 ? (aircraft.emptyWeightMoment || 0) : DEFAULT_BASIC_EMPTY.moment,
            arm: parseFloat(arm.toFixed(2)),
        });

        if (booking.massAndBalance?.stations && booking.massAndBalance.stations.length > 0) {
            setStations(booking.massAndBalance.stations);
        } else if (aircraft?.stations && aircraft.stations.length > 0) {
            setStations(aircraft.stations);
        } else {
            setStations(DEFAULT_STATIONS);
        }
        }
    }, [aircraft, booking.massAndBalance?.stations]);

    useEffect(() => {
        let totalMom = parseFloat(String(basicEmpty.moment)) || 0;
        let totalWt = parseFloat(String(basicEmpty.weight)) || 0;
        stations.forEach(st => {
            const wt = parseFloat(String(st.weight)) || 0;
            const arm = parseFloat(String(st.arm)) || 0;
            totalWt += wt;
            totalMom += (wt * arm);
        });
        const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
        const roundedCg = parseFloat(cg.toFixed(2));
        const roundedWeight = parseFloat(totalWt.toFixed(1));
        const safe = graphConfig.envelope.length > 2
            ? isPointInPolygon({ x: roundedCg, y: roundedWeight }, graphConfig.envelope)
            : false;
        setResults({ cg: roundedCg, weight: roundedWeight, isSafe: safe });
    }, [stations, basicEmpty, graphConfig.envelope]);

    const handleStationWeightChange = (id: number, weight: string) => {
        const val = parseFloat(weight) || 0;
        setStations(prev => prev.map(s => {
            if (s.id !== id) return s;
            if (s.type === 'fuel') {
                return { ...s, weight: val, gallons: parseFloat((val / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
            }
            return { ...s, weight: val };
        }));
    };

    const handleGallonsChange = (id: number, gallons: string) => {
        const val = parseFloat(gallons) || 0;
        setStations(prev => prev.map(s => {
            if (s.id !== id || s.type !== 'fuel') return s;
            return { ...s, gallons: val, weight: parseFloat((val * FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
        }));
    };

    // ── Fuel sync between M&B and NavLog ──
    const fuelStation = useMemo(() => stations.find(s => s.type === 'fuel'), [stations]);
    const fuelWeightLbs = fuelStation ? (parseFloat(String(fuelStation.weight)) || 0) : undefined;

    const handleNavlogFuelSync = useCallback((weightLbs: number) => {
        setStations(prev => prev.map(s => {
            if (s.type !== 'fuel') return s;
            return { ...s, weight: weightLbs, gallons: parseFloat((weightLbs / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
        }));
    }, []);

    const handleSaveToBooking = async () => {
        setIsSaving(true);
        try {
            const sanitizedMassAndBalance = stripUndefinedDeep({
                takeoffWeight: results.weight,
                takeoffCg: results.cg,
                isWithinLimits: results.isSafe,
                stations
            });
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        massAndBalance: sanitizedMassAndBalance,
                        preFlightData: stripUndefinedDeep(preFlight),
                        postFlightData: stripUndefinedDeep(postFlight),
                        preFlight: true,
                        postFlight: postFlight.hobbs > 0,
                    },
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Save failed.');
            }
            toast({ title: 'M&B and Ops Data Saved' });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Save Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddWaypoint = (lat: number, lon: number, identifier: string = 'WP', frequencies?: string, layerInfo?: string) => {
        setPlannedLegs(current => [...current, createNavlogLegFromCoordinates(current, lat, lon, identifier, frequencies, layerInfo)]);
    };

    const handleCommitRoute = async () => {
        setIsSaving(true);
        try {
            const sanitizedLegs = stripUndefinedDeep(plannedLegs);
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        navlog: {
                            ...(booking.navlog || {}),
                            legs: sanitizedLegs,
                            departureIcao: depIcao,
                            arrivalIcao: arrIcao,
                            departureLatitude: depLat ? parseFloat(depLat) : null,
                            departureLongitude: depLon ? parseFloat(depLon) : null,
                            arrivalLatitude: arrLat ? parseFloat(arrLat) : null,
                            arrivalLongitude: arrLon ? parseFloat(arrLon) : null,
                        },
                    },
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Commit failed.');
            }
            toast({ title: "Route Committed", description: "The navigation log and airport details have been updated." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Commit Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const lookupAirport = async (icao: string, type: 'dep' | 'arr') => {
        if (!icao) return;
        type === 'dep' ? setIsLookingUpDep(true) : setIsLookingUpArr(true);
        try {
            const res = await fetch(`/api/openaip?resource=airports&icaoCode=${icao}`);
            const data = await res.json();
            const airport = data.items?.[0];
            if (airport && airport.geometry?.coordinates) {
                const [lon, lat] = airport.geometry.coordinates;
                if (type === 'dep') {
                    setDepLat(lat.toFixed(6)); setDepLon(lon.toFixed(6));
                } else {
                    setArrLat(lat.toFixed(6)); setArrLon(lon.toFixed(6));
                }
                toast({ title: `Found ${icao}`, description: airport.name });
            }
        } finally {
            type === 'dep' ? setIsLookingUpDep(false) : setIsLookingUpArr(false);
        }
    };

    if (loadingAc || loadingPeople) return <Skeleton className="h-64 w-full" />;

    const envelope = graphConfig.envelope;
    const allX = [...envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
    const allY = [...envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
    const fXMin = allX.length > 0 ? Math.min(graphConfig.xMin, ...allX) - 1 : graphConfig.xMin;
    const fXMax = allX.length > 0 ? Math.max(graphConfig.xMax, ...allX) + 1 : graphConfig.xMax;
    const fYMin = allY.length > 0 ? Math.min(graphConfig.yMin, ...allY) - 100 : graphConfig.yMin;
    const fYMax = allY.length > 0 ? Math.max(graphConfig.yMax, ...allY) + 100 : graphConfig.yMax;

    return (
        <Card className="flex h-full min-h-0 flex-1 flex-col shadow-none border overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-1 flex-col">
                <BookingDetailHeader
                    title={booking.type}
                    subtitle={`${booking.bookingNumber} - ${aircraft ? aircraft.tailNumber : booking.aircraftId} • Inst: ${instructorLabel} • Stud: ${studentLabel}`}
                    status={booking.status}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    tabRowAction={
                        activeTab === 'planning' ? (
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setShowRouteSummary(!showRouteSummary)}
                                    className={cn("h-8 text-[10px] font-black uppercase border-slate-300", showRouteSummary && "bg-muted")}
                                >
                                    <ListFilter className="h-3 w-3 mr-1.5" /> {showRouteSummary ? 'Hide Route' : 'Show Route'}
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setPlannedLegs([])}
                                    className="h-8 text-[10px] font-black uppercase border-slate-300"
                                    disabled={plannedLegs.length === 0}
                                >
                                    <RotateCcw className="h-3 w-3 mr-1.5" /> Clear
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md font-black uppercase text-[10px] h-8 px-4 gap-2 shrink-0"
                                    onClick={handleCommitRoute}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Commit Route
                                </Button>
                            </div>
                        ) : null
                    }
                />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <TabsContent value="flight-details" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <ScrollArea className="min-h-0 flex-1">
                            <CardContent className="pt-4 pb-20 space-y-6">
                                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Flight Overview</p>
                                            <p className="text-sm font-black uppercase">Quick Reference</p>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase">Visible in Scroll</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
                                        <DetailItem label="Status"><Badge variant={booking.status === 'Approved' ? 'default' : 'secondary'}>{booking.status}</Badge></DetailItem>
                                        <DetailItem label="Aircraft" value={aircraft ? aircraft.tailNumber : booking.aircraftId} />
                                        <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                        <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                                        <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                                        <DetailItem label="Instructor" value={instructorLabel} />
                                        <DetailItem label="Student" value={studentLabel} />
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground">Notes</p>
                                    <p className="font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                                </div>

                                {/* Planning Inputs in Details Tab */}
                                <div className="pt-6 border-t space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Departure ICAO</UILabel>
                                                <div className="flex gap-2">
                                                    <Input value={depIcao} onChange={(e) => setDepIcao(e.target.value.toUpperCase())} placeholder="ICAO" className="font-bold h-10" />
                                                    <Button variant="outline" className="h-10 px-3 font-black text-[10px] uppercase gap-2 shrink-0" onClick={() => lookupAirport(depIcao, 'dep')} disabled={isLookingUpDep}>
                                                        {isLookingUpDep ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />} Lookup
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input value={depLat} onChange={(e) => setDepLat(e.target.value)} placeholder="Lat" className="h-10 text-xs font-bold" />
                                                <Input value={depLon} onChange={(e) => setDepLon(e.target.value)} placeholder="Lon" className="h-10 text-xs font-bold" />
                                            </div>
                                            {showDepWeather && <WeatherCard title="Departure Weather" icao={depIcao} onHide={() => setShowDepWeather(false)} />}
                                            {!showDepWeather && <Button variant="ghost" size="sm" onClick={() => setShowDepWeather(true)} className="text-[10px] font-black uppercase">Show Departure Weather</Button>}
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arrival ICAO</UILabel>
                                                <div className="flex gap-2">
                                                    <Input value={arrIcao} onChange={(e) => setArrIcao(e.target.value.toUpperCase())} placeholder="ICAO" className="font-bold h-10" />
                                                    <Button variant="outline" className="h-10 px-3 font-black text-[10px] uppercase gap-2 shrink-0" onClick={() => lookupAirport(arrIcao, 'arr')} disabled={isLookingUpArr}>
                                                        {isLookingUpArr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />} Lookup
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input value={arrLat} onChange={(e) => setArrLat(e.target.value)} placeholder="Lat" className="h-10 text-xs font-bold" />
                                                <Input value={arrLon} onChange={(e) => setArrLon(e.target.value)} placeholder="Lon" className="h-10 text-xs font-bold" />
                                            </div>
                                            {showArrWeather && <WeatherCard title="Arrival Weather" icao={arrIcao} onHide={() => setShowArrWeather(false)} />}
                                            {!showArrWeather && <Button variant="ghost" size="sm" onClick={() => setShowArrWeather(true)} className="text-[10px] font-black uppercase">Show Arrival Weather</Button>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="planning" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden relative">
                            <div className="flex-1 min-h-0 w-full relative z-0">
                                <AeronauticalMap legs={plannedLegs} onAddWaypoint={handleAddWaypoint} />
                                
                                {/* Route Summary Cards - Absolute positioned over the map */}
                                {showRouteSummary && (
                                    <div className="absolute top-4 right-4 z-[1000] w-[300px] bottom-4 flex flex-col pointer-events-none">
                                        <Card className="shadow-2xl border bg-background/95 backdrop-blur flex flex-col min-h-0 h-fit max-h-full pointer-events-auto overflow-hidden">
                                            <CardHeader className="p-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
                                                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                                    <MapPinned className="h-3.5 w-3.5 text-emerald-600" /> Route Summary
                                                </CardTitle>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowRouteSummary(false)}>
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </CardHeader>
                                            <ScrollArea className="flex-1 overflow-y-auto">
                                                <div className="p-2 space-y-2">
                                                    {plannedLegs.map((leg, i) => (
                                                        <div key={leg.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10 group transition-colors hover:bg-muted/20">
                                                            <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-black text-[11px] uppercase truncate">{leg.waypoint}</span>
                                                        <span className="font-mono text-[9px] text-muted-foreground">{leg.latitude?.toFixed(2)}, {leg.longitude?.toFixed(2)}</span>
                                                    </div>
                            {leg.frequencies && (
                                <p className="mt-1 text-[9px] font-semibold text-emerald-700">
                                    {leg.frequencies}
                                </p>
                            )}
                            {leg.layerInfo && (
                                <p className="text-[9px] font-semibold text-primary">
                                    {leg.layerInfo}
                                </p>
                            )}
                                                    <div className="flex gap-3 mt-1">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[8px] font-bold uppercase text-muted-foreground">Dist</span>
                                                                        <span className="text-[10px] font-black">{leg.distance?.toFixed(1)} NM</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[8px] font-bold uppercase text-muted-foreground">HDG</span>
                                                                        <span className="text-[10px] font-black">{leg.magneticHeading?.toFixed(0)}°</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => setPlannedLegs(plannedLegs.filter(l => l.id !== leg.id))}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {plannedLegs.length === 0 && (
                                                        <div className="py-12 text-center">
                                                            <p className="text-[10px] font-black uppercase text-muted-foreground italic opacity-40">Click the map to add waypoints</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </Card>
                                    </div>
                                )}

                                {/* Floating toggle button if hidden */}
                                {!showRouteSummary && (
                                    <div className="absolute top-4 right-4 z-[1000]">
                                        <Button 
                                            size="sm" 
                                            className="bg-background/90 backdrop-blur shadow-lg border h-10 w-10 p-0 rounded-full"
                                            onClick={() => setShowRouteSummary(true)}
                                        >
                                            <ListFilter className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="mass-balance" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden bg-muted/5">
                        <ScrollArea className="flex-1">
                            <CardContent className="pt-8 pb-20 max-w-7xl mx-auto space-y-12">
                                {/* Mass & Balance Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-xl"><Scale className="h-5 w-5 text-primary" /></div>
                                        <h2 className="text-xl font-bold uppercase tracking-tight">Mass & Balance</h2>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                                        <div className="flex flex-col">
                                            <div className="rounded-xl border bg-background p-4 shadow-sm">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Envelope</p>
                                                    <Badge variant={results.isSafe ? 'default' : 'destructive'} className="text-[10px] font-black uppercase">{results.isSafe ? 'Within Limits' : 'Out Of Limits'}</Badge>
                                                </div>
                                                <div className={cn("relative w-full", isMobile ? "h-[280px]" : "h-[420px]")}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <ScatterChart margin={{ top: 20, right: 28, bottom: 32, left: 20 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                            <XAxis type="number" dataKey="x" name="CG" domain={[fXMin, fXMax]} />
                                                            <YAxis type="number" dataKey="y" name="Weight" domain={[fYMin, fYMax]} />
                                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                            <Scatter data={envelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => <g />} />
                                                            <Scatter data={[{ x: results.cg, y: results.weight }]}>
                                                                <ReferenceDot x={results.cg} y={results.weight} r={10} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={3} />
                                                            </Scatter>
                                                        </ScatterChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
                                                <DetailItem label="Total Weight"><p className="text-2xl font-black">{results.weight} lbs</p></DetailItem>
                                                <DetailItem label="Center Gravity"><p className="text-2xl font-black">{results.cg} in</p></DetailItem>
                                                <Button size="sm" onClick={handleSaveToBooking} className="w-full h-10 uppercase text-xs font-black bg-emerald-700">Save Loading & Logs</Button>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Basic Empty</p>
                                                    <p className="text-sm font-black">{basicEmpty.weight} lbs @ {basicEmpty.arm} in</p>
                                                </div>
                                                {stations.map(s => (
                                                    <div key={s.id} className="space-y-1.5 p-3 border rounded-lg bg-background">
                                                        <UILabel className="text-[10px] font-black uppercase text-muted-foreground">{s.name}</UILabel>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Input type="number" value={s.weight} onChange={(e) => handleStationWeightChange(s.id, e.target.value)} className="h-8 text-xs font-bold" placeholder="Weight" />
                                                            <Input type="number" value={s.arm ?? ''} readOnly className="h-8 text-xs font-bold bg-muted/30" placeholder="Arm" />
                                                        </div>
                                                        {s.type === 'fuel' && (
                                                            <div className="space-y-2 pt-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Input type="number" value={s.gallons ?? ''} onChange={(e) => handleGallonsChange(s.id, e.target.value)} className="h-8 text-xs font-bold" placeholder="Gallons" />
                                                                    <div className="text-[10px] font-bold text-muted-foreground">
                                                                        MAX: {s.maxGallons || 50}
                                                                    </div>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max={s.maxGallons || 50}
                                                                    step="0.1"
                                                                    value={s.gallons || 0}
                                                                    onChange={(e) => handleGallonsChange(s.id, e.target.value)}
                                                                    className="w-full h-2 accent-yellow-600 rounded-full cursor-pointer"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border w-full" />

                                {/* Ops Logs Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {/* Pre-flight */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-xl"><Activity className="h-5 w-5 text-primary" /></div>
                                            <h2 className="text-lg font-black uppercase tracking-widest">Pre-flight Record</h2>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Hobbs Start</UILabel>
                                                <Input type="number" step="0.1" value={preFlight.hobbs} onChange={(e) => setPreFlight({ ...preFlight, hobbs: parseFloat(e.target.value) || 0 })} className="font-bold h-10" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Tacho Start</UILabel>
                                                <Input type="number" step="0.1" value={preFlight.tacho} onChange={(e) => setPreFlight({ ...preFlight, tacho: parseFloat(e.target.value) || 0 })} className="font-bold h-10" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Fuel Uplift (G)</UILabel>
                                                <Input type="number" value={preFlight.fuelUpliftGallons} onChange={(e) => setPreFlight({ ...preFlight, fuelUpliftGallons: parseFloat(e.target.value) || 0 })} className="font-bold h-10" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Oil Uplift (Q)</UILabel>
                                                <Input type="number" value={preFlight.oilUplift} onChange={(e) => setPreFlight({ ...preFlight, oilUplift: parseFloat(e.target.value) || 0 })} className="font-bold h-10" />
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-background border rounded-lg">
                                            <Checkbox id="docs" checked={preFlight.documentsChecked} onCheckedChange={(val) => setPreFlight({ ...preFlight, documentsChecked: !!val })} />
                                            <label htmlFor="docs" className="text-[10px] font-black uppercase leading-none cursor-pointer">Documents & License Checked</label>
                                        </div>
                                    </div>

                                    {/* Post-flight */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-orange-500/10 p-2 rounded-xl"><CheckCircle2 className="h-5 w-5 text-orange-600" /></div>
                                            <h2 className="text-lg font-black uppercase tracking-widest">Post-flight Record</h2>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Hobbs End</UILabel>
                                                <Input type="number" step="0.1" value={postFlight.hobbs} onChange={(e) => setPostFlight({ ...postFlight, hobbs: parseFloat(e.target.value) || 0 })} className="font-bold h-10" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Tacho End</UILabel>
                                                <Input type="number" step="0.1" value={postFlight.tacho} onChange={(e) => setPostFlight({ ...postFlight, tacho: parseFloat(e.target.value) || 0 })} className="font-bold h-10" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <UILabel className="text-[9px] font-bold uppercase flex items-center gap-2"><AlertOctagon className="h-3 w-3 text-orange-600" /> Defects</UILabel>
                                            <Textarea placeholder="Mechanical issues..." className="min-h-[80px] font-medium text-sm border" value={postFlight.defects} onChange={(e) => setPostFlight({ ...postFlight, defects: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="navlog" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <div className="min-h-0 flex-1 overflow-hidden">
                            <NavlogBuilder booking={booking} tenantId={tenantId!} fuelWeightLbs={fuelWeightLbs} onFuelWeightChange={handleNavlogFuelSync} />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </Card>
    );
}
