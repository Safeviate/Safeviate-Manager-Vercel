'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Navigation, Wind, MapPin, Clock, Save, ChevronRight, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Booking, NavlogLeg, Navlog } from '@/types/booking';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { calculateWindTriangle, calculateEte } from '@/lib/e6b';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NavlogBuilderProps {
    booking: Booking;
    tenantId: string;
}

const HeaderWithTooltip = ({ label, tooltip, highlight = false }: { label: string, tooltip: string, highlight?: boolean }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <div className={cn("flex items-center justify-center gap-1 cursor-help", highlight && "text-primary")}>
                {label}
                <Info className="h-2 w-2 opacity-50" />
            </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-[10px]">
            <p>{tooltip}</p>
        </TooltipContent>
    </Tooltip>
);

export function NavlogBuilder({ booking, tenantId }: NavlogBuilderProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [legs, setLegs] = useState<NavlogLeg[]>(booking.navlog?.legs || []);
    const [departure, setDeparture] = useState(booking.navlog?.departureIcao || '');
    const [arrival, setArrival] = useState(booking.navlog?.arrivalIcao || '');

    const isReadOnly = booking.status === 'Completed';

    const handleAddLeg = () => {
        const newLeg: NavlogLeg = {
            id: uuidv4(),
            waypoint: '',
            trueAirspeed: 100, // Reasonable default
            variation: 0,
        };
        setLegs([...legs, newLeg]);
    };

    const handleRemoveLeg = (id: string) => {
        setLegs(legs.filter(l => l.id !== id));
    };

    const handleLegChange = (id: string, field: keyof NavlogLeg, value: string | number) => {
        const updatedLegs = legs.map(leg => {
            if (leg.id !== id) return leg;
            
            const updatedLeg = { ...leg, [field]: value };
            
            // Recalculate if we have the necessary wind triangle components
            if (
                updatedLeg.trueCourse !== undefined &&
                updatedLeg.trueAirspeed !== undefined &&
                updatedLeg.windDirection !== undefined &&
                updatedLeg.windSpeed !== undefined
            ) {
                const result = calculateWindTriangle({
                    trueCourse: Number(updatedLeg.trueCourse),
                    trueAirspeed: Number(updatedLeg.trueAirspeed),
                    windDirection: Number(updatedLeg.windDirection),
                    windSpeed: Number(updatedLeg.windSpeed),
                });

                updatedLeg.wca = parseFloat(result.windCorrectionAngle.toFixed(1));
                updatedLeg.trueHeading = parseFloat(result.heading.toFixed(1));
                updatedLeg.groundSpeed = parseFloat(result.groundSpeed.toFixed(1));
                
                if (updatedLeg.variation !== undefined) {
                    updatedLeg.magneticHeading = (updatedLeg.trueHeading + Number(updatedLeg.variation) + 360) % 360;
                }

                if (updatedLeg.distance !== undefined && updatedLeg.groundSpeed > 0) {
                    updatedLeg.ete = parseFloat(calculateEte(Number(updatedLeg.distance), updatedLeg.groundSpeed).toFixed(1));
                }
            }

            return updatedLeg;
        });
        setLegs(updatedLegs);
    };

    const handleSave = () => {
        if (!firestore) return;
        
        const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, booking.id);
        const navlog: Navlog = {
            legs,
            departureIcao: departure,
            arrivalIcao: arrival,
        };

        updateDocumentNonBlocking(bookingRef, { navlog });
        toast({ title: 'Navlog Saved', description: 'Flight planning data has been updated.' });
    };

    return (
        <TooltipProvider>
            <Card className="flex flex-col h-full overflow-hidden shadow-none border">
                <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Navigation className="h-5 w-5 text-primary" />
                            Navigation Log (Navlog)
                        </CardTitle>
                        <CardDescription>Plan legs and calculate headings/time burn.</CardDescription>
                    </div>
                    {!isReadOnly && (
                        <Button size="sm" onClick={handleSave} className="gap-2">
                            <Save className="h-4 w-4" /> Save Plan
                        </Button>
                    )}
                </CardHeader>
                <div className="p-4 border-b bg-muted/10 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Departure ICAO</label>
                        <Input 
                            placeholder="e.g., FACT" 
                            value={departure} 
                            onChange={(e) => setDeparture(e.target.value.toUpperCase())}
                            disabled={isReadOnly}
                            className="h-8 uppercase font-mono"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Arrival ICAO</label>
                        <Input 
                            placeholder="e.g., FASH" 
                            value={arrival} 
                            onChange={(e) => setArrival(e.target.value.toUpperCase())}
                            disabled={isReadOnly}
                            className="h-8 uppercase font-mono"
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead className="w-32 text-[10px] uppercase font-bold">Waypoint</TableHead>
                                <TableHead className="w-20 text-[10px] uppercase font-bold text-center">Alt</TableHead>
                                <TableHead className="w-24 text-[10px] uppercase font-bold text-center">Wind (Dir/Vel)</TableHead>
                                <TableHead className="w-16 text-[10px] uppercase font-bold text-center">
                                    <HeaderWithTooltip label="TAS" tooltip="True Airspeed: The speed of the aircraft relative to the air it's flying through." />
                                </TableHead>
                                <TableHead className="w-16 text-[10px] uppercase font-bold text-center">
                                    <HeaderWithTooltip label="Track" tooltip="Track: The intended path over the ground relative to True North (True Course)." />
                                </TableHead>
                                <TableHead className="w-16 text-[10px] uppercase font-bold text-center text-primary">
                                    <HeaderWithTooltip highlight label="WCA" tooltip="Wind Correction Angle: Degrees to point the nose into the wind to stay on course." />
                                </TableHead>
                                <TableHead className="w-16 text-[10px] uppercase font-bold text-center text-primary">
                                    <HeaderWithTooltip highlight label="MH" tooltip="Magnetic Heading: The direction to point the nose relative to Magnetic North (Compass)." />
                                </TableHead>
                                <TableHead className="w-16 text-[10px] uppercase font-bold text-center">Dist</TableHead>
                                <TableHead className="w-16 text-[10px] uppercase font-bold text-center text-primary">
                                    <HeaderWithTooltip highlight label="GS" tooltip="Ground Speed: The actual speed of the aircraft over the ground after wind effects." />
                                </TableHead>
                                <TableHead className="w-16 text-[10px] uppercase font-bold text-center text-primary">
                                    <HeaderWithTooltip highlight label="ETE" tooltip="Estimated Time En-route: How long this leg will take in minutes." />
                                </TableHead>
                                <TableHead className="w-16 text-[10px] uppercase font-bold text-center">
                                    <HeaderWithTooltip label="ATA" tooltip="Actual Time of Arrival: The real time you reached this waypoint." />
                                </TableHead>
                                {!isReadOnly && <TableHead className="w-10"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {legs.map((leg, index) => (
                                <TableRow key={leg.id} className="group">
                                    <TableCell className="p-2 text-center text-[10px] font-bold text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="p-1">
                                        <Input 
                                            placeholder="..." 
                                            value={leg.waypoint} 
                                            onChange={(e) => handleLegChange(leg.id, 'waypoint', e.target.value)}
                                            disabled={isReadOnly}
                                            className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1 text-center">
                                        <Input 
                                            type="number" 
                                            placeholder="Alt" 
                                            value={leg.altitude || ''} 
                                            onChange={(e) => handleLegChange(leg.id, 'altitude', Number(e.target.value))}
                                            disabled={isReadOnly}
                                            className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-center"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <div className="flex gap-1 justify-center">
                                            <Input 
                                                type="number" 
                                                placeholder="Dir" 
                                                value={leg.windDirection || ''} 
                                                onChange={(e) => handleLegChange(leg.id, 'windDirection', Number(e.target.value))}
                                                disabled={isReadOnly}
                                                className="h-7 w-10 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-right p-1"
                                            />
                                            <span className="pt-1.5 opacity-30">/</span>
                                            <Input 
                                                type="number" 
                                                placeholder="Vel" 
                                                value={leg.windSpeed || ''} 
                                                onChange={(e) => handleLegChange(leg.id, 'windSpeed', Number(e.target.value))}
                                                disabled={isReadOnly}
                                                className="h-7 w-8 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-left p-1"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-1 text-center">
                                        <Input 
                                            type="number" 
                                            value={leg.trueAirspeed || ''} 
                                            onChange={(e) => handleLegChange(leg.id, 'trueAirspeed', Number(e.target.value))}
                                            disabled={isReadOnly}
                                            className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-center"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1 text-center">
                                        <Input 
                                            type="number" 
                                            value={leg.trueCourse || ''} 
                                            onChange={(e) => handleLegChange(leg.id, 'trueCourse', Number(e.target.value))}
                                            disabled={isReadOnly}
                                            className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-center"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1 text-center font-mono font-bold text-primary text-xs">
                                        {leg.wca || '-'}
                                    </TableCell>
                                    <TableCell className="p-1 text-center font-mono font-bold text-primary text-xs">
                                        {leg.magneticHeading !== undefined ? Math.round(leg.magneticHeading).toString().padStart(3, '0') : '-'}
                                    </TableCell>
                                    <TableCell className="p-1 text-center">
                                        <Input 
                                            type="number" 
                                            value={leg.distance || ''} 
                                            onChange={(e) => handleLegChange(leg.id, 'distance', Number(e.target.value))}
                                            disabled={isReadOnly}
                                            className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-center"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1 text-center font-mono font-bold text-primary text-xs">
                                        {leg.groundSpeed || '-'}
                                    </TableCell>
                                    <TableCell className="p-1 text-center font-mono font-bold text-primary text-xs">
                                        {leg.ete || '-'}
                                    </TableCell>
                                    <TableCell className="p-1 text-center">
                                        <Input 
                                            placeholder="Time" 
                                            value={leg.ata || ''} 
                                            onChange={(e) => handleLegChange(leg.id, 'ata', e.target.value)}
                                            disabled={isReadOnly}
                                            className="h-7 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-center"
                                        />
                                    </TableCell>
                                    {!isReadOnly && (
                                        <TableCell className="p-1 text-center">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveLeg(leg.id)}
                                                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {legs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={13} className="h-32 text-center text-muted-foreground italic">
                                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        No legs defined. Add your first checkpoint to start planning.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {!isReadOnly && (
                        <div className="p-4 flex justify-start">
                            <Button variant="outline" size="sm" onClick={handleAddLeg} className="gap-2">
                                <Plus className="h-4 w-4" /> Add Leg
                            </Button>
                        </div>
                    )}
                </ScrollArea>
            </Card>
        </TooltipProvider>
    );
}
