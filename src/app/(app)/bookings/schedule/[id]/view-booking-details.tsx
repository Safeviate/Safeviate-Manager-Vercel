
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceDot } from 'recharts';
import { isPointInPolygon } from '@/lib/utils';
import { Save, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label as UILabel } from '@/components/ui/label';

const FUEL_WEIGHT_PER_GALLON = 6;

interface ViewBookingDetailsProps {
    booking: Booking;
}

const DetailItem = ({ label, value }: { label: string, value: string | undefined | null }) => (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || 'N/A'}</p>
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
    const { data: personnel, isLoading: loadingPer } = useCollection<Personnel>(personnelQuery);

    const aircraft = useMemo(() => aircrafts?.find(a => a.id === booking.aircraftId), [aircrafts, booking.aircraftId]);

    // --- Calculator State ---
    const [stations, setStations] = useState<any[]>([]);
    const [results, setResults] = useState({ cg: 0, weight: 0, isSafe: false });

    useEffect(() => {
        if (aircraft && aircraft.stations) {
            setStations(aircraft.stations);
        }
    }, [aircraft]);

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
            description: 'Calculations have been attached to this booking.'
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

    if (loadingAc || loadingIns || loadingStu || loadingPer) {
        return <Skeleton className="h-64 w-full" />;
    }

    const envelope = aircraft?.cgEnvelope?.map(p => ({ x: p.cg, y: p.weight })) || [];

    return (
        <Card>
            <Tabs defaultValue="details">
                <CardHeader className="border-b bg-muted/20">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle>{booking.type}</CardTitle>
                            <CardDescription>
                                Booking Number: {booking.bookingNumber} • {aircraftLabel}
                            </CardDescription>
                        </div>
                        <TabsList>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="mass-balance">Mass & Balance</TabsTrigger>
                        </TabsList>
                    </div>
                </CardHeader>
                
                <TabsContent value="details" className="m-0">
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                        <DetailItem label="Status" value={booking.status} />
                        <DetailItem label="Aircraft" value={aircraftLabel} />
                        <DetailItem label="Date" value={formatDateSafe(booking.start, 'PPP')} />
                        <DetailItem label="Start Time" value={formatDateSafe(booking.start, 'p')} />
                        <DetailItem label="End Time" value={formatDateSafe(booking.end, 'p')} />
                        <DetailItem label="Instructor" value={instructorLabel} />
                        <DetailItem label="Student" value={studentLabel} />
                        <div className="md:col-span-2 lg:col-span-3">
                            <p className="text-sm text-muted-foreground">Notes</p>
                            <p className="font-semibold whitespace-pre-wrap">{booking.notes || 'No notes provided.'}</p>
                        </div>
                    </CardContent>
                </TabsContent>

                <TabsContent value="mass-balance" className="m-0">
                    <CardContent className="pt-6">
                        {!aircraft?.cgEnvelope ? (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                This aircraft does not have a Mass & Balance profile configured.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> CG Envelope</h3>
                                        <Button size="sm" onClick={handleSaveToBooking} className="gap-2">
                                            <Save className="h-4 w-4" /> Save to Booking
                                        </Button>
                                    </div>
                                    
                                    <div className="relative border rounded-xl p-4 bg-background overflow-hidden aspect-video">
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
                                    <Card className="bg-muted/30">
                                        <CardContent className="pt-6 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs uppercase font-bold text-muted-foreground">Total Weight</p>
                                                <p className="text-2xl font-bold">{results.weight} <span className="text-sm font-normal">lbs</span></p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase font-bold text-muted-foreground">Center Gravity</p>
                                                <p className="text-2xl font-bold">{results.cg} <span className="text-sm font-normal">in</span></p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Loading Stations</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                                <span>Basic Empty Weight</span>
                                                <span className="font-bold">{aircraft.emptyWeight} lbs</span>
                                            </div>
                                            {stations.map((s) => (
                                                <div key={s.id} className="space-y-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <UILabel className="text-xs">{s.name}</UILabel>
                                                        <span className="text-[10px] text-muted-foreground">Arm: {s.arm}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            type="number" 
                                                            value={s.weight} 
                                                            onChange={(e) => handleStationWeightChange(s.id, e.target.value)}
                                                            className="h-8 text-right"
                                                        />
                                                        {s.type === 'fuel' && (
                                                            <div className="flex items-center gap-1 min-w-[80px]">
                                                                <Input 
                                                                    type="number" 
                                                                    value={s.gallons} 
                                                                    onChange={(e) => handleFuelGallonsChange(s.id, e.target.value)}
                                                                    className="h-8 w-12 p-1 text-right text-xs"
                                                                />
                                                                <span className="text-[10px] font-bold">GAL</span>
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
                </TabsContent>
            </Tabs>
        </Card>
    );
}
