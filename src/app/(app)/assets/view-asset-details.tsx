'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Aircraft } from "./page";

interface ViewAircraftDetailsProps {
    aircraft: Aircraft;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value || 'N/A'}</p>
    </div>
);

export function ViewAircraftDetails({ aircraft }: ViewAircraftDetailsProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{aircraft.tailNumber}</CardTitle>
                        <CardDescription>{aircraft.model}</CardDescription>
                    </div>
                    <Badge>{aircraft.type}</Badge>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
                <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
                <DetailItem label="Frame Hours" value={aircraft.frameHours} />
                <DetailItem label="Engine Hours" value={aircraft.engineHours} />
                <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
                <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
                <DetailItem label="Next 50hr Insp." value={`${aircraft.tachoAtNext50Inspection || 0} hrs`} />
                <DetailItem label="Next 100hr Insp." value={`${aircraft.tachoAtNext100Inspection || 0} hrs`} />
            </CardContent>
        </Card>
    );
}
