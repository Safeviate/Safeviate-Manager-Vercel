'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Aircraft } from '../page';

interface AircraftOverviewProps {
    aircraft: Aircraft;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value ?? 'N/A'}</p>
    </div>
);

export function AircraftOverview({ aircraft }: AircraftOverviewProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{aircraft.tailNumber}</CardTitle>
                <CardDescription>{aircraft.model}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <DetailItem label="Type" value={aircraft.type} />
                <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
                <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1)} />
                <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toFixed(1)} />
            </CardContent>
        </Card>
    );
}
