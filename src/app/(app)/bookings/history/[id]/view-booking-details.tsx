'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking, BookingCheckApprovals, BookingWorkflowApprovals, BookingWorkflowCompletion, NavlogLeg, Navlog, PreFlightData, PostFlightData, ChecklistPhoto, WaypointContext, TrainingRoute } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle, Loader2, RotateCcw, Trash2, FileText, Settings2, Scale, Map as NavIcon, Wind, Eye, Radio, Droplet, Thermometer, Clock, ListFilter, ChevronRight, MapPinned, Activity, CheckCircle2, Route, ArrowLeft, ChevronDown, MoreHorizontal, Layers3, Plus, X, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NavlogBuilder } from '../../navlog-builder';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { BookingDetailHeader } from '@/components/booking-detail-header';
import { BackNavButton } from '@/components/back-nav-button';
import { PhotoViewerDialog } from '@/components/photo-viewer-dialog';
import { HEADER_ACTION_BUTTON_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { v4 as uuidv4 } from 'uuid';
import { createNavlogLegFromCoordinates } from '@/lib/flight-planner';
import { coordinatePartsToDecimal, formatCoordinateDms, formatLatLonDms } from '@/lib/coordinate-parser';
import { getAircraftHourSnapshot } from '@/lib/aircraft-hours';
import { findOpenAipAirportByIcao } from '@/lib/openaip-airports';
import { MasterMassBalanceGraph, type MassBalanceGraphPoint, type MassBalanceGraphTemplate } from '@/components/master-mass-balance-graph';

// Dynamic import for Leaflet to avoid SSR issues
const AeronauticalMap = dynamic(
  () => import('@/components/bookings/booking-planning-map').then((mod) => mod.BookingPlanningMap),
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
const formatLitres = (gallons: number | undefined) => (((gallons || 0) * 3.78541).toFixed(1));
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
 ] satisfies NonNullable<NonNullable<Booking['massAndBalance']>['stations']>;

type BookingPerson = { id: string; firstName: string; lastName: string };
type BookingStation = NonNullable<NonNullable<Booking['massAndBalance']>['stations']>[number];
type BookingStationState = Omit<BookingStation, 'weight' | 'gallons'> & {
    weight: number | string;
    gallons?: number | string;
};

type WeatherCardData = {
    metar?: {
        rawOb?: string;
        raw?: string;
        wspd?: string | number;
        wdir?: string | number;
        visib?: string | number;
        temp?: string | number;
        dewp?: string | number;
    };
    taf?: {
        rawTAF?: string;
        raw?: string;
    };
};

interface ViewBookingDetailsProps {
    booking: Booking;
}

const BOOKING_PLANNING_SECONDARY_BUTTON_CLASS =
    "h-8 rounded-md border-input bg-background px-2.5 text-[10px] font-medium leading-none tracking-normal text-foreground shadow-sm hover:bg-accent";

const BOOKING_PLANNING_PRIMARY_BUTTON_CLASS =
    "h-8 rounded-md px-2.5 text-[10px] font-medium leading-none tracking-normal shadow-sm";

const BOOKING_PLANNING_STATUS_BUTTON_CLASS =
    "h-8 rounded-md px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] shadow-sm";

const MOBILE_ROUTE_SUMMARY_BODY_HEIGHT = '11.5rem';
const MOBILE_ROUTE_SUMMARY_CARD_HEIGHT = '5rem';
const MOBILE_ROUTE_SUMMARY_EMPTY_HEIGHT = '5.5rem';
type WaypointContextItem = WaypointContext['items'][number];

const WAYPOINT_KIND_LABELS: Partial<Record<NonNullable<WaypointContextItem['kind']>, string>> = {
    airport: 'Airport',
    navaid: 'Navaid',
    'reporting-point': 'Reporting Point',
    airspace: 'Airspace',
    obstacle: 'Obstacle',
    other: 'Other',
};

const formatWaypointContextKind = (kind?: WaypointContextItem['kind']) => (kind ? WAYPOINT_KIND_LABELS[kind] || kind : 'Waypoint');
const formatHeadingDegrees = (value?: number) => (value === undefined || Number.isNaN(value) ? '---' : Math.round(value).toString().padStart(3, '0'));
const getReciprocalHeading = (value?: number) => (value === undefined || Number.isNaN(value) ? undefined : (value + 180) % 360);

const WaypointContextStack = ({ context }: { context?: WaypointContext }) => {
    if (!context?.items?.length) return null;

    return (
        <div className="mt-1.5 space-y-1.5 border-t border-border/60 pt-1.5">
            <div className="space-y-1">
                {context.items.map((item, index) => (
                    <div key={`${item.layer}-${item.label}-${index}`} className="rounded-md border border-border/70 bg-background/70 px-2 py-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                                    {formatWaypointContextKind(item.kind)}
                                </p>
                                <p className="text-[9px] font-black uppercase leading-tight text-foreground">
                                    {item.label}
                                </p>
                                <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    {item.layer}
                                </p>
                            </div>
                            {item.distanceNm !== undefined && (
                                <span className="shrink-0 font-mono text-[8px] font-black text-muted-foreground">
                                    {item.distanceNm.toFixed(1)} NM
                                </span>
                            )}
                        </div>
                        {item.detail && <p className="mt-0.5 text-[8px] font-semibold leading-tight text-slate-700">{item.detail}</p>}
                        {item.frequencies && <p className="mt-0.5 text-[8px] font-semibold leading-tight text-emerald-700">{item.frequencies}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const DetailItem = ({ label, value, children }: { label: string, value?: string | undefined | null, children?: React.ReactNode }) => (
    <div>
        <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        {children ? children : <p className="text-[10px] font-medium leading-4 text-foreground">{value || 'N/A'}</p>}
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
            Object.entries(value as Record<string, unknown>)
                .filter(([, nested]) => nested !== undefined)
                .map(([key, nested]) => [key, stripUndefinedDeep(nested)])
        ) as T;
    }

    return value;
}

const getStatusLabel = (status: Booking['status']) => (status === 'Completed' ? 'Complete' : status);

const CHECK_APPROVAL_KEYS = ['massAndBalance', 'navlog', 'preFlight', 'photos', 'fuelUplift', 'postFlight'] as const;
type CheckApprovalKey = typeof CHECK_APPROVAL_KEYS[number];

const WeatherCard = ({ icao, title, onHide }: { icao?: string, title: string, onHide: () => void }) => {
    const [data, setData] = useState<WeatherCardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWeather = useCallback(async () => {
        if (!icao || icao.length < 3) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/weather?ids=${icao}`);
            const weather = await res.json().catch(() => null);

            if (res.status === 404) {
                setData({});
                return;
            }

            if (!res.ok) throw new Error('Fetch failed');
            setData(weather);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load booking.');
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
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
                <div className="flex items-center gap-2">
                    {icao && <Badge variant="outline" className="text-[9px] font-black uppercase">{icao}</Badge>}
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[9px] font-medium uppercase tracking-[0.16em]" onClick={onHide}>Hide</Button>
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
                    <Button variant="ghost" className="h-10 px-4 text-sm font-medium uppercase hover:bg-transparent" onClick={fetchWeather}>Retry</Button>
                </div>
            ) : data ? (
                <div className="space-y-4">
                    {/* METAR SECTION */}
                    {data.metar && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600">
                                <Activity className="h-3 w-3" /> METAR
                            </div>
                            <p className="text-[10px] font-mono font-bold leading-tight bg-background/50 p-2 rounded border border-border/50">
                                {data.metar.rawOb || data.metar.raw}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                                <div className="flex items-center gap-2">
                                    <Wind className="h-3 w-3 text-sky-500" />
                                    <span className="text-[10px] font-black uppercase">{data.metar.wspd || 0}KT @ {data.metar.wdir || '0'} deg</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Eye className="h-3 w-3 text-sky-500" />
                                    <span className="text-[10px] font-black uppercase">{data.metar.visib || 'N/A'} SM</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Thermometer className="h-3 w-3 text-sky-500" />
                                    <span className="text-[10px] font-black uppercase">{data.metar.temp} C / {data.metar.dewp} C</span>
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
                            <p className="text-[10px] font-mono font-medium leading-relaxed whitespace-pre-line opacity-80">
                                {data.taf.rawTAF || data.taf.raw}
                            </p>
                        </div>
                    )}

                    {!data.metar && !data.taf && <p className="text-xs italic text-muted-foreground">No reports available for this station.</p>}
                    
                    <Button variant="ghost" className="h-10 w-full mt-2 px-4 text-sm font-medium uppercase border border-dashed hover:bg-background/50" onClick={fetchWeather}>Refresh Weather</Button>
                </div>
            ) : (
                <div className="py-4 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium italic mb-4">No weather briefing loaded yet.</p>
                    <Button variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS} onClick={fetchWeather}>Fetch Weather</Button>
                </div>
            )}
        </div>
    );
};

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    const router = useRouter();
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const { tenantId, userProfile } = useUserProfile();
    const [activeTab, setActiveTab] = useState('flight-details');
    const [isSaving, setIsSaving] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [approvingSection, setApprovingSection] = useState<CheckApprovalKey | null>(null);
    const [showRouteSummary, setShowRouteSummary] = useState(!isMobile);
    const [isMapLayersPanelOpen, setIsMapLayersPanelOpen] = useState(false);
    const [isRouteDraftMode, setIsRouteDraftMode] = useState(false);
    const [routeDraftBackup, setRouteDraftBackup] = useState<NavlogLeg[] | null>(null);
    const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
    const [personnel, setPersonnel] = useState<BookingPerson[]>([]);
    const [loadingAc, setLoadingAc] = useState(true);
    const [loadingPeople, setLoadingPeople] = useState(true);
    const [initialDetailsLoaded, setInitialDetailsLoaded] = useState(false);
    const [checkApprovals, setCheckApprovals] = useState<BookingCheckApprovals>(booking.checkApprovals || {});
    const [workflowCompletion, setWorkflowCompletion] = useState<BookingWorkflowCompletion>(booking.workflowCompletion || {});
    const [workflowApprovals, setWorkflowApprovals] = useState<BookingWorkflowApprovals>(booking.workflowApprovals || {});

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
    const isAssignedInstructor = !!userProfile && booking.instructorId === userProfile.id;
    const canManuallyApprove = isAssignedInstructor || userProfile?.role?.toLowerCase() === 'developer' || userProfile?.role?.toLowerCase() === 'dev';
    const printHref = `/print/bookings/${booking.id}`;
    const preFlightPhotos = ((booking.preFlightData as (typeof booking.preFlightData & { photos?: ChecklistPhoto[] }) | undefined)?.photos || []) as ChecklistPhoto[];
    const postFlightPhotos = (booking.postFlightData?.photos || []) as ChecklistPhoto[];

    useEffect(() => {
        if (isMobile && activeTab === 'planning') {
            setShowRouteSummary(false);
        }
    }, [activeTab, isMobile]);

    const checkSections = useMemo(() => ([
        { key: 'massAndBalance' as const, label: 'Mass & balance reviewed', ok: !!booking.massAndBalance?.isWithinLimits, detail: booking.massAndBalance?.isWithinLimits ? 'Within limits' : 'Needs review' },
        { key: 'navlog' as const, label: 'Navlog reviewed', ok: !!booking.navlog?.legs?.length, detail: booking.navlog?.legs?.length ? `${booking.navlog.legs.length} legs planned` : 'No navlog found' },
        { key: 'preFlight' as const, label: 'Pre-flight checks completed', ok: !!booking.preFlightData?.documentsChecked || !!booking.preFlight, detail: booking.preFlightData?.documentsChecked ? 'Documents checked' : 'Pre-flight not confirmed' },
        { key: 'photos' as const, label: 'Photos attached', ok: (((booking.preFlightData as { photos?: ChecklistPhoto[] } | undefined)?.photos?.length || 0) + (booking.postFlightData?.photos?.length || 0)) > 0, detail: `${(((booking.preFlightData as { photos?: ChecklistPhoto[] } | undefined)?.photos?.length || 0) + (booking.postFlightData?.photos?.length || 0))} photo(s)` },
        { key: 'fuelUplift' as const, label: 'Fuel uplift recorded', ok: (booking.preFlightData?.fuelUpliftGallons || 0) > 0 || (booking.postFlightData?.fuelUpliftGallons || 0) > 0, detail: 'Gallons and litres mirrored' },
        { key: 'postFlight' as const, label: 'Post-flight checks recorded', ok: !!booking.postFlightData?.hobbs || !!booking.postFlight, detail: (booking.postFlightData?.hobbs || 0) > 0 ? 'Hobbs recorded' : 'Post-flight pending' },
    ]), [booking.massAndBalance?.isWithinLimits, booking.navlog?.legs?.length, booking.postFlightData?.fuelUpliftGallons, booking.postFlightData?.hobbs, booking.preFlight, booking.preFlightData?.documentsChecked, booking.preFlightData?.fuelUpliftGallons, booking.preFlightData, booking.postFlightData]);
    const approvedSectionCount = checkSections.filter((section) => checkApprovals[section.key]?.approved).length;
    const approvalPrerequisitesComplete =
        !!workflowCompletion.flightDetails &&
        !!workflowCompletion.planning &&
        !!workflowCompletion.weatherPlanningNavlogRequired &&
        !!workflowCompletion.massBalance &&
        !!workflowCompletion.navlog &&
        !!workflowCompletion.checks;
    const [graphConfig, setGraphConfig] = useState(DEFAULT_GRAPH_CONFIG);
    const [basicEmpty, setBasicEmpty] = useState(DEFAULT_BASIC_EMPTY);
    const [stations, setStations] = useState<BookingStationState[]>(DEFAULT_STATIONS);
    const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });
    const [preFlight, setPreFlight] = useState(booking.preFlightData || getAircraftHourSnapshot(aircraft || {
        id: booking.aircraftId,
        make: '',
        model: '',
        tailNumber: '',
    } as Aircraft));
    const [postFlight, setPostFlight] = useState(booking.postFlightData || {
        hobbs: 0,
        tacho: 0,
        fuelUpliftGallons: 0,
        fuelUpliftLitres: 0,
        oilUplift: 0,
        defects: '',
    });

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
                    setInitialDetailsLoaded(true);
                }
            }
        };

        loadData();
        return () => {
            cancelled = true;
        };
    }, [tenantId]);

    useEffect(() => {
        setCheckApprovals(booking.checkApprovals || {});
    }, [booking.checkApprovals, booking.id]);

    useEffect(() => {
        setWorkflowCompletion(booking.workflowCompletion || {});
    }, [booking.workflowCompletion, booking.id]);

    useEffect(() => {
        setWorkflowApprovals(booking.workflowApprovals || {});
    }, [booking.workflowApprovals, booking.id]);

    useEffect(() => {
        if (booking.preFlightData) return;
        if (!aircraft) return;
        setPreFlight(getAircraftHourSnapshot(aircraft));
    }, [aircraft, booking.id, booking.preFlightData]);

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
    const [manualWaypointName, setManualWaypointName] = useState('');
    const [manualLatHemisphere, setManualLatHemisphere] = useState<'S' | 'N'>('S');
    const [manualLatDegrees, setManualLatDegrees] = useState('');
    const [manualLatMinutes, setManualLatMinutes] = useState('');
    const [manualLatSeconds, setManualLatSeconds] = useState('');
    const [manualLonHemisphere, setManualLonHemisphere] = useState<'E' | 'W'>('E');
    const [manualLonDegrees, setManualLonDegrees] = useState('');
    const [manualLonMinutes, setManualLonMinutes] = useState('');
    const [manualLonSeconds, setManualLonSeconds] = useState('');
    const [routeDraftName, setRouteDraftName] = useState(`${booking.bookingNumber} Route`);
    const [savedRouteDraftId, setSavedRouteDraftId] = useState<string | null>(null);
    const latMinutesRef = useRef<HTMLInputElement | null>(null);
    const latSecondsRef = useRef<HTMLInputElement | null>(null);
    const lonDegreesRef = useRef<HTMLInputElement | null>(null);
    const lonMinutesRef = useRef<HTMLInputElement | null>(null);
    const lonSecondsRef = useRef<HTMLInputElement | null>(null);

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
        if (weight === '') {
            setStations(prev => prev.map(s => {
                if (s.id !== id) return s;
                if (s.type === 'fuel') {
                    return { ...s, weight: '', gallons: '' };
                }
                return { ...s, weight: '' };
            }));
            return;
        }

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
        if (gallons === '') {
            setStations(prev => prev.map(s => {
                if (s.id !== id || s.type !== 'fuel') return s;
                return { ...s, gallons: '', weight: '' };
            }));
            return;
        }

        const val = parseFloat(gallons) || 0;
        setStations(prev => prev.map(s => {
            if (s.id !== id || s.type !== 'fuel') return s;
            return { ...s, gallons: val, weight: parseFloat((val * FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
        }));
    };

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Fuel sync between M&B and NavLog ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    const fuelStation = useMemo(() => stations.find(s => s.type === 'fuel'), [stations]);
    const fuelWeightLbs = fuelStation ? (parseFloat(String(fuelStation.weight)) || 0) : undefined;

    const handleNavlogFuelSync = useCallback((weightLbs: number) => {
        setStations(prev => prev.map(s => {
            if (s.type !== 'fuel') return s;
            return { ...s, weight: weightLbs, gallons: parseFloat((weightLbs / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
        }));
    }, []);

    const handleSaveFlightDetails = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        navlog: {
                            ...(booking.navlog || {}),
                            departureIcao: depIcao,
                            arrivalIcao: arrIcao,
                            departureLatitude: depLat ? parseFloat(depLat) : null,
                            departureLongitude: depLon ? parseFloat(depLon) : null,
                            arrivalLatitude: arrLat ? parseFloat(arrLat) : null,
                            arrivalLongitude: arrLon ? parseFloat(arrLon) : null,
                        },
                        workflowCompletion: {
                            ...workflowCompletion,
                            flightDetails: true,
                        },
                    },
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Save failed.');
            }
            setWorkflowCompletion((current) => ({ ...current, flightDetails: true }));
            toast({ title: 'Flight Details Saved' });
        } catch (error: unknown) {
            toast({ variant: "destructive", title: "Save Failed", description: error instanceof Error ? error.message : 'Save failed.' });
        } finally {
            setIsSaving(false);
        }
    };

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
                        workflowCompletion: {
                            ...workflowCompletion,
                            massBalance: true,
                        },
                    },
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Save failed.');
            }
            setWorkflowCompletion((current) => ({ ...current, massBalance: true }));
            toast({ title: 'M&B and Ops Data Saved' });
        } catch (error: unknown) {
            toast({ variant: "destructive", title: "Save Failed", description: error instanceof Error ? error.message : 'Save failed.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveChecks = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        checkApprovals,
                        preFlightData: stripUndefinedDeep(preFlight),
                        postFlightData: stripUndefinedDeep(postFlight),
                        preFlight: true,
                        postFlight: (postFlight.hobbs || 0) > 0,
                        status: 'Completed',
                        workflowCompletion: {
                            ...workflowCompletion,
                            checks: true,
                        },
                    },
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Save failed.');
            }
            setWorkflowCompletion((current) => ({ ...current, checks: true }));
            window.dispatchEvent(new Event('safeviate-bookings-updated'));
            window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
            toast({ title: 'Checks Saved' });
        } catch (error: unknown) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error instanceof Error ? error.message : 'Save failed.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleApproveSection = async (sectionKey: CheckApprovalKey) => {
        if (!canManuallyApprove) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only the assigned instructor can approve this section.' });
            return;
        }

        const section = checkSections.find((item) => item.key === sectionKey);
        if (!section?.ok) {
            toast({ variant: 'destructive', title: 'Section Not Ready', description: 'This section is incomplete and cannot be approved yet.' });
            return;
        }

        setApprovingSection(sectionKey);
        const nextApprovals = {
            ...checkApprovals,
            [sectionKey]: {
                approved: true,
                approvedById: userProfile?.id || checkApprovals[sectionKey]?.approvedById,
                approvedByName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : checkApprovals[sectionKey]?.approvedByName,
                approvedAt: new Date().toISOString(),
            },
        };
        setCheckApprovals(nextApprovals);

        try {
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        checkApprovals: nextApprovals,
                        workflowCompletion,
                    },
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Section approval failed.');
            }
            window.dispatchEvent(new Event('safeviate-bookings-updated'));
            toast({ title: 'Section Approved', description: 'Instructor section sign-off recorded.' });
        } catch (error: unknown) {
            toast({ variant: 'destructive', title: 'Approval Failed', description: error instanceof Error ? error.message : 'Section approval failed.' });
        } finally {
            setApprovingSection((current) => (current === sectionKey ? null : current));
        }
    };

    const renderSectionApprovalButton = (sectionKey: CheckApprovalKey, label = 'Approve') => {
        const section = checkSections.find((item) => item.key === sectionKey);
        const approval = checkApprovals[sectionKey];
        const approved = !!approval?.approved;

        return (
            <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-md border-input bg-background px-3 text-[9px] font-black uppercase tracking-widest text-foreground shadow-sm hover:bg-accent"
                disabled={!section?.ok || approved || approvingSection === sectionKey || !canManuallyApprove}
                onClick={() => handleApproveSection(sectionKey)}
            >
                {approvingSection === sectionKey ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                {approved ? 'Approved' : label}
            </Button>
        );
    };

    const handleMarkWorkflowComplete = async (sectionKey: keyof BookingWorkflowCompletion) => {
        if (!canManuallyApprove) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only the assigned instructor can approve this section.' });
            return;
        }

        setIsSaving(true);
        const nextApproval = {
            approved: true,
            approvedById: userProfile?.id || workflowApprovals[sectionKey]?.approvedById,
            approvedByName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : workflowApprovals[sectionKey]?.approvedByName,
            approvedAt: new Date().toISOString(),
        };
        const nextWorkflowApprovals = {
            ...workflowApprovals,
            [sectionKey]: nextApproval,
        };
        setWorkflowApprovals(nextWorkflowApprovals);
        try {
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        workflowCompletion: {
                            ...workflowCompletion,
                            [sectionKey]: true,
                        },
                        workflowApprovals: nextWorkflowApprovals,
                    },
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Approval failed.');
            }

            setWorkflowCompletion((current) => ({
                ...current,
                [sectionKey]: true,
            }));
            window.dispatchEvent(new Event('safeviate-bookings-updated'));
            toast({ title: 'Approved', description: 'Section approval recorded.' });
        } catch (error: unknown) {
            toast({ variant: 'destructive', title: 'Approval Failed', description: error instanceof Error ? error.message : 'Approval failed.' });
        } finally {
            setIsSaving(false);
        }
    };

    const renderWorkflowStatusButton = (sectionKey: keyof BookingWorkflowCompletion, label = 'Approve') => {
        const approval = workflowApprovals[sectionKey];
        const approved = !!approval?.approved;

        if (approved) {
            return null;
        }

        return (
            <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                    BOOKING_PLANNING_STATUS_BUTTON_CLASS,
                    "border-input bg-background text-foreground hover:bg-accent"
                )}
                onClick={() => handleMarkWorkflowComplete(sectionKey)}
                disabled={isSaving}
                title={`Mark ${label.toLowerCase()}`}
            >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {label}
            </Button>
        );
    };

    const handleManualConfirmFlight = async () => {
        if (!booking.studentId) {
            toast({ variant: 'destructive', title: 'Approval Blocked', description: 'This booking does not have a student assigned yet.' });
            return;
        }

        if (!approvalPrerequisitesComplete) {
            toast({
                variant: 'destructive',
                title: 'Approval Blocked',
                description: 'Complete and save all required sections before approving this flight.',
            });
            return;
        }

        if (!canManuallyApprove) {
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only the assigned instructor can approve this flight.' });
            return;
        }

        const confirmed = window.confirm('Approve this flight and mark it as manually confirmed by the instructor?');
        if (!confirmed) return;

        setIsApproving(true);
        try {
            const res = await fetch('/api/bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking: {
                        ...booking,
                        checkApprovals,
                        workflowCompletion: {
                            ...workflowCompletion,
                            checks: true,
                        },
                        status: 'Approved',
                        approvedById: userProfile?.id || booking.approvedById,
                        approvedByName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : booking.approvedByName,
                        approvedAt: new Date().toISOString(),
                    },
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Approval failed.');
            }

            window.dispatchEvent(new Event('safeviate-bookings-updated'));
            toast({ title: 'Flight Approved', description: 'Instructor sign-off recorded.' });
        } catch (error: unknown) {
            toast({ variant: 'destructive', title: 'Approval Failed', description: error instanceof Error ? error.message : 'Approval failed.' });
        } finally {
            setIsApproving(false);
        }
    };

    const handleAddWaypoint = (
        lat: number,
        lon: number,
        identifier: string = 'WP',
        frequencies?: string,
        layerInfo?: string,
        waypointContext?: WaypointContext
    ) => {
        setPlannedLegs(current => [...current, createNavlogLegFromCoordinates(current, lat, lon, identifier, frequencies, layerInfo, waypointContext)]);
    };

    const handleMoveWaypoint = (legId: string, lat: number, lon: number) => {
        if (!isRouteDraftMode) return;

        setPlannedLegs((current) => {
            const movedLegs = current.map((leg) =>
                leg.id === legId ? { ...leg, latitude: lat, longitude: lon } : leg
            );

            return movedLegs.map((leg, index) => {
                const rebuiltLeg = createNavlogLegFromCoordinates(
                    movedLegs.slice(0, index),
                    leg.latitude ?? 0,
                    leg.longitude ?? 0,
                    leg.waypoint?.replace(/-\d+$/, '') || 'PNT',
                    leg.frequencies,
                    leg.layerInfo,
                    leg.waypointContext,
                );

                return {
                    ...leg,
                    ...rebuiltLeg,
                    id: leg.id,
                };
            });
        });
        toast({ title: 'Waypoint moved', description: 'Route leg calculations updated.' });
    };

    const handleAddRoute = () => {
        setActiveTab('planning');
        if (isRouteDraftMode) {
            const restoredLegs = routeDraftBackup ?? (booking.navlog?.legs || []);
            setPlannedLegs(restoredLegs);
            setRouteDraftBackup(null);
            setIsRouteDraftMode(false);
            setShowRouteSummary(restoredLegs.length > 0);
            setManualWaypointName('');
            setManualLatDegrees('');
            setManualLatMinutes('');
            setManualLatSeconds('');
            setManualLonDegrees('');
            setManualLonMinutes('');
            setManualLonSeconds('');
            setSavedRouteDraftId(null);
            return;
        }

        setRouteDraftBackup(plannedLegs);
        setPlannedLegs([]);
        setIsRouteDraftMode(true);
        setShowRouteSummary(true);
    };

    const handleSaveRouteDraft = async () => {
        if (plannedLegs.length === 0) {
            toast({ variant: 'destructive', title: 'No route to save', description: 'Add at least one waypoint before saving the route.' });
            return;
        }

        const route: TrainingRoute = {
            id: savedRouteDraftId || uuidv4(),
            name: routeDraftName.trim() || `${booking.bookingNumber} Route`,
            description: `Saved from booking ${booking.bookingNumber}`,
            routeType: 'training',
            legs: plannedLegs,
            hazards: booking.navlog?.hazards || [],
            tenantId: tenantId || 'safeviate',
            createdAt: new Date().toISOString(),
        };

        setIsSaving(true);
        try {
            const res = await fetch('/api/training-routes', {
                method: savedRouteDraftId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ route }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to save route.');
            }

            setSavedRouteDraftId(route.id);
            setRouteDraftName(route.name);
            toast({
                title: savedRouteDraftId ? 'Route updated' : 'Route saved',
                description: `${route.name} is available in the route planner.`,
            });
        } catch (error: unknown) {
            toast({ variant: 'destructive', title: 'Save failed', description: error instanceof Error ? error.message : 'Failed to save route.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddManualWaypoint = () => {
        if (!isRouteDraftMode) return;

        const lat = coordinatePartsToDecimal({
            axis: 'lat',
            hemisphere: manualLatHemisphere,
            degrees: manualLatDegrees,
            minutes: manualLatMinutes,
            seconds: manualLatSeconds,
        });
        const lon = coordinatePartsToDecimal({
            axis: 'lon',
            hemisphere: manualLonHemisphere,
            degrees: manualLonDegrees,
            minutes: manualLonMinutes,
            seconds: manualLonSeconds,
        });

        if (lat === null || lon === null) {
            toast({ variant: 'destructive', title: 'Invalid coordinates', description: 'Check the hemisphere, degrees, minutes, and seconds fields.' });
            return;
        }

        const identifier = manualWaypointName.trim() || 'PNT';
        setPlannedLegs((current) => [
            ...current,
            createNavlogLegFromCoordinates(current, lat, lon, identifier, undefined, 'Manual Coordinates'),
        ]);
        setManualWaypointName('');
        setManualLatDegrees('');
        setManualLatMinutes('');
        setManualLatSeconds('');
        setManualLonDegrees('');
        setManualLonMinutes('');
        setManualLonSeconds('');
        setShowRouteSummary(true);
        toast({ title: 'Waypoint added', description: `${identifier} added from manual coordinates.` });
    };

    const handleCoordinatePartChange = (
        value: string,
        setValue: (next: string) => void,
        nextField?: React.RefObject<HTMLInputElement | null>,
        maxDigits = 2
    ) => {
        const sanitized = value.replace(/[^\d]/g, '').slice(0, maxDigits);
        setValue(sanitized);
        if (nextField && sanitized.length === maxDigits) {
            nextField.current?.focus();
            nextField.current?.select();
        }
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
                        workflowCompletion: {
                            ...workflowCompletion,
                            flightDetails: true,
                            planning: true,
                            navlog: true,
                        },
                    },
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Commit failed.');
            }
            setWorkflowCompletion((current) => ({
                ...current,
                flightDetails: true,
                planning: true,
                navlog: true,
            }));
            setIsRouteDraftMode(false);
            setRouteDraftBackup(null);
            window.dispatchEvent(new Event('safeviate-bookings-updated'));
            toast({ title: "Route Committed", description: "The navigation log and airport details have been updated." });
        } catch (error: unknown) {
            toast({ variant: "destructive", title: "Commit Failed", description: error instanceof Error ? error.message : 'Commit failed.' });
        } finally {
            setIsSaving(false);
        }
    };

    const lookupAirport = async (icao: string, type: 'dep' | 'arr') => {
        if (!icao) return;
        type === 'dep' ? setIsLookingUpDep(true) : setIsLookingUpArr(true);
        try {
            const normalizedIcao = icao.trim().toUpperCase();
            const airport = await findOpenAipAirportByIcao(normalizedIcao);
            if (airport && airport.geometry?.coordinates) {
                const [lon, lat] = airport.geometry.coordinates;
                if (type === 'dep') {
                    setDepLat(lat.toFixed(6)); setDepLon(lon.toFixed(6));
                } else {
                    setArrLat(lat.toFixed(6)); setArrLon(lon.toFixed(6));
                }
                toast({ title: `Found ${normalizedIcao}`, description: airport.name });
            } else {
                toast({ variant: 'destructive', title: 'Airport not found', description: `No OpenAIP airport match found for ${normalizedIcao}.` });
            }
        } finally {
            type === 'dep' ? setIsLookingUpDep(false) : setIsLookingUpArr(false);
        }
    };

    const departureLatPreview = depLat ? formatCoordinateDms(Number.parseFloat(depLat), 'lat') : '--';
    const departureLonPreview = depLon ? formatCoordinateDms(Number.parseFloat(depLon), 'lon') : '--';
    const arrivalLatPreview = arrLat ? formatCoordinateDms(Number.parseFloat(arrLat), 'lat') : '--';
    const arrivalLonPreview = arrLon ? formatCoordinateDms(Number.parseFloat(arrLon), 'lon') : '--';

    if (!initialDetailsLoaded && (loadingAc || loadingPeople)) return <Skeleton className="h-64 w-full" />;

    const envelope = graphConfig.envelope;
    const envelopeXs = envelope.map((point) => point.x);
    const cgMargin =
        envelopeXs.length > 0
            ? Math.min(
                Math.abs(results.cg - Math.min(...envelopeXs)),
                Math.abs(Math.max(...envelopeXs) - results.cg)
            )
            : null;
    const graphTemplate: MassBalanceGraphTemplate = {
        id: booking.id,
        name: aircraft ? `${aircraft.make} ${aircraft.model}` : booking.type,
        family: aircraft?.tailNumber || 'History',
        xLabel: 'CG (inches)',
        yLabel: 'Gross Weight (lbs)',
        xDomain: [graphConfig.xMin, graphConfig.xMax],
        yDomain: [graphConfig.yMin, graphConfig.yMax],
        envelope: envelope.map((point, index) => ({
            ...point,
            color: ['#f97316', '#3b82f6', '#eab308', '#8b5cf6', '#ec4899'][index % 5],
        })) as MassBalanceGraphPoint[],
        currentPoint: { x: results.cg, y: results.weight },
    };

    return (
        <Card className={cn(
            "flex min-h-0 flex-col shadow-none border overflow-hidden",
            isMobile && activeTab === 'planning' ? "h-full flex-1" : "h-full flex-1"
        )}>
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className={cn(
                    "flex min-h-0 flex-col",
                    isMobile && activeTab === 'planning' ? "h-full flex-1" : "h-full flex-1"
                )}
            >
                <BookingDetailHeader
                    title={booking.type}
                    subtitle={`${booking.bookingNumber} - ${aircraft ? aircraft.tailNumber : booking.aircraftId} â€¢ Inst: ${instructorLabel} â€¢ Stud: ${studentLabel}`}
                    status={booking.status}
                    approvalMeta={booking.approvedByName ? `Approved by ${booking.approvedByName}${booking.approvedAt ? ` â€¢ ${format(new Date(booking.approvedAt), "PPP p")}` : ""}` : null}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    headerAction={
                        isMobile ? (
                            <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                <Link href={printHref} target="_blank" rel="noreferrer">
                                    <Printer className="h-3.5 w-3.5" />
                                    <span className="sr-only">Print Flight</span>
                                </Link>
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <BackNavButton href="/bookings/history" text="Back to History" />
                                <Button asChild variant="outline" className="h-9 gap-2 text-[10px] font-bold uppercase">
                                    <Link href={printHref} target="_blank" rel="noreferrer">
                                        <Printer className="h-3.5 w-3.5" />
                                        Print Flight
                                    </Link>
                                </Button>
                            </div>
                        )
                    }
                    tabRowAction={
                        activeTab === 'planning' ? (
                            isMobile ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-8 w-full justify-between border-input bg-background px-3 text-[10px] font-semibold tracking-normal text-foreground shadow-sm hover:bg-accent/40"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <MoreHorizontal className="h-3 w-3 shrink-0" />
                                                <span className="truncate">Route Actions</span>
                                            </span>
                                            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                                        <DropdownMenuItem
                                            onClick={handleAddRoute}
                                            className="text-[10px] font-bold uppercase"
                                        >
                                            {isRouteDraftMode ? <X className="mr-2 h-3.5 w-3.5" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                                            {isRouteDraftMode ? 'Exit Add Route' : 'Add Route'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setIsMapLayersPanelOpen((current) => !current)}
                                            className="text-[10px] font-bold uppercase"
                                        >
                                            <Layers3 className="mr-2 h-3.5 w-3.5" />
                                            Map Layers
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setShowRouteSummary(!showRouteSummary)}
                                            className="text-[10px] font-bold uppercase"
                                        >
                                            <ListFilter className="mr-2 h-3.5 w-3.5" />
                                            {showRouteSummary ? 'Hide Route' : 'Show Route'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setPlannedLegs([])}
                                            disabled={plannedLegs.length === 0}
                                            className="text-[10px] font-bold uppercase"
                                        >
                                            <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                            Clear
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={handleSaveRouteDraft}
                                            disabled={isSaving || plannedLegs.length === 0}
                                            className="text-[10px] font-bold uppercase"
                                        >
                                            <Save className="mr-2 h-3.5 w-3.5" />
                                            Save Route
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={handleCommitRoute}
                                            disabled={isSaving}
                                            className="text-[10px] font-bold uppercase"
                                        >
                                            <Save className="mr-2 h-3.5 w-3.5" />
                                            Commit Route
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleAddRoute}
                                        className={BOOKING_PLANNING_SECONDARY_BUTTON_CLASS}
                                    >
                                        {isRouteDraftMode ? <X className="mr-1 h-3 w-3" /> : <Plus className="mr-1 h-3 w-3" />}
                                        {isRouteDraftMode ? 'Exit Add Route' : 'Add Route'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsMapLayersPanelOpen((current) => !current)}
                                        className={BOOKING_PLANNING_SECONDARY_BUTTON_CLASS}
                                    >
                                        <Layers3 className="mr-1 h-3 w-3" /> Map Layers
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => setShowRouteSummary(!showRouteSummary)}
                                        className={cn(BOOKING_PLANNING_SECONDARY_BUTTON_CLASS, showRouteSummary && "bg-muted")}
                                    >
                                        <ListFilter className="mr-1 h-3 w-3" /> {showRouteSummary ? 'Hide Route' : 'Show Route'}
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => setPlannedLegs([])}
                                        className={BOOKING_PLANNING_SECONDARY_BUTTON_CLASS}
                                        disabled={plannedLegs.length === 0}
                                    >
                                        <RotateCcw className="mr-1 h-3 w-3" /> Clear
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleSaveRouteDraft}
                                        className={BOOKING_PLANNING_SECONDARY_BUTTON_CLASS}
                                        disabled={isSaving || plannedLegs.length === 0}
                                    >
                                        <Save className="mr-1 h-3 w-3" /> Save Route
                                    </Button>
                                    <Button 
                                        className={cn(
                                            BOOKING_PLANNING_PRIMARY_BUTTON_CLASS,
                                            "border border-button-primary-border bg-button-primary text-button-primary-foreground hover:bg-button-primary-accent hover:text-button-primary-accent-foreground"
                                        )}
                                        onClick={handleCommitRoute}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                                        Commit Route
                                    </Button>
                                </div>
                            )
                        ) : activeTab === 'flight-details' ? (
                            isMobile ? (
                                <div className="flex flex-col items-center gap-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-8 w-[254px] max-w-[calc(100vw-1rem)] justify-between border-input bg-background px-3 text-[10px] font-semibold tracking-normal text-foreground shadow-sm hover:bg-accent/40"
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <MoreHorizontal className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">Flight Actions</span>
                                                </span>
                                                <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                                            <DropdownMenuItem
                                                onClick={handleSaveFlightDetails}
                                                disabled={isSaving}
                                                className="text-[10px] font-bold uppercase"
                                            >
                                                {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                                                Save Flight Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => router.push('/bookings/history')}
                                                className="text-[10px] font-bold uppercase"
                                            >
                                                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                                                Back to History
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-md border-input bg-background px-3 text-[10px] font-black uppercase tracking-widest text-foreground shadow-sm hover:bg-accent"
                                        onClick={handleSaveFlightDetails}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                                        Save Flight Details
                                    </Button>
                                </div>
                            )
                        ) : activeTab === 'mass-balance' ? (
                            null
                        ) : activeTab === 'navlog' ? (
                            null
                        ) : activeTab === 'checks' ? (
                                isMobile ? (
                                    <div className="flex flex-col items-end gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-8 w-full justify-between border-input bg-background px-3 text-[10px] font-semibold tracking-normal text-foreground shadow-sm hover:bg-accent/40"
                                                >
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <MoreHorizontal className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">Review Actions</span>
                                                    </span>
                                                    <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                                                <DropdownMenuItem
                                                    onClick={handleSaveChecks}
                                                    disabled={isSaving}
                                                    className="text-[10px] font-bold uppercase"
                                                >
                                                    {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                                                    Save Checks
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={handleManualConfirmFlight}
                                                    disabled={isApproving || booking.status === 'Approved' || booking.status === 'Completed' || !canManuallyApprove || !approvalPrerequisitesComplete}
                                                    className="text-[10px] font-bold uppercase"
                                                >
                                                    {isApproving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
                                                    {booking.status === 'Approved' ? 'Approved' : 'Approve Flight'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ) : (
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-9 rounded-md border-input bg-background px-4 text-[10px] font-black uppercase tracking-widest text-foreground shadow-sm hover:bg-accent"
                                    onClick={handleSaveChecks}
                                    disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                                        Save Checks
                                    </Button>
                                    <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 bg-emerald-700 px-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-800"
                                    onClick={handleManualConfirmFlight}
                                    disabled={isApproving || booking.status === 'Approved' || booking.status === 'Completed' || !canManuallyApprove || !approvalPrerequisitesComplete}
                                    >
                                        {isApproving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
                                        {booking.status === 'Approved' ? 'Approved' : 'Approve Flight'}
                                    </Button>
                                    </div>
                                    <p className="text-[9px] font-medium capitalize tracking-[0.18em] text-muted-foreground">
                                        Save each section first, then approve from checks.
                                    </p>
                                </div>
                                )
                        ) : null
                    }
                />
                <div className={cn(
                    "flex min-h-0 flex-col overflow-hidden",
                    isMobile && activeTab === 'planning' ? "h-auto flex-none" : "flex-1"
                )}>
                    <TabsContent value="flight-details" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <ScrollArea className="min-h-0 flex-1">
                            <CardContent className="pt-4 pb-20 space-y-6">
                                <div className="rounded-xl bg-muted/20 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Flight Overview</p>
                                            <p className="text-[9px] font-medium capitalize tracking-[0.18em] text-foreground/90">Quick Reference</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
                                        <DetailItem label="Status"><p className="text-[10px] font-medium capitalize leading-4 text-foreground">{getStatusLabel(booking.status)}</p></DetailItem>
                                        <DetailItem label="Aircraft" value={aircraft ? aircraft.tailNumber : booking.aircraftId} />
                                        <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                        <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                                        <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                                        <DetailItem label="Instructor" value={instructorLabel} />
                                        <DetailItem label="Student" value={studentLabel} />
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
                                    <p className="text-[10px] font-semibold whitespace-pre-wrap text-foreground">{booking.notes || 'No notes provided.'}</p>
                                </div>

                                {/* Planning Inputs in Details Tab */}
                                <div className="pt-6 border-t space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Departure ICAO</UILabel>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input value={depIcao} onChange={(e) => setDepIcao(e.target.value.toUpperCase())} placeholder="ICAO" className="h-10 w-full min-w-0 text-[10px] font-semibold" />
                                                    <Button variant="outline" className={`${HEADER_SECONDARY_BUTTON_CLASS} h-10 w-full min-w-0 justify-center`} onClick={() => lookupAirport(depIcao, 'dep')} disabled={isLookingUpDep}>
                                                        {isLookingUpDep ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />} Lookup
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input value={depLat} onChange={(e) => setDepLat(e.target.value)} placeholder="Lat" className="h-10 text-[10px] font-semibold" />
                                                <Input value={depLon} onChange={(e) => setDepLon(e.target.value)} placeholder="Lon" className="h-10 text-[10px] font-semibold" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="rounded-md border bg-muted/10 px-3 py-2">
                                                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">Lat DMS</p>
                                                    <p className="text-[10px] font-mono font-bold text-foreground">{departureLatPreview}</p>
                                                </div>
                                                <div className="rounded-md border bg-muted/10 px-3 py-2">
                                                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">Lon DMS</p>
                                                    <p className="text-[10px] font-mono font-bold text-foreground">{departureLonPreview}</p>
                                                </div>
                                            </div>
                                            {showDepWeather && <WeatherCard title="Departure Weather" icao={depIcao} onHide={() => setShowDepWeather(false)} />}
                                            {!showDepWeather && <Button variant="ghost" size="sm" onClick={() => setShowDepWeather(true)} className="text-sm font-medium uppercase">Show Departure Weather</Button>}
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Arrival ICAO</UILabel>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input value={arrIcao} onChange={(e) => setArrIcao(e.target.value.toUpperCase())} placeholder="ICAO" className="h-10 w-full min-w-0 text-[10px] font-semibold" />
                                                    <Button variant="outline" className={`${HEADER_SECONDARY_BUTTON_CLASS} h-10 w-full min-w-0 justify-center`} onClick={() => lookupAirport(arrIcao, 'arr')} disabled={isLookingUpArr}>
                                                        {isLookingUpArr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />} Lookup
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input value={arrLat} onChange={(e) => setArrLat(e.target.value)} placeholder="Lat" className="h-10 text-[10px] font-semibold" />
                                                <Input value={arrLon} onChange={(e) => setArrLon(e.target.value)} placeholder="Lon" className="h-10 text-[10px] font-semibold" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="rounded-md border bg-muted/10 px-3 py-2">
                                                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">Lat DMS</p>
                                                    <p className="text-[10px] font-mono font-bold text-foreground">{arrivalLatPreview}</p>
                                                </div>
                                                <div className="rounded-md border bg-muted/10 px-3 py-2">
                                                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">Lon DMS</p>
                                                    <p className="text-[10px] font-mono font-bold text-foreground">{arrivalLonPreview}</p>
                                                </div>
                                            </div>
                                            {showArrWeather && <WeatherCard title="Arrival Weather" icao={arrIcao} onHide={() => setShowArrWeather(false)} />}
                                            {!showArrWeather && <Button variant="ghost" size="sm" onClick={() => setShowArrWeather(true)} className="text-sm font-medium uppercase">Show Arrival Weather</Button>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent
                        value="planning"
                        className={cn(
                            "m-0 flex min-h-0 flex-col overflow-hidden overscroll-contain data-[state=inactive]:hidden",
                            isMobile ? "h-full flex-1 min-h-[calc(100svh-15rem)]" : "h-full flex-1"
                        )}
                    >
                        <div
                            className={cn(
                                "relative flex min-h-0 flex-1 overflow-hidden overscroll-contain",
                                isMobile && "min-h-[calc(100svh-15rem)]"
                            )}
                            style={isMobile ? { overscrollBehavior: 'contain' } : undefined}
                        >
                            <div className={cn("relative z-20 flex min-h-0 flex-1 overflow-visible bg-slate-900", isMobile && "min-h-[calc(100svh-15rem)]")}>
                                <AeronauticalMap
                                    legs={plannedLegs}
                                    onAddWaypoint={handleAddWaypoint}
                                    onMoveWaypoint={handleMoveWaypoint}
                                    isLayersPanelOpen={isMapLayersPanelOpen}
                                    onLayersPanelOpenChange={setIsMapLayersPanelOpen}
                                    isEditing={isRouteDraftMode}
                                    rightAccessory={
                                        <button
                                            type="button"
                                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-xl backdrop-blur hover:bg-slate-50"
                                            onClick={() => setShowRouteSummary((current) => !current)}
                                            aria-label={showRouteSummary ? 'Hide route summary' : 'Show route summary'}
                                            title={showRouteSummary ? 'Hide route summary' : 'Show route summary'}
                                        >
                                            <Route className="h-4 w-4" />
                                        </button>
                                    }
                                />
                            </div>

                            {showRouteSummary ? (
                                <div className="absolute inset-x-3 bottom-3 z-30 md:inset-y-3 md:left-auto md:right-3 md:w-[22rem]">
                                    <Card className="flex max-h-[42svh] min-h-0 flex-col overflow-hidden border border-border/70 bg-background/98 shadow-2xl backdrop-blur md:h-full md:max-h-none">
                                        <CardHeader className="flex shrink-0 flex-row items-start justify-between space-y-0 border-b px-3 py-2.5">
                                            <div className="min-w-0">
                                                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                                    <MapPinned className="h-3.5 w-3.5 text-emerald-600" /> Route Summary
                                                </CardTitle>
                                                {(isRouteDraftMode || savedRouteDraftId) && routeDraftName.trim() ? (
                                                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                                                        <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                                                            {routeDraftName.trim()}
                                                        </p>
                                                        {savedRouteDraftId ? (
                                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-700">
                                                                Saved Route
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowRouteSummary(false)}>
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </CardHeader>
                                        <div
                                            className="min-h-0 flex-1 overflow-y-auto"
                                            style={{ overscrollBehaviorY: 'contain', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
                                            onWheelCapture={(event) => event.stopPropagation()}
                                            onTouchMoveCapture={(event) => event.stopPropagation()}
                                        >
                                            <div className="space-y-2 p-2">
                                                    {isRouteDraftMode ? (
                                                        <div className="rounded-lg border bg-background/90 p-3">
                                                            <div className="mb-3">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Route Draft</p>
                                                                <p className="mt-1 text-[10px] font-semibold text-muted-foreground">Name the route, save it if needed, then enter latitude first and longitude second.</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Input
                                                                    value={routeDraftName}
                                                                    onChange={(event) => setRouteDraftName(event.target.value)}
                                                                    placeholder="Route name"
                                                                    className="h-9 text-[10px] font-black uppercase"
                                                                />
                                                                <Button onClick={handleSaveRouteDraft} variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS} disabled={isSaving || plannedLegs.length === 0}>
                                                                    <Save className="mr-2 h-3.5 w-3.5" />
                                                                    {savedRouteDraftId ? 'Update Saved Route' : 'Save Route'}
                                                                </Button>
                                                                <Input
                                                                    value={manualWaypointName}
                                                                    onChange={(event) => setManualWaypointName(event.target.value)}
                                                                    placeholder="Waypoint label"
                                                                    className="h-9 text-[10px] font-black uppercase"
                                                                />
                                                                <div className="space-y-2">
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Latitude</p>
                                                                    <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] gap-2">
                                                                        <Select value={manualLatHemisphere} onValueChange={(value) => setManualLatHemisphere(value as 'S' | 'N')}>
                                                                            <SelectTrigger className="h-9 text-[10px] font-black uppercase">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="S">South</SelectItem>
                                                                                <SelectItem value="N">North</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <Input value={manualLatDegrees} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLatDegrees, latMinutesRef, 2)} placeholder="Deg" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                                                        <Input ref={latMinutesRef} value={manualLatMinutes} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLatMinutes, latSecondsRef, 2)} placeholder="Min" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                                                        <Input ref={latSecondsRef} value={manualLatSeconds} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLatSeconds, lonDegreesRef, 2)} placeholder="Sec" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Longitude</p>
                                                                    <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] gap-2">
                                                                        <Select value={manualLonHemisphere} onValueChange={(value) => setManualLonHemisphere(value as 'E' | 'W')}>
                                                                            <SelectTrigger className="h-9 text-[10px] font-black uppercase">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="E">East</SelectItem>
                                                                                <SelectItem value="W">West</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <Input ref={lonDegreesRef} value={manualLonDegrees} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLonDegrees, lonMinutesRef, 3)} placeholder="Deg" inputMode="numeric" maxLength={3} className="h-9 text-[10px] font-semibold" />
                                                                        <Input ref={lonMinutesRef} value={manualLonMinutes} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLonMinutes, lonSecondsRef, 2)} placeholder="Min" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                                                        <Input ref={lonSecondsRef} value={manualLonSeconds} onChange={(event) => handleCoordinatePartChange(event.target.value, setManualLonSeconds, undefined, 2)} placeholder="Sec" inputMode="numeric" maxLength={2} className="h-9 text-[10px] font-semibold" />
                                                                    </div>
                                                                </div>
                                                                <p className="text-[9px] font-semibold text-muted-foreground">
                                                                    Type each number separately, then tab to the next field.
                                                                </p>
                                                                <Button onClick={handleAddManualWaypoint} className={HEADER_ACTION_BUTTON_CLASS}>
                                                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                                                    Add Coordinates
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    {plannedLegs.map((leg, index) => (
                                                        (() => {
                                                            const isOriginWaypoint = index === 0;
                                                            const hasWaypointContext = Boolean(leg.waypointContext?.items?.length);
                                                            const metaLine = [hasWaypointContext ? null : leg.frequencies || leg.layerInfo, formatLatLonDms(leg.latitude, leg.longitude)]
                                                                .filter(Boolean)
                                                                .join(' | ');

                                                            return isMobile ? (
                                                            <div
                                                                key={leg.id}
                                                                className="group flex min-h-0 flex-none flex-col overflow-hidden rounded-lg border bg-background px-3 py-2"
                                                                style={{ minHeight: MOBILE_ROUTE_SUMMARY_CARD_HEIGHT }}
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    {isRouteDraftMode ? (
                                                                        <Input
                                                                            value={leg.waypoint || 'PNT'}
                                                                            onChange={(event) => {
                                                                                const rawValue = event.target.value.trim();
                                                                                setPlannedLegs((current) => current.map((item) =>
                                                                                    item.id === leg.id ? { ...item, waypoint: rawValue.replace(/-\d+$/, '') || 'PNT' } : item
                                                                                ));
                                                                            }}
                                                                            className="h-6 border-none p-0 text-[11px] font-black uppercase leading-tight text-foreground shadow-none focus-visible:ring-0"
                                                                        />
                                                                    ) : (
                                                                        <span className="min-w-0 text-[11px] font-black uppercase leading-tight text-foreground">
                                                                            {leg.waypoint || 'PNT'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {metaLine ? (
                                                                    <p className="mt-1 line-clamp-2 min-h-0 text-[8px] font-semibold leading-[1.25] text-emerald-700">
                                                                        {metaLine}
                                                                    </p>
                                                                ) : null}
                                                                <WaypointContextStack context={leg.waypointContext} />
                                                                {isRouteDraftMode ? (
                                                                    <Textarea
                                                                        value={leg.notes ?? ''}
                                                                        onChange={(event) => {
                                                                            const nextNotes = event.target.value;
                                                                            setPlannedLegs((current) => current.map((item) =>
                                                                                item.id === leg.id ? { ...item, notes: nextNotes } : item
                                                                            ));
                                                                        }}
                                                                        placeholder="Waypoint notes"
                                                                        className="mt-2 min-h-[64px] resize-none border-border/70 bg-background px-2 py-2 text-[9px] font-semibold leading-tight placeholder:text-muted-foreground/70 focus-visible:ring-1"
                                                                    />
                                                                ) : leg.notes ? (
                                                                    <div className="mt-2 rounded-md border border-border/70 bg-muted/10 px-2 py-2">
                                                                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">Notes</p>
                                                                        <p className="mt-1 whitespace-pre-wrap text-[9px] font-semibold leading-tight text-foreground">{leg.notes}</p>
                                                                    </div>
                                                                ) : null}
                                                                <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Dist</span>
                                                                        <span className="text-[10px] font-black text-foreground">{isOriginWaypoint ? '---' : `${leg.distance?.toFixed(1) || '0.0'} NM`}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">TRK</span>
                                                                        <span className="text-[10px] font-black text-foreground">{isOriginWaypoint ? '---' : `${formatHeadingDegrees(getReciprocalHeading(leg.magneticHeading))}°`}</span>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 shrink-0 text-destructive/80"
                                                                        onClick={() => setPlannedLegs(plannedLegs.filter((l) => l.id !== leg.id))}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                key={leg.id}
                                                                className="group flex min-h-0 items-start gap-2 overflow-hidden rounded-lg border bg-background p-2 transition-colors hover:bg-muted/20"
                                                            >
                                                                <div className="flex min-w-0 flex-1 flex-col">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        {isRouteDraftMode ? (
                                                                            <Input
                                                                                value={leg.waypoint || 'PNT'}
                                                                                onChange={(event) => {
                                                                                    const rawValue = event.target.value.trim();
                                                                                    setPlannedLegs((current) => current.map((item) =>
                                                                                        item.id === leg.id ? { ...item, waypoint: rawValue.replace(/-\d+$/, '') || 'PNT' } : item
                                                                                    ));
                                                                                }}
                                                                                className="h-6 max-w-[16rem] border-none p-0 text-[10px] font-black uppercase leading-tight shadow-none focus-visible:ring-0"
                                                                            />
                                                                        ) : (
                                                                            <span className="break-words text-[10px] font-black uppercase leading-tight">{leg.waypoint || 'PNT'}</span>
                                                                        )}
                                                                    </div>
                                                                    {metaLine ? (
                                                                        <p className="mt-0.5 text-[8px] font-semibold leading-tight text-emerald-700">
                                                                            {metaLine}
                                                                        </p>
                                                                    ) : null}
                                                                    <WaypointContextStack context={leg.waypointContext} />
                                                                    {isRouteDraftMode ? (
                                                                        <Textarea
                                                                            value={leg.notes ?? ''}
                                                                            onChange={(event) => {
                                                                                const nextNotes = event.target.value;
                                                                                setPlannedLegs((current) => current.map((item) =>
                                                                                    item.id === leg.id ? { ...item, notes: nextNotes } : item
                                                                                ));
                                                                            }}
                                                                            placeholder="Waypoint notes"
                                                                            className="mt-2 min-h-[68px] resize-none border-border/70 bg-background px-2 py-2 text-[9px] font-semibold leading-tight placeholder:text-muted-foreground/70 focus-visible:ring-1"
                                                                        />
                                                                    ) : leg.notes ? (
                                                                        <div className="mt-2 rounded-md border border-border/70 bg-muted/10 px-2 py-2">
                                                                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground">Notes</p>
                                                                            <p className="mt-1 whitespace-pre-wrap text-[9px] font-semibold leading-tight text-foreground">{leg.notes}</p>
                                                                        </div>
                                                                    ) : null}
                                                                    <div className="mt-2 flex items-center gap-4">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[8px] font-bold uppercase text-muted-foreground">Dist</span>
                                                                            <span className="text-[9px] font-black">{isOriginWaypoint ? '---' : `${leg.distance?.toFixed(1) || '0.0'} NM`}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[8px] font-bold uppercase text-muted-foreground">TRK</span>
                                                                            <span className="text-[9px] font-black">{isOriginWaypoint ? '---' : `${formatHeadingDegrees(getReciprocalHeading(leg.magneticHeading))}°`}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 shrink-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                                                                    onClick={() => setPlannedLegs(plannedLegs.filter((l) => l.id !== leg.id))}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        );
                                                        })()
                                                    ))}
                                                    {plannedLegs.length === 0 && (
                                                        <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/5 px-4 py-6 text-center">
                                                            <p className="text-[10px] font-black uppercase italic text-muted-foreground opacity-40">Click the map to add waypoints</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                    </Card>
                                </div>
                            ) : null}
                        </div>
                    </TabsContent>

                    <TabsContent value="mass-balance" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden overflow-x-hidden bg-muted/5">
                        <CardContent className="flex-1 p-0 overflow-hidden overflow-x-hidden bg-muted/5 min-w-0">
                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] h-full overflow-hidden overflow-x-hidden min-w-0">
                                <div className="h-full min-w-0 border-r bg-background overflow-hidden">
                                    <div className="p-6 min-w-0">
                                        <div className={cn("max-w-full overflow-x-hidden", isMobile ? "mx-auto w-full max-w-[430px]" : "mx-auto w-full max-w-[860px]")}>
                                            <MasterMassBalanceGraph
                                                template={graphTemplate}
                                                currentPoint={{ x: results.cg, y: results.weight }}
                                                showHeader={false}
                                                showLayoutBadge={false}
                                                inlineTitle
                                                showCompactMetrics={false}
                                                compactHeightMode="tight"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <ScrollArea className="h-full min-w-0 max-w-full overflow-x-hidden">
                                    <div className="p-6 space-y-8 pb-24 min-w-0">
                                        <section className="rounded-xl border bg-background p-4 space-y-4">
                                            <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aircraft</p>
                                                <div className="flex flex-wrap items-baseline gap-2">
                                                    <span className="text-sm font-black uppercase tracking-[0.18em] text-primary">
                                                        {aircraft?.tailNumber || booking.aircraftId}
                                                    </span>
                                                    <span className="text-lg font-black uppercase tracking-tight">
                                                        {aircraft ? `${aircraft.make} ${aircraft.model}` : booking.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-3">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CG</p>
                                                    <p className="text-sm font-black tabular-nums">{results.cg.toFixed(2)} in</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Weight</p>
                                                    <p className="text-sm font-black tabular-nums">{results.weight.toFixed(0)} lbs</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                                                    <p className={cn('text-sm font-black uppercase', results.isSafe ? 'text-emerald-700' : 'text-red-700')}>
                                                        {results.isSafe ? 'Within limits' : 'Review'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CG Margin</p>
                                                    <p className="text-sm font-black tabular-nums">
                                                        {cgMargin === null ? '--' : `${cgMargin.toFixed(1)} in`}
                                                    </p>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Input Stations</h2>
                                        <p className="mt-1 text-xs text-muted-foreground">Adjust only the live loading inputs for this booking.</p>
                                    </div>
                                            <Button onClick={handleSaveToBooking} className={`${HEADER_ACTION_BUTTON_CLASS} min-w-[168px] justify-center`} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                {isSaving ? 'Saving...' : 'Save Loading & Logs'}
                                            </Button>
                                </div>
                                            <div className="space-y-4">
                                                {stations.map(s => (
                                                    <div key={s.id} className="space-y-2 p-3 border rounded-lg bg-background">
                                                        <UILabel className="text-[10px] font-black uppercase text-muted-foreground">{s.name}</UILabel>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Input type="number" value={s.weight} onChange={(e) => handleStationWeightChange(s.id, e.target.value)} className="h-8 text-xs font-bold" placeholder="Weight" />
                                                            <Input type="number" value={s.arm ?? ''} readOnly className="h-8 text-xs font-bold bg-muted/30" placeholder="Arm" />
                                                        </div>
                                                        {s.type === 'fuel' && (
                                                            <div className="space-y-2 pt-2">
                                                                <div className="flex justify-between items-center text-[9px] font-black uppercase text-foreground/75">
                                                                    <span>{s.gallons} GAL / {formatLitres(typeof s.gallons === 'number' ? s.gallons : Number(s.gallons) || undefined)} L</span>
                                                                    <span>Max: {s.maxGallons}</span>
                                                                </div>
                                                                <input aria-label={`${s.name} fuel gallons`} type="range" min="0" max={s.maxGallons || 50} step="0.1" value={s.gallons || 0} onChange={(e) => handleGallonsChange(s.id, e.target.value)} className="w-full h-1 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                </ScrollArea>
                            </div>
                        </CardContent>
                                        </TabsContent>
                    <TabsContent value="checks" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                                <div className="space-y-6">
                                    <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pre-flight</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Hobbs Start</UILabel>
                                                <Input type="number" step="0.1" value={preFlight.hobbs ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Tacho Start</UILabel>
                                                <Input type="number" step="0.1" value={preFlight.tacho ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Fuel Uplift (G)</UILabel>
                                                <Input type="number" value={preFlight.fuelUpliftGallons ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Fuel Uplift (L)</UILabel>
                                                <Input type="number" value={preFlight.fuelUpliftLitres ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Oil Uplift (Q)</UILabel>
                                                <Input type="number" value={preFlight.oilUplift ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 p-3 bg-background border rounded-lg">
                                            <Checkbox id="docs-checks" checked={!!preFlight.documentsChecked} disabled />
                                            <label htmlFor="docs-checks" className="text-[10px] font-black uppercase leading-none cursor-pointer">Documents & License Checked</label>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Post-flight</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Hobbs End</UILabel>
                                                <Input type="number" step="0.1" value={booking.postFlightData?.hobbs ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Tacho End</UILabel>
                                                <Input type="number" step="0.1" value={booking.postFlightData?.tacho ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Fuel Uplift (G)</UILabel>
                                                <Input type="number" value={booking.postFlightData?.fuelUpliftGallons ?? 0} readOnly className="font-bold h-9 bg-muted/30" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Fuel Uplift (L)</UILabel>
                                                <Input type="number" value={booking.postFlightData?.fuelUpliftLitres ?? 0} readOnly className="font-bold h-9 bg-muted/30" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <UILabel className="text-[9px] font-bold uppercase">Oil Uplift (Q)</UILabel>
                                                <Input type="number" value={booking.postFlightData?.oilUplift ?? 0} readOnly className="font-bold h-9 bg-muted/30" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border bg-background p-4 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Photos</p>
                                        <div className="space-y-4">
                                            {preFlightPhotos.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pre-flight Photos</p>
                                                    <PhotoViewerDialog
                                                        title="Pre-flight Photos"
                                                        photos={preFlightPhotos.map((photo) => ({ url: photo.url, name: photo.description }))}
                                                    />
                                                </div>
                                            )}
                                            {postFlightPhotos.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Post-flight Photos</p>
                                                    <PhotoViewerDialog
                                                        title="Post-flight Photos"
                                                        photos={postFlightPhotos.map((photo) => ({ url: photo.url, name: photo.description }))}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="rounded-xl border bg-background p-4 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Flight Summary</p>
                                        <div className="grid gap-3">
                                            <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mass & Balance</p>
                                                <p className="text-sm font-black">{booking.massAndBalance?.takeoffWeight ?? 'N/A'} lbs</p>
                                                <p className="text-xs text-muted-foreground">CG {booking.massAndBalance?.takeoffCg ?? 'N/A'} in</p>
                                            </div>
                                            <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Navlog</p>
                                                <p className="text-sm font-black">{booking.navlog?.legs?.length || 0} leg(s)</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {booking.navlog?.departureIcao || '---'} to {booking.navlog?.arrivalIcao || '---'}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Approval</p>
                                                <p className="text-sm font-black">{booking.status || 'N/A'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {booking.approvedByName ? `Approved by ${booking.approvedByName}` : `${approvedSectionCount}/${checkSections.length} sections approved`}
                                                </p>
                                                {booking.approvedAt ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDateSafe(booking.approvedAt, 'PPP p')}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent><TabsContent value="navlog" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <div className="min-h-0 flex-1 overflow-hidden">
                            <NavlogBuilder booking={booking} tenantId={tenantId!} fuelWeightLbs={fuelWeightLbs} onFuelWeightChange={handleNavlogFuelSync} />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </Card>
    );
}




