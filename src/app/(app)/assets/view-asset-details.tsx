'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Aircraft } from "./page";

interface ViewAircraftDetailsProps {
    aircraft: Aircraft;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value ?? 'N/A'}</p>
    </div>
);

export function ViewAircraftDetails({ aircraft }: ViewAircraftDetailsProps) {

    const hoursToNext50 = aircraft.tachoAtNext50Inspection ? (aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)) : 0;
    const hoursToNext100 = aircraft.tachoAtNext100Inspection ? (aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)) : 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl">{aircraft.tailNumber}</CardTitle>
                        <CardDescription>{aircraft.model}</CardDescription>
                    </div>
                    {aircraft.type && <Badge>{aircraft.type}</Badge>}
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
                <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
                <DetailItem label="Frame Hours" value={aircraft.frameHours} />
                <DetailItem label="Engine Hours" value={aircraft.engineHours} />
                <DetailItem label="Current Hobbs" value={aircraft.currentHobbs ? `${aircraft.currentHobbs.toFixed(1)} hrs` : 'N/A'} />
                <DetailItem label="Current Tacho" value={aircraft.currentTacho ? `${aircraft.currentTacho.toFixed(1)} hrs` : 'N/A'} />
                <DetailItem label="Next 50hr Insp." value={`${Math.max(0, hoursToNext50).toFixed(1)} hrs`} />
                <DetailItem label="Next 100hr Insp." value={`${Math.max(0, hoursToNext100).toFixed(1)} hrs`} />
            </CardContent>
        </Card>
    );
}
