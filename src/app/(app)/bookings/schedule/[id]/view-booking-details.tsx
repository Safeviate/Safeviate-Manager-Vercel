'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Booking } from "@/types/booking";
import type { Aircraft } from '@/types/aircraft';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle, FileText, Map as NavIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const tenantId = 'safeviate';

    const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);
    const personnelQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);

    const { data: aircrafts, isLoading: loadingAc } = useCollection<Aircraft>(aircraftQuery);
    const { data: instructors, isLoading: loadingIns } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: loadingStu } = useCollection<PilotProfile>(studentsQuery);
    const { data: personnel } = useCollection<Personnel>(personnelQuery);

    const aircraft = useMemo(() => aircrafts?.find(a => a.id === booking.aircraftId), [aircrafts, booking.aircraftId]);

    // --- Calculator State ---
    const [stations, setStations] = useState<any[]>([]);
    const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

    // Initialize stations from Booking (persisted data) or Aircraft (defaults)
    useEffect(() => {
        if (aircraft) {
            // Prioritize saved data from the booking, otherwise use aircraft profile defaults
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
        const envelope = aircraft.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
        const safe = envelope.length > 2 ? isPointInPolygon({ x: cg, y: totalWt }, envelope) : false;

        setResults({
            cg: parseFloat(cg.toFixed(2)),
            weight: parseFloat(totalWt.toFixed(1)),
            isSafe: safe
        });
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

    const handleFuelGallonsChange = (id: number, gallons: string) => {
        const val = parseFloat(gallons) || 0;
        setStations(prev => prev.map(s => 
            s.id === id ? { ...s, gallons: val, weight: val * FUEL_WEIGHT_PER_GALLON } : s
        ));
    };

    const handleSaveToBooking = () => {
        if (!firestore) return;
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        
        updateDocumentNonBlocking(bookingRef, {
            massAndBalance: {
                takeoffWeight: results.weight,
                takeoffCg: results.cg,
                isWithinLimits: results.isSafe,
                stations: stations
            }
        });

        toast({
            title: 'Mass & Balance Saved',
            description: 'Calculations and loading configurations have been saved to this booking.'
        });
    };

    const aircraftLabel = useMemo(() => {
        return aircraft ? `${aircraft.tailNumber} (${aircraft.model})` : booking.aircraftId;
    }, [aircraft, booking.aircraftId]);

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

    if (loadingAc || loadingIns || loadingStu) {
        return <Skeleton className="h-64 w-full" />;
    }

    const envelope = aircraft?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];
    
    return (
        <div className="flex flex-col h-full gap-4 overflow-hidden">
            <Tabs defaultValue="flight-details" className="w-full flex-1 flex flex-col min-h-0">
                <div className="shrink-0 px-1">
                    <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start">
                        <TabsTrigger 
                            value="flight-details" 
                            className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2"
                        >
                            <FileText className="h-4 w-4" /> Flight Details
                        </TabsTrigger>
                        <TabsTrigger 
                            value="navlog" 
                            className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2"
                        >
                            <NavIcon className="h-4 w-4" /> Navlog
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 min-h-0">
                    <TabsContent value="flight-details" className="m-0 h-full">
                        <Card className="flex flex-col h-[calc(100vh-240px)] overflow-hidden shadow-none border">
                            <CardHeader className="border-b bg-muted/20 shrink-0">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle>{booking.type}</CardTitle>
                                        <CardDescription>
                                            Booking Number: {booking.bookingNumber} • {aircraftLabel}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            
                            <ScrollArea className="flex-1">
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                                    <DetailItem label="Status">
                                        <Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge>
                                    </DetailItem>
                                    <DetailItem label="Aircraft" value={aircraftLabel} />
                                    <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                                    <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                                    <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                                    <DetailItem label="Instructor" value={instructorLabel} />
                                    <DetailItem label="Student" value={studentLabel} />
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                                        <p className="text-sm font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                                    </div>
                                </CardContent>

                                <Separator className="my-2" />

                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-primary" />
                                            Mass & Balance Calculator
                                        </CardTitle>
                                        {aircraft?.cgEnvelope && (
                                            <Button size="sm" onClick={handleSaveToBooking} variant="outline" className="gap-2">
                                                <Save className="h-4 w-4" /> Save to Booking
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4 pb-10">
                                    {!aircraft?.cgEnvelope ? (
                                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                            This aircraft does not have a Mass & Balance profile configured.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                                            <div className="space-y-6">
                                                <div className="relative border rounded-xl p-4 bg-background overflow-hidden h-[600px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis type="number" dataKey="x" name="CG" unit=" in" domain={['auto', 'auto']} allowDataOverflow>
                                                                <Label value="CG (inches)" position="insideBottom" offset={-10} />
                                                            </XAxis>
                                                            <YAxis type="number" dataKey="y" name="Weight" unit=" lbs" domain={['auto', 'auto']} allowDataOverflow>
                                                                <Label value="Weight (lbs)" angle={-90} position="insideLeft" />
                                                            </YAxis>
                                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                            <Scatter data={envelope} line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} shape={() => null} />
                                                            <Scatter data={[{ x: results.cg, y: results.weight }]}>
                                                                <ReferenceDot x={results.cg} y={results.weight} r={8} fill={results.isSafe ? "#10b981" : "#ef4444"} stroke="white" strokeWidth={2} />
                                                            </Scatter>
                                                        </ScatterChart>
                                                    </ResponsiveContainer>
                                                    
                                                    <div className={cn(
                                                        "absolute bottom-4 right-4 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-white",
                                                        results.isSafe ? 'bg-green-600' : 'bg-red-600'
                                                    )}>
                                                        {results.isSafe ? "WITHIN LIMITS" : "OUT OF LIMITS"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <Card className="bg-muted/30 shadow-none border-none">
                                                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Weight</p>
                                                            <p className="text-xl font-bold">{results.weight} <span className="text-xs font-normal">lbs</span></p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Center Gravity</p>
                                                            <p className="text-xl font-bold">{results.cg} <span className="text-xs font-normal">in</span></p>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <div className="space-y-4">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Loading Stations</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center text-sm border-b pb-2">
                                                            <span className="text-muted-foreground">Basic Empty Weight</span>
                                                            <span className="font-bold">{aircraft.emptyWeight} lbs</span>
                                                        </div>
                                                        {stations.map((s) => (
                                                            <div key={s.id} className="space-y-1.5">
                                                                <div className="flex justify-between items-center">
                                                                    <UILabel className="text-xs font-semibold">{s.name}</UILabel>
                                                                    <span className="text-[10px] text-muted-foreground">Arm: {s.arm}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative flex-1">
                                                                        <Input 
                                                                            type="number" 
                                                                            value={s.weight} 
                                                                            onChange={(e) => handleStationWeightChange(s.id, e.target.value)}
                                                                            className="h-8 text-right pr-8"
                                                                        />
                                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">LBS</span>
                                                                    </div>
                                                                    {s.type === 'fuel' && (
                                                                        <div className="flex items-center gap-1 w-24">
                                                                            <div className="relative">
                                                                                <Input 
                                                                                    type="number" 
                                                                                    value={s.gallons} 
                                                                                    onChange={(e) => handleFuelGallonsChange(s.id, e.target.value)}
                                                                                    className="h-8 w-full p-1 text-right text-xs pr-8"
                                                                                />
                                                                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground">GAL</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </ScrollArea>
                        </Card>
                    </TabsContent>

                    <TabsContent value="navlog" className="m-0 h-full">
                        <Card className="shadow-none border flex flex-col h-[calc(100vh-240px)]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <NavIcon className="h-5 w-5 text-primary" />
                                    Navigation Log (Navlog)
                                </CardTitle>
                                <CardDescription>Comprehensive flight planning and leg tracking for this booking.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-10">
                                <div className="max-w-md space-y-4">
                                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                                        <NavIcon className="h-10 w-10 text-primary opacity-40" />
                                    </div>
                                    <h3 className="text-lg font-semibold">Navlog Builder Coming Soon</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        The integrated navigation log will allow you to plan legs, calculate wind correction, and track fuel/time burn directly within the flight record.
                                    </p>
                                    <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">Development in Progress</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case 'Approved': return 'default';
        case 'Completed': return 'secondary';
        case 'Cancelled':
        case 'Cancelled with Reason': return 'destructive';
        case 'Confirmed': return 'default';
        default: return 'outline';
    }
}
