
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../page';

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value?.toString() || 'N/A'}</p>
    </div>
);


export function ViewAircraftDetails({ aircraft }: ViewAircraftDetailsProps) {

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Aircraft Information</CardTitle>
                <CardDescription>Details for aircraft {aircraft.tailNumber}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem label="Tail Number" value={aircraft.tailNumber} />
                <DetailItem label="Model" value={aircraft.model} />
                <DetailItem label="Type" value={aircraft.type} />
                <DetailItem label="Frame Hours" value={aircraft.frameHours} />
                <DetailItem label="Engine Hours" value={aircraft.engineHours} />
                <DetailItem label="Hobbs" value={aircraft.hobbs} />
                <DetailItem label="Tacho" value={aircraft.tacho} />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Manage documents for {aircraft.tailNumber}.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">Document management coming soon.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
