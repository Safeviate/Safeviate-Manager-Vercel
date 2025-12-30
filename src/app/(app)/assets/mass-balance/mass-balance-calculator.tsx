
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, PlusCircle, Trash2, Weight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FUEL_WEIGHT_PER_GALLON } from '@/lib/constants';
import type { Aircraft, Station } from '@/types/aircraft';
import { MassBalanceChart } from './mass-balance-chart';
import { cn, isPointInPolygon } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Booking } from '@/types/booking';

interface MassBalanceCalculatorProps {
  aircraftProfile: Aircraft;
}

export function MassBalanceCalculator({ aircraftProfile }: MassBalanceCalculatorProps) {
    const { toast } = useToast();
    const [stations, setStations] = useState<Station[]>([]);

    useEffect(() => {
        // Initialize stations from the profile when it's loaded
        const initialStations = aircraftProfile?.stations?.map(s => ({
            ...s,
            weight: s.type === 'fuel' ? (s.gallons || 0) * FUEL_WEIGHT_PER_GALLON : (s.weight || 0),
        })) || [];
        setStations(initialStations);
    }, [aircraftProfile]);

    const handleWeightChange = (stationId: number, newWeight: number) => {
        setStations(prevStations =>
            prevStations.map(station =>
                station.id === stationId ? { ...station, weight: newWeight } : station
            )
        );
    };

    const handleGallonsChange = (stationId: number, newGallons: number) => {
        setStations(prevStations =>
            prevStations.map(station =>
                station.id === stationId ? { ...station, gallons: newGallons, weight: newGallons * FUEL_WEIGHT_PER_GALLON } : station
            )
        );
    };

    const { totalWeight, totalMoment, centerOfGravity, isWeightOk, isCGInEnvelope } = useMemo(() => {
        const emptyWeight = aircraftProfile?.emptyWeight || 0;
        const emptyWeightMoment = aircraftProfile?.emptyWeightMoment || 0;

        const currentTotalWeight = stations.reduce((acc, station) => acc + station.weight, emptyWeight);
        const currentTotalMoment = stations.reduce((acc, station) => acc + (station.weight * station.arm), emptyWeightMoment);
        
        const cg = currentTotalWeight > 0 ? currentTotalMoment / currentTotalWeight : 0;
        
        const envelopePoints = (aircraftProfile.cgEnvelope || []).map(p => ({ x: p.cg, y: p.weight }));
        const isCGInEnvelope = isPointInPolygon({ x: cg, y: currentTotalWeight }, envelopePoints);
        
        const isWeightOk = currentTotalWeight <= (aircraftProfile.maxTakeoffWeight || Infinity);
        
        return {
            totalWeight: currentTotalWeight,
            totalMoment: currentTotalMoment,
            centerOfGravity: cg,
            isWeightOk,
            isCGInEnvelope,
        };
    }, [stations, aircraftProfile]);

    const calculatedCg = { x: centerOfGravity, y: totalWeight };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // This is for saving the profile as a template, not saving to a booking
        toast({ title: "Template Saved", description: "Mass & Balance profile saved as a template." });
    };

    if (!aircraftProfile) {
        return <p>Loading aircraft data...</p>;
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Loading Stations</CardTitle>
                        <CardDescription>Enter weights for each station.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/50">
                            <h4 className="font-semibold">{aircraftProfile.model} - {aircraftProfile.tailNumber}</h4>
                            <p className="text-sm text-muted-foreground">Empty Weight: {aircraftProfile.emptyWeight?.toFixed(2)} lbs</p>
                            <p className="text-sm text-muted-foreground">Empty Moment: {aircraftProfile.emptyWeightMoment?.toFixed(2)} lbs-in</p>
                        </div>
                        {stations.map(station => (
                            <div key={station.id} className="space-y-2 p-3 border rounded-md">
                                <Label htmlFor={`station-${station.id}`}>{station.name}</Label>
                                {station.type === 'fuel' ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`station-${station.id}-gallons`}
                                            type="number"
                                            value={station.gallons || 0}
                                            onChange={(e) => handleGallonsChange(station.id, parseFloat(e.target.value) || 0)}
                                            className="w-1/2"
                                        />
                                        <span className="text-sm text-muted-foreground">gal</span>
                                        <Input
                                            id={`station-${station.id}-weight`}
                                            type="number"
                                            value={station.weight.toFixed(2)}
                                            readOnly
                                            className="w-1/2 bg-muted/50"
                                        />
                                        <span className="text-sm text-muted-foreground">lbs</span>
                                    </div>
                                ) : (
                                    <Input
                                        id={`station-${station.id}`}
                                        type="number"
                                        value={station.weight || ''}
                                        onChange={(e) => handleWeightChange(station.id, parseFloat(e.target.value) || 0)}
                                        placeholder="Weight (lbs)"
                                    />
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>CG Envelope</CardTitle>
                            <CardDescription>Center of Gravity operational envelope.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-96">
                            <MassBalanceChart profile={aircraftProfile} calculatedCg={calculatedCg} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={cn("p-4 rounded-lg border", !isWeightOk ? "bg-destructive text-destructive-foreground" : "bg-muted")}>
                                <h4 className="font-semibold text-sm">Total Weight</h4>
                                <p className="text-2xl font-bold">{totalWeight.toFixed(2)} lbs</p>
                                <p className="text-xs text-muted-foreground">Max: {aircraftProfile.maxTakeoffWeight?.toFixed(2)} lbs</p>
                            </div>
                             <div className={cn("p-4 rounded-lg border", !isCGInEnvelope ? "bg-destructive text-destructive-foreground" : "bg-muted")}>
                                <h4 className="font-semibold text-sm">Center of Gravity</h4>
                                <p className="text-2xl font-bold">{centerOfGravity.toFixed(2)} in</p>
                            </div>
                             <div className="p-4 rounded-lg border bg-muted">
                                <h4 className="font-semibold text-sm">Total Moment</h4>
                                <p className="text-2xl font-bold">{totalMoment.toFixed(2)} lbs-in</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <CardFooter className="flex justify-between mt-6">
                <div>
                    {/* Template management can go here */}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline">Save to Booking</Button>
                    <Button type="submit">Save as Template</Button>
                </div>
            </CardFooter>
        </form>
    );
}
