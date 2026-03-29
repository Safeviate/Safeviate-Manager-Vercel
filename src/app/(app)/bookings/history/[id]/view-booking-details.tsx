'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainPageHeader } from "@/components/page-header";
import { NavlogBuilder } from "@/app/(app)/bookings/navlog-builder";
import type { Booking } from "@/types/booking";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, X, Plus, Navigation } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ViewBookingDetailsProps {
    booking: Booking;
}

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    const { tenantId } = useUserProfile();
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);

    return (
        <>
            <Tabs defaultValue="navlog" className="flex-1 overflow-hidden flex flex-col">
                <Card className="flex-1 overflow-hidden flex flex-col shadow-none border">
                    {/* Sticky Header Section: Identity, Metadata & Navigation */}
                    <div className="sticky top-0 z-30 bg-card border-b">
                        <MainPageHeader 
                            title={`Booking #${booking.bookingNumber}`}
                            description={booking.type}
                        />
                        
                        {/* Metadata Grid Bar */}
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

                    {/* Content Area: Vertical scrolling built in right from the start */}
                    <div className="flex-1 overflow-y-auto no-scrollbar bg-background flex flex-col">
                        <TabsContent value="mass-and-balance" className="m-0 flex-1">
                            <CardContent className="p-12 text-center text-muted-foreground italic text-sm">
                                Mass and Balance calculations and envelope visualization for flight #{booking.bookingNumber}.
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="navlog" className="m-0 flex-1 h-full flex flex-col">
                            <NavlogBuilder booking={booking} tenantId={tenantId || ''} />
                        </TabsContent>
                    </div>
                </Card>
            </Tabs>

            {/* Interactive Planner Dialog */}
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
                                    Route Planning for Booking #{booking.bookingNumber}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="flex-1 flex overflow-hidden">
                        {/* Map View Area */}
                        <div className="flex-1 bg-slate-900 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <div className="h-12 w-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto" />
                                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">Loading Aeronautical Charts...</p>
                                </div>
                            </div>
                            
                            {/* Map UI Overlays */}
                            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                                <Button size="icon" variant="secondary" className="h-10 w-10 shadow-lg"><Plus className="h-5 w-5" /></Button>
                                <Button size="icon" variant="secondary" className="h-10 w-10 shadow-lg"><X className="h-5 w-5" /></Button>
                            </div>
                        </div>

                        {/* Waypoint/Search Sidebar */}
                        <div className="w-[350px] border-l bg-card flex flex-col hidden lg:flex">
                            <div className="p-4 border-b bg-muted/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Waypoint Search</p>
                                <div className="flex gap-2">
                                    <input className="flex-1 h-9 bg-background border rounded px-3 text-xs font-bold uppercase" placeholder="Fix, VOR, NDB..." />
                                    <Button size="sm" className="h-9 px-4 font-black text-[10px] uppercase">Add</Button>
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-4">
                                    <p className="text-[10px] font-black uppercase text-center text-muted-foreground italic py-10 opacity-40">Click the map to add waypoints</p>
                                </div>
                            </ScrollArea>
                            <div className="p-4 border-t bg-muted/5">
                                <Button className="w-full h-11 font-black uppercase text-xs gap-2" onClick={() => setIsPlannerOpen(false)}>
                                    <Navigation className="h-4 w-4" />
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
