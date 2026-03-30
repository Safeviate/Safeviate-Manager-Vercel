'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking, NavlogLeg, Navlog, PreFlightData, PostFlightData } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
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
import { NavlogBuilder } from '@/app/(app)/bookings/navlog-builder';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { BookingDetailHeader } from '@/components/booking-detail-header';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { calculateWindTriangle, getDistance, getBearing, getMagneticVariation, calculateEte, calculateFuelRequired } from '@/lib/e6b';

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
    const firestore = useFirestore();
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const { tenantId } = useUserProfile();
    const [activeTab, setActiveTab] = useState('flight-details');
    const [isSaving, setIsSaving] = useState(false);
    const [showRouteSummary, setShowRouteSummary] = useState(!isMobile);

    const aircraftQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: instructors, isLoading: loadingIns } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: loadingStu } = useCollection<PilotProfile>(studentsQuery);
    const { data: personnel } = useCollection<Personnel>(personnelQuery);

    const aircraft = useMemo(() => aircrafts?.find(a => a.id === booking.aircraftId), [aircrafts, booking.aircraftId]);

    const instructorLabel = useMemo(() => {
        if (!booking.instructorId) return 'N/A';
        const ins = instructors?.find(i => i.id === booking.instructorId) || personnel?.find(p => p.id === booking.instructorId);
        return ins ? `${ins.firstName} ${ins.lastName}` : booking.instructorId;
    }, [instructors, personnel, booking.instructorId]);

    const studentLabel = useMemo(() => {
        if (!booking.studentId) return 'N/A';
        const stu = students?.find(s => s.id === booking.studentId);
        return stu ? `${stu.firstName} ${stu.lastName}` : booking.studentId;
    }, [students, booking.studentId]);

    const [stations, setStations] = useState<any[]>([]);
    const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

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
            if (booking.massAndBalance?.stations && booking.massAndBalance.stations.length > 0) {
                setStations(booking.massAndBalance.stations);
            } else if (aircraft.stations) {
                setStations(aircraft.stations);
            }
        }
    }, [aircraft, booking.massAndBalance?.stations]);

    useEffect(() => {
        if (!aircraft || !aircraft.emptyWeight || !aircraft.emptyWeightMoment) return;
        let totalMom = aircraft.emptyWeightMoment;
        let totalWt = aircraft.emptyWeight;
        stations.forEach(st => {
            const wt = parseFloat(String(st.weight)) || 0;
            const arm = parseFloat(String(st.arm)) || 0;
            totalWt += wt;
            totalMom += (wt * arm);
        });
        const cg = totalWt > 0 ? (totalMom / totalWt) : 0;
        const roundedCg = parseFloat(cg.toFixed(2));
        const roundedWeight = parseFloat(totalWt.toFixed(1));
        const envelope = aircraft.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
        const safe = envelope.length > 2 ? isPointInPolygon({ x: roundedCg, y: roundedWeight }, envelope) : false;
        setResults({ cg: roundedCg, weight: roundedWeight, isSafe: safe });
    }, [stations, aircraft]);

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

    const handleSaveToBooking = async () => {
        if (!firestore || !tenantId) return;
        setIsSaving(true);
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        try {
            await updateDocumentNonBlocking(bookingRef, { 
                massAndBalance: { takeoffWeight: results.weight, takeoffCg: results.cg, isWithinLimits: results.isSafe, stations },
                preFlightData: preFlight,
                postFlightData: postFlight,
                preFlight: true,
                postFlight: postFlight.hobbs > 0
            });
            toast({ title: 'M&B and Ops Data Saved' });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Save Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddWaypoint = (lat: number, lon: number, identifier: string = 'WP') => {
        const lastLeg = plannedLegs[plannedLegs.length - 1];
        let distance = 0;
        let trueCourse = 0;
        let magneticHeading = 0;
        let variation = getMagneticVariation(lat, lon);

        if (lastLeg) {
            const start = { lat: lastLeg.latitude!, lon: lastLeg.longitude! };
            const end = { lat, lon };
            distance = getDistance(start, end);
            trueCourse = getBearing(start, end);
            
            const triangle = calculateWindTriangle({
                trueCourse,
                trueAirspeed: 100,
                windDirection: 0,
                windSpeed: 0
            });
            magneticHeading = (triangle.heading - variation + 360) % 360;
        }

        const newLeg: NavlogLeg = {
            id: uuidv4(),
            waypoint: `${identifier}-${plannedLegs.length + 1}`,
            latitude: lat,
            longitude: lon,
            distance,
            trueCourse,
            magneticHeading,
            variation,
            altitude: 3500,
            ete: lastLeg ? calculateEte(distance, 100) : 0,
            tripFuel: lastLeg ? calculateFuelRequired(calculateEte(distance, 100), 8.5) : 0
        };

        setPlannedLegs([...plannedLegs, newLeg]);
    };

    const handleCommitRoute = async () => {
        if (!firestore || !tenantId) return;
        setIsSaving(true);

        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        
        try {
            await updateDocumentNonBlocking(bookingRef, {
                'navlog.legs': plannedLegs,
                'navlog.departureIcao': depIcao,
                'navlog.arrivalIcao': arrIcao,
                'navlog.departureLatitude': parseFloat(depLat),
                'navlog.departureLongitude': parseFloat(depLon),
                'navlog.arrivalLatitude': parseFloat(arrLat),
                'navlog.arrivalLongitude': parseFloat(arrLon)
            });
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

    if (loadingAc || loadingIns || loadingStu) return <Skeleton className="h-64 w-full" />;

    const envelope = aircraft?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
    const allX = [...envelope.map(p => p.x), results.cg].filter(n => !isNaN(n) && isFinite(n));
    const allY = [...envelope.map(p => p.y), results.weight].filter(n => !isNaN(n) && isFinite(n));
    const fXMin = allX.length > 0 ? Math.min(...allX) - 2 : 0;
    const fXMax = allX.length > 0 ? Math.max(...allX) + 2 : 100;
    const fYMin = allY.length > 0 ? Math.min(...allY) - 100 : 0;
    const fYMax = allY.length > 0 ? Math.max(...allY) + 100 : 2000;

    return (
        <Card className="flex h-full min-h-0 flex-1 flex-col shadow-none border overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-1 flex-col">
                <BookingDetailHeader
                    title={booking.type}
                    subtitle={`${booking.bookingNumber} - ${aircraft ? aircraft.tailNumber : booking.aircraftId}`}
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
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                            <ScrollArea className="min-h-0 flex-1">
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 pb-20">
                                    <DetailItem label="Status"><Badge variant={booking.status === 'Approved' ? 'default' : 'secondary'}>{booking.status}</Badge></DetailItem>
                                    <DetailItem label="Aircraft" value={aircraft ? aircraft.tailNumber : booking.aircraftId} />
                                    <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                    <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                                    <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                                    <DetailItem label="Instructor" value={instructorLabel} />
                                    <DetailItem label="Student" value={studentLabel} />
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <p className="text-sm text-muted-foreground">Notes</p>
                                        <p className="font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                                    </div>

                                    {/* Planning Inputs in Details Tab */}
                                    <div className="md:col-span-2 lg:col-span-3 pt-6 border-t mt-4 space-y-6">
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
                        </div>
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
                                                {stations.map(s => (
                                                    <div key={s.id} className="space-y-1.5 p-3 border rounded-lg bg-background">
                                                        <UILabel className="text-[10px] font-black uppercase text-muted-foreground">{s.name}</UILabel>
                                                        <div className="flex items-center gap-2">
                                                            <Input type="number" value={s.weight} onChange={(e) => handleStationWeightChange(s.id, e.target.value)} className="h-8 text-xs font-bold" />
                                                            <div className="text-[10px] font-bold text-muted-foreground w-8">LBS</div>
                                                        </div>
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
                            <NavlogBuilder booking={booking} tenantId={tenantId!} />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </Card>
    );
}
