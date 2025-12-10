
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../page';

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
}

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value || 'N/A'}</p>
    </div>
);


export function ViewAircraftDetails({ aircraft }: ViewAircraftDetailsProps) {

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Aircraft Information</CardTitle>
                <CardDescription>Details for aircraft {aircraft.tailNumber}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem label="Tail Number" value={aircraft.tailNumber} />
                <DetailItem label="Model" value={aircraft.model} />
            </CardContent>
        </Card>
    </div>
  );
}
