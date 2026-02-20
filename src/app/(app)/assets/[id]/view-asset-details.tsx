'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../page';
import { Badge } from '@/components/ui/badge';

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
            <div className='flex items-center gap-2'>
                {aircraft.type && <Badge>{aircraft.type}</Badge>}
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <DetailItem label="Frame Hours" value={aircraft.frameHours} />
        <DetailItem label="Engine Hours" value={aircraft.engineHours} />
        <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
        <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
        <DetailItem label="Tacho at next 50hr" value={aircraft.tachoAtNext50Inspection} />
        <DetailItem label="Tacho at next 100hr" value={aircraft.tachoAtNext100Inspection} />
      </CardContent>
    </Card>
  );
}
