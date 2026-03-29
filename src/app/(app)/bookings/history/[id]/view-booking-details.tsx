'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Booking } from "@/types/booking";

interface ViewBookingDetailsProps {
    booking: Booking;
}

export function ViewBookingDetails({ booking }: ViewBookingDetailsProps) {
    return (
        <div className="flex flex-col h-full items-center justify-center p-4">
            <Card className="max-w-2xl w-full border-dashed bg-muted/5 shadow-none">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Construction className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">
                        Rebuilding Detail View
                    </CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest">
                        Booking Reference: #{booking.bookingNumber}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex flex-col items-center gap-4 py-8 border-y border-dashed">
                        <Badge variant="outline" className="h-8 px-6 font-black uppercase tracking-widest text-primary border-primary/30">
                            {booking.type}
                        </Badge>
                        <p className="text-sm text-muted-foreground text-center max-w-sm font-medium italic leading-relaxed">
                            The flight history card logic is being completely refactored to improve layout utilization and device responsiveness.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center pb-8">
                    <Button asChild variant="outline" size="sm" className="h-9 px-6 text-[10px] font-black uppercase tracking-tight border-slate-300">
                        <Link href="/bookings/history">
                            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                            Back to History
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

function CardFooter({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={className}>{children}</div>;
}
