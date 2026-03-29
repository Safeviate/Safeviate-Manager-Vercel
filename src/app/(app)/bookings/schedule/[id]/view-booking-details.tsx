'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainPageHeader } from "@/components/page-header";
import { NavlogBuilder } from "@/app/(app)/bookings/navlog-builder";
import type { Booking, NavlogLeg } from "@/types/booking";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, X, Plus, Navigation, Trash2, GripVertical, Save, Loader2, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
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

interface ViewBookingDetailsProps {
    booking: Booking;
}

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    const { tenantId } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initial state from booking
    const [plannedLegs, setPlannedLegs] = useState<NavlogLeg[]>(booking.navlog?.legs || []);

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
            await updateDoc(bookingRef, {
                'navlog.legs': plannedLegs
            });
            toast({ title: "Route Committed", description: "The navigation log has been updated." });
            setIsPlannerOpen(false);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Commit Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Tabs defaultValue="navlog" className="flex-1 overflow-hidden flex flex-col">
                <Card className="flex-1 overflow-hidden flex flex-col shadow-none border">
                    <div className="sticky top-0 z-30 bg-card border-b">
                        <MainPageHeader 
                            title={`Booking #${booking.bookingNumber}`}
                            description={booking.type}
                        />
                        
                        <div className="px-6 py-4 bg-muted/5 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                                    <p className="text-sm font-bold text-foreground">{booking.status}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</p>
                                    <p className="text-sm font-bold text-foreground">{booking.date}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aircraft ID</p>
                                    <p className="text-sm font-bold text-foreground uppercase">{booking.aircraftId}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted/5 px-6 py-2 shrink-0 flex items-center justify-between gap-4">
                            <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar flex items-center">
                                <TabsTrigger 
                                    value="mass-and-balance" 
                                    className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                                >
                                    Mass and Balance
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="navlog" 
                                    className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                                >
                                    Navlog
                                </TabsTrigger>
                            </TabsList>

                            <Button 
                                size="sm" 
                                className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md font-black uppercase text-[10px] h-8 px-4 gap-2 shrink-0"
                                onClick={() => setIsPlannerOpen(true)}
                            >
                                <MapIcon className="h-3.5 w-3.5" />
                                Interactive Planner
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar bg-background flex flex-col">
                        <TabsContent value="mass-and-balance" className="m-0 flex-1">
                            <CardContent className="p-12 text-center text-muted-foreground italic text-sm">
                                Mass and Balance calculations and envelope visualization.
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="navlog" className="m-0 flex-1 h-full flex flex-col">
                            <NavlogBuilder booking={booking} tenantId={tenantId || ''} />
                        </TabsContent>
                    </div>
                </Card>
            </Tabs>

            <Dialog open={isPlannerOpen} onOpenChange={setIsPlannerOpen}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b bg-muted/5 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <MapIcon className="h-5 w-5 text-emerald-700" />
                                    Interactive Flight Planner
                                </DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">
                                    OpenAIP Integrated Route Builder for Booking #{booking.bookingNumber}
                                </DialogDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsPlannerOpen(false)} className="h-8 w-8">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>
                    
                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 bg-slate-900 relative">
                            <AeronauticalMap 
                                legs={plannedLegs} 
                                onAddWaypoint={handleAddWaypoint}
                            />
                        </div>

                        <div className="w-[350px] border-l bg-card flex flex-col hidden lg:flex">
                            <div className="p-4 border-b bg-muted/5 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Planned Route</p>
                                    <p className="text-lg font-black text-primary">{plannedLegs.length} Waypoints</p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setPlannedLegs([])}
                                    className="h-8 text-[10px] font-black uppercase border-slate-300"
                                    disabled={plannedLegs.length === 0}
                                >
                                    <RotateCcw className="h-3 w-3 mr-1.5" /> Clear
                                </Button>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-2">
                                    {plannedLegs.map((leg, i) => (
                                        <div key={leg.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10 group">
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
                                        <p className="text-[10px] font-black uppercase text-center text-muted-foreground italic py-10 opacity-40">Click the map to add waypoints</p>
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="p-4 border-t bg-muted/5">
                                <Button 
                                    className="w-full h-11 font-black uppercase text-xs gap-2 bg-emerald-700 hover:bg-emerald-800" 
                                    onClick={handleCommitRoute}
                                    disabled={isSaving || plannedLegs.length === 0}
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                                    Commit Route to Log
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}