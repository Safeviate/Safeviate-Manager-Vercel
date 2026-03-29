'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MainPageHeader } from "@/components/page-header";
import type { Booking } from "@/types/booking";

interface ViewBookingDetailsProps {
    booking: Booking;
}

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    return (
        <Tabs defaultValue="mass-and-balance" className="flex-1 overflow-hidden flex flex-col">
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

                    <div className="bg-muted/5 px-6 py-2 shrink-0">
                        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
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
                    </div>
                </div>

                {/* Content Area */}
                <ScrollArea className="flex-1">
                    <TabsContent value="mass-and-balance" className="m-0">
                        <CardContent className="p-12 text-center text-muted-foreground italic text-sm">
                            Mass and Balance calculations and envelope visualization for flight #{booking.bookingNumber}.
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="navlog" className="m-0">
                        <CardContent className="p-12 text-center text-muted-foreground italic text-sm">
                            Navigation log and route planning for flight #{booking.bookingNumber}.
                        </CardContent>
                    </TabsContent>
                </ScrollArea>
            </Card>
        </Tabs>
    );
}
