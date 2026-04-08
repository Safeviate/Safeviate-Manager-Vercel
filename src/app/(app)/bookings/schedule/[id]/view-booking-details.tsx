'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking, NavlogLeg, ChecklistPhoto } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle, Map as MapIcon, Loader2, X, RotateCcw, Trash2, FileText, Settings2, Scale, Map as NavIcon, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { BackNavButton } from '@/components/back-nav-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';
import { createNavlogLegFromCoordinates } from '@/lib/flight-planner';
import { MasterMassBalanceGraph, type MassBalanceGraphPoint, type MassBalanceGraphTemplate } from '@/components/master-mass-balance-graph';

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

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const { tenantId } = useUserProfile();
    const [activeTab, setActiveTab] = useState('navlog');
    const [isSaving, setIsSaving] = useState(false);
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
    const [preFlight, setPreFlight] = useState(booking.preFlightData || {
        hobbs: 0,
        tacho: 0,
        fuelUpliftGallons: 0,
        fuelUpliftLitres: 0,
        oilUplift: 0,
        documentsChecked: false,
    });
    const [postFlight, setPostFlight] = useState(booking.postFlightData || {
        hobbs: 0,
        tacho: 0,
        fuelUpliftGallons: 0,
        fuelUpliftLitres: 0,
        oilUplift: 0,
        defects: '',
    });
    const preFlightPhotos = (booking.preFlightData?.photos || []) as ChecklistPhoto[];
    const postFlightPhotos = (booking.postFlightData?.photos || []) as ChecklistPhoto[];

    // Planning state
    const [plannedLegs, setPlannedLegs] = useState<NavlogLeg[]>(booking.navlog?.legs || []);
    const [departureLegId, setDepartureLegId] = useState<string | null>(booking.navlog?.legs?.[0]?.id || null);
    const [arrivalLegId, setArrivalLegId] = useState<string | null>(booking.navlog?.legs?.[booking.navlog?.legs.length ? booking.navlog.legs.length - 1 : 0]?.id || null);
    const [depIcao, setDepIcao] = useState(booking.navlog?.departureIcao || '');
    const [arrIcao, setArrIcao] = useState(booking.navlog?.arrivalIcao || '');
    const [depLat, setDepLat] = useState(booking.navlog?.departureLatitude?.toString() || '');
    const [depLon, setDepLon] = useState(booking.navlog?.departureLongitude?.toString() || '');
    const [arrLat, setArrLat] = useState(booking.navlog?.arrivalLatitude?.toString() || '');
    const [arrLon, setArrLon] = useState(booking.navlog?.arrivalLongitude?.toString() || '');

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

    // ── Fuel sync between M&B and NavLog ──
    const fuelStation = useMemo(() => stations.find(s => s.type === 'fuel'), [stations]);
    const fuelWeightLbs = fuelStation ? (parseFloat(String(fuelStation.weight)) || 0) : undefined;

    const handleNavlogFuelSync = useCallback((weightLbs: number) => {
        setStations(prev => prev.map(s => {
            if (s.type !== 'fuel') return s;
            return { ...s, weight: weightLbs, gallons: parseFloat((weightLbs / FUEL_WEIGHT_PER_GALLON).toFixed(1)) };
        }));
    }, []);

    const handleSaveToBooking = () => {
        void fetch('/api/bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking: {
                    ...booking,
                    massAndBalance: stripUndefinedDeep({
                        takeoffWeight: results.weight,
                        takeoffCg: results.cg,
                        isWithinLimits: results.isSafe,
                        stations,
                    }),
                },
            }),
        }).then(async (res) => {
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Save failed.');
            }
            toast({ title: 'M&B Saved' });
        }).catch((error: any) => {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        });
    };

    const handleSaveChecks = () => {
        void fetch('/api/bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking: {
                    ...booking,
                    preFlightData: stripUndefinedDeep(preFlight),
                    postFlightData: stripUndefinedDeep(postFlight),
                    preFlight: true,
                    postFlight: (postFlight.hobbs || 0) > 0,
                },
            }),
        }).then(async (res) => {
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Save failed.');
            }
            toast({ title: 'Checks Saved' });
        }).catch((error: any) => {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        });
    };

    const handleAddWaypoint = (lat: number, lon: number, identifier: string = 'WP', frequencies?: string, layerInfo?: string) => {
        setPlannedLegs(current => [...current, createNavlogLegFromCoordinates(current, lat, lon, identifier, frequencies, layerInfo)]);
    };

    const handleSetDeparture = (leg: NavlogLeg) => {
        setDepartureLegId(leg.id);
        setArrivalLegId((current) => (current === leg.id ? null : current));
        setDepIcao(leg.waypoint);
        setDepLat(leg.latitude?.toString() || '');
        setDepLon(leg.longitude?.toString() || '');
    };

    const handleSetArrival = (leg: NavlogLeg) => {
        setArrivalLegId(leg.id);
        setDepartureLegId((current) => (current === leg.id ? null : current));
        setArrIcao(leg.waypoint);
        setArrLat(leg.latitude?.toString() || '');
        setArrLon(leg.longitude?.toString() || '');
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
            toast({ title: "Route Committed", description: "The navigation log has been updated." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Commit Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingAc || loadingPeople) return <Skeleton className="h-64 w-full" />;

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
        family: aircraft?.tailNumber || 'Booking',
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
        <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border shadow-none">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-1 flex-col">
                <BookingDetailHeader
                    title={booking.type}
                    subtitle={`${booking.bookingNumber} - ${aircraft ? aircraft.tailNumber : booking.aircraftId} • Inst: ${instructorLabel} • Stud: ${studentLabel}`}
                    status={booking.status}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    headerAction={<BackNavButton href="/bookings/schedule" text="Back to Schedule" />}
                    tabRowAction={
                        activeTab === 'planning' ? (
                            <div className="flex items-center gap-2">
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
                                    disabled={isSaving || plannedLegs.length === 0}
                                >
                                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Commit Route
                                </Button>
                            </div>
                        ) : null
                    }
                    />
                {activeTab === 'checks' ? (
                    <div className="border-t bg-background p-4 md:p-6 space-y-4">
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                            Checks tab active
                        </div>
                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Test</p>
                            <p className="mt-2 text-sm font-semibold">If you can see this card, the checks panel is rendering.</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
                            <div className="space-y-4">
                                <div className="rounded-xl border bg-gradient-to-br from-muted/40 to-background p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instructor Checks</p>
                                            <p className="text-sm text-muted-foreground">DB-backed final sign-off checklist.</p>
                                        </div>
                                        <Badge variant={(!!booking.massAndBalance?.isWithinLimits && !!booking.navlog?.legs?.length && (!!booking.preFlightData?.documentsChecked || !!booking.preFlight) && (!!booking.postFlightData?.hobbs || !!booking.postFlight)) ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                                            {(!!booking.massAndBalance?.isWithinLimits && !!booking.navlog?.legs?.length && (!!booking.preFlightData?.documentsChecked || !!booking.preFlight) && (!!booking.postFlightData?.hobbs || !!booking.postFlight)) ? 'Ready' : 'Incomplete'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { label: 'Mass & balance reviewed', ok: !!booking.massAndBalance?.isWithinLimits },
                                            { label: 'Navlog reviewed', ok: !!booking.navlog?.legs?.length },
                                            { label: 'Pre-flight complete', ok: !!booking.preFlightData?.documentsChecked || !!booking.preFlight },
                                            { label: 'Post-flight recorded', ok: !!booking.postFlightData?.hobbs || !!booking.postFlight },
                                            { label: 'Photos attached', ok: (preFlightPhotos.length + postFlightPhotos.length) > 0 },
                                            { label: 'Fuel uplift logged', ok: (booking.preFlightData?.fuelUpliftGallons || 0) > 0 || (booking.postFlightData?.fuelUpliftGallons || 0) > 0 },
                                        ].map((item) => (
                                            <div key={item.label} className="rounded-lg border bg-background px-3 py-3 flex items-center gap-2">
                                                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black", item.ok ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground")}>
                                                    {item.ok ? '✓' : '—'}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pre-flight</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input value={booking.preFlightData?.hobbs ?? 0} readOnly />
                                            <Input value={booking.preFlightData?.tacho ?? 0} readOnly />
                                            <Input value={booking.preFlightData?.fuelUpliftGallons ?? 0} readOnly />
                                            <Input value={booking.preFlightData?.fuelUpliftLitres ?? 0} readOnly />
                                            <Input value={booking.preFlightData?.oilUplift ?? 0} readOnly />
                                            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                                                <Checkbox checked={!!booking.preFlightData?.documentsChecked} disabled />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Docs checked</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Post-flight</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input value={booking.postFlightData?.hobbs ?? 0} readOnly />
                                            <Input value={booking.postFlightData?.tacho ?? 0} readOnly />
                                            <Input value={booking.postFlightData?.fuelUpliftGallons ?? 0} readOnly />
                                            <Input value={booking.postFlightData?.fuelUpliftLitres ?? 0} readOnly />
                                            <Input value={booking.postFlightData?.oilUplift ?? 0} readOnly />
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border bg-background p-4 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Photos</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(preFlightPhotos.length || postFlightPhotos.length) ? (
                                            <>
                                                {preFlightPhotos.map((photo) => (
                                                    <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                                                        <img src={photo.url} alt={photo.name} className="h-28 w-full object-cover" />
                                                    </a>
                                                ))}
                                                {postFlightPhotos.map((photo) => (
                                                    <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                                                        <img src={photo.url} alt={photo.name} className="h-28 w-full object-cover" />
                                                    </a>
                                                ))}
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No checklist photos stored.</p>
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
                                            <p className="text-xs text-muted-foreground">{booking.navlog?.departureIcao || '---'} to {booking.navlog?.arrivalIcao || '---'}</p>
                                        </div>
                                        <div className="rounded-lg border bg-muted/20 px-3 py-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Approval</p>
                                            <p className="text-sm font-black">{booking.status || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
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
                                        <DetailItem label="Instructor" value={instructorLabel} />
                                        <DetailItem label="Student" value={studentLabel} />
                                        <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                        <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                                        <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                                    </div>
                                </div>
                            </CardContent>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="planning" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden">
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden relative">
                            <div className="flex-1 min-h-0 w-full relative z-0">
                                <AeronauticalMap 
                                    legs={plannedLegs} 
                                    onAddWaypoint={handleAddWaypoint}
                                />
                                
                                {/* Absolute positioned leg summary cards - higher Z index */}
                                <div className="absolute top-4 right-4 z-[1000] w-[300px] hidden lg:block max-h-[calc(100%-2rem)] flex flex-col pointer-events-none">
                                    <Card className="shadow-2xl border bg-background/95 backdrop-blur flex flex-col min-h-0 max-h-full pointer-events-auto">
                                        <CardHeader className="p-4 border-b shrink-0">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-xs font-black uppercase tracking-widest">Route Summary</CardTitle>
                                                <Badge variant="secondary" className="text-[9px] font-black">{plannedLegs.length} WP</Badge>
                                            </div>
                                        </CardHeader>
                                        <ScrollArea className="flex-1">
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
             <p className="mt-1 text-[9px] font-semibold text-primary">
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
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="mass-balance" className="m-0 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden overflow-hidden overflow-x-hidden">
                        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden overflow-x-hidden">
                            <ScrollArea className="min-h-0 flex-1 max-w-full overflow-x-hidden">
                                <CardHeader><CardTitle className="text-xl flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Mass & Balance</CardTitle></CardHeader>
                                <CardContent className="min-h-full overflow-x-hidden pb-20">
                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 overflow-x-hidden">
                                        <div className="flex flex-col">
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
                                        <div className="space-y-6">
                                            <div className="rounded-xl border bg-background p-4 space-y-4">
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
                                            </div>

                                            <div className="rounded-xl border bg-background p-4 space-y-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Input Stations</p>
                                                        <p className="text-xs text-muted-foreground">Adjust only the live loading inputs for this booking.</p>
                                                    </div>
                                                    <Button size="sm" onClick={handleSaveToBooking} className="h-10 uppercase text-xs font-black bg-emerald-700">
                                                        Save Load Config
                                                    </Button>
                                                </div>
                                                <div className="space-y-4">
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
                                </CardContent>
                            </ScrollArea>
                        </div>
                    </TabsContent>

                    {activeTab === 'checks' ? (
                        <div className="m-0 flex h-full min-h-0 flex-1 flex-col overflow-auto">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <ClipboardCheck className="h-5 w-5 text-primary" /> Instructor Checks
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-20">
                                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                                    Checks tab active
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                                    <div className="space-y-6">
                                        <div className="rounded-xl border bg-gradient-to-br from-muted/40 to-background p-4 space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Approval Gate</p>
                                                    <p className="text-sm font-semibold text-muted-foreground">
                                                        Final instructor review of the full flight plan before sign-off.
                                                    </p>
                                                </div>
                                                <Badge variant={(!!booking.massAndBalance?.isWithinLimits && !!booking.navlog?.legs?.length && !!booking.preFlightData?.documentsChecked && !!booking.postFlightData?.hobbs) ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                                                    {(!!booking.massAndBalance?.isWithinLimits && !!booking.navlog?.legs?.length && !!booking.preFlightData?.documentsChecked && !!booking.postFlightData?.hobbs) ? 'Ready' : 'Incomplete'}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { label: 'Mass & balance reviewed', ok: !!booking.massAndBalance?.isWithinLimits, detail: booking.massAndBalance?.isWithinLimits ? 'Within limits' : 'Needs review' },
                                                    { label: 'Navlog reviewed', ok: !!booking.navlog?.legs?.length, detail: booking.navlog?.legs?.length ? `${booking.navlog.legs.length} legs planned` : 'No navlog found' },
                                                    { label: 'Pre-flight checks completed', ok: !!booking.preFlightData?.documentsChecked || !!booking.preFlight, detail: booking.preFlightData?.documentsChecked ? 'Documents checked' : 'Pre-flight not confirmed' },
                                                    { label: 'Post-flight checks recorded', ok: !!booking.postFlightData?.hobbs || !!booking.postFlight, detail: (booking.postFlightData?.hobbs || 0) > 0 ? 'Hobbs recorded' : 'Post-flight pending' },
                                                    { label: 'Photos attached', ok: (preFlightPhotos.length + postFlightPhotos.length) > 0, detail: `${preFlightPhotos.length + postFlightPhotos.length} photo(s)` },
                                                    { label: 'Fuel uplift recorded', ok: (booking.preFlightData?.fuelUpliftGallons || 0) > 0 || (booking.postFlightData?.fuelUpliftGallons || 0) > 0, detail: 'Gallons and litres mirrored' },
                                                ].map((item) => (
                                                    <div key={item.label} className="rounded-lg border bg-background px-3 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black", item.ok ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground")}>
                                                                {item.ok ? '✓' : '—'}
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                                        </div>
                                                        <p className="mt-1.5 pl-7 text-[10px] text-muted-foreground">{item.detail}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                                                The instructor confirms the flight planning, mass and balance, navlog, and the student&apos;s pre/post-flight checks before the booking is closed.
                                            </div>
                                        </div>

                                        <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pre-flight</p>
                                                    <p className="text-sm font-semibold text-muted-foreground">Read-only summary for instructor review.</p>
                                                </div>
                                                <Badge variant={booking.preFlightData?.documentsChecked ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                                                    {booking.preFlightData?.documentsChecked ? 'Ready' : 'Incomplete'}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <UILabel className="text-[9px] font-bold uppercase">Hobbs Start</UILabel>
                                                    <Input type="number" step="0.1" value={booking.preFlightData?.hobbs ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <UILabel className="text-[9px] font-bold uppercase">Tacho Start</UILabel>
                                                    <Input type="number" step="0.1" value={booking.preFlightData?.tacho ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <UILabel className="text-[9px] font-bold uppercase">Fuel Uplift (G)</UILabel>
                                                    <Input type="number" value={booking.preFlightData?.fuelUpliftGallons ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <UILabel className="text-[9px] font-bold uppercase">Fuel Uplift (L)</UILabel>
                                                    <Input type="number" value={booking.preFlightData?.fuelUpliftLitres ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <UILabel className="text-[9px] font-bold uppercase">Oil Uplift (Q)</UILabel>
                                                    <Input type="number" value={booking.preFlightData?.oilUplift ?? 0} readOnly className="font-bold h-10 bg-muted/30" />
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3 p-3 bg-background border rounded-lg">
                                                <Checkbox id="docs-checks" checked={!!booking.preFlightData?.documentsChecked} disabled />
                                                <label htmlFor="docs-checks" className="text-[10px] font-black uppercase leading-none cursor-pointer">Documents & License Checked</label>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Post-flight</p>
                                                    <p className="text-sm font-semibold text-muted-foreground">Read-only summary for instructor review.</p>
                                                </div>
                                                <Badge variant={(booking.postFlightData?.hobbs || 0) > 0 ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                                                    {(booking.postFlightData?.hobbs || 0) > 0 ? 'Recorded' : 'Pending'}
                                                </Badge>
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
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {preFlightPhotos.map((photo) => (
                                                                <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                                                                    <img src={photo.url} alt={photo.name} className="h-24 w-full object-cover" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {postFlightPhotos.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Post-flight Photos</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {postFlightPhotos.map((photo) => (
                                                                <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                                                                    <img src={photo.url} alt={photo.name} className="h-24 w-full object-cover" />
                                                                </a>
                                                            ))}
                                                        </div>
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
                                                    <p className="text-xs text-muted-foreground">Instructor final sign-off goes here.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </div>
                    ) : null}

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
