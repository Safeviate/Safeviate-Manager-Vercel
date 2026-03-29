'use client';

import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/types/booking';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Navigation } from 'lucide-react';
import { Label } from '@/components/ui/label';

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
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-background min-h-[400px]">
                <div className="max-w-md space-y-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Navigation className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-black uppercase tracking-tight">No Route Defined</h3>
                        <p className="text-sm text-muted-foreground font-medium italic">
                            Use the Interactive Planner to add waypoints and generate your navigation log.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            <div className="overflow-x-auto flex-1">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-12 text-[10px] uppercase font-black px-6">Leg</TableHead>
                            <TableHead className="text-[10px] uppercase font-black">Waypoint</TableHead>
                            <TableHead className="text-[10px] uppercase font-black">ALT</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black">TC</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black">MH</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black">DIST</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black">ETE</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-black px-6 no-print">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {legs.map((leg, index) => (
                            <TableRow key={leg.id} className="hover:bg-muted/5 transition-colors border-b">
                                <TableCell className="font-black text-xs text-muted-foreground px-6">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm uppercase text-foreground">{leg.waypoint}</span>
                                        <span className="text-[9px] font-mono text-muted-foreground">
                                            {leg.latitude?.toFixed(4)}, {leg.longitude?.toFixed(4)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm font-bold">{leg.altitude || '-'}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{leg.trueCourse?.toFixed(0)}°</TableCell>
                                <TableCell className="text-right font-mono text-sm font-black text-primary">{leg.magneticHeading?.toFixed(0)}°</TableCell>
                                <TableCell className="text-right font-mono text-sm">{leg.distance?.toFixed(1)} NM</TableCell>
                                <TableCell className="text-right font-mono text-sm">{leg.ete?.toFixed(0)} m</TableCell>
                                <TableCell className="text-right px-6 no-print">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveLeg(leg.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
