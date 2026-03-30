'use client';

import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/types/booking';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Navigation, Clock, Compass, Ruler } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavlogBuilderProps {
    booking: Booking;
    tenantId: string;
}

export function NavlogBuilder({ booking, tenantId }: NavlogBuilderProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const legs = booking.navlog?.legs || [];

    const handleRemoveLeg = async (legId: string) => {
        if (!firestore) return;
        const updatedLegs = legs.filter(l => l.id !== legId);
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        
        try {
            await updateDoc(bookingRef, {
                'navlog.legs': updatedLegs
            });
            toast({ title: "Leg Removed" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message });
        }
    };

    if (legs.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-background min-h-full">
                <div className="max-w-md space-y-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Navigation className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-black uppercase tracking-tight">Navlog Empty</h3>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                            Use the Interactive Planner to build your flight route.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full bg-background overflow-hidden">
            <div className="shrink-0 bg-muted/30 border-b px-6 py-2">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Ruler className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Total Dist:</span>
                        <span className="text-xs font-black text-foreground">{legs.reduce((acc, l) => acc + (l.distance || 0), 0).toFixed(1)} NM</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Total ETE:</span>
                        <span className="text-xs font-black text-foreground">{legs.reduce((acc, l) => acc + (l.ete || 0), 0).toFixed(0)} MIN</span>
                    </div>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-12 text-[10px] uppercase font-black px-6">Leg</TableHead>
                            <TableHead className="text-[10px] uppercase font-black">Waypoint</TableHead>
                            <TableHead className="text-center text-[10px] uppercase font-black">ALT</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black">TC°</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black">MH°</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black">DIST (NM)</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black">ETE (M)</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black px-6 no-print">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {legs.map((leg, index) => (
                            <TableRow key={leg.id} className="hover:bg-muted/5 transition-colors border-b last:border-b-0">
                                <TableCell className="font-black text-xs text-muted-foreground px-6">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm uppercase text-foreground">{leg.waypoint}</span>
                                        <span className="text-[9px] font-mono font-bold text-muted-foreground">
                                            {leg.latitude?.toFixed(4)}, {leg.longitude?.toFixed(4)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="font-mono text-xs font-bold border-slate-300">
                                        {leg.altitude || '-'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs font-bold text-muted-foreground">{leg.trueCourse?.toFixed(0)}°</TableCell>
                                <TableCell className="text-right">
                                    <span className="font-mono text-sm font-black text-primary">
                                        {leg.magneticHeading?.toFixed(0)}°
                                    </span>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs font-black">{leg.distance?.toFixed(1)}</TableCell>
                                <TableCell className="text-right font-mono text-xs font-black">{leg.ete?.toFixed(0)}</TableCell>
                                <TableCell className="text-right px-6 no-print">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveLeg(leg.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}
