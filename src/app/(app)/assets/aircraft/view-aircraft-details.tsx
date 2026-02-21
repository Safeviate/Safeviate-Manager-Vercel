'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import { Separator } from '@/components/ui/separator';

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="grid grid-cols-2 gap-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || 'N/A'}</p>
    </div>
);

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
}

export function ViewAircraftDetails({ aircraft }: ViewAircraftDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{aircraft.make} {aircraft.model}</CardTitle>
        <CardDescription>Tail Number: {aircraft.tailNumber}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailItem label="Make" value={aircraft.make} />
            <DetailItem label="Model" value={aircraft.model} />
            <DetailItem label="Tail Number" value={aircraft.tailNumber} />
            <DetailItem label="Type" value={aircraft.type} />
            <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
        </div>
        <Separator />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <h4 className="text-md font-semibold text-foreground col-span-full">Hour Tracking</h4>
            <DetailItem label="Frame Hours" value={aircraft.frameHours} />
            <DetailItem label="Engine Hours" value={aircraft.engineHours} />
            <DetailItem label="Initial Hobbs" value={aircraft.initialHobbs} />
            <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
            <DetailItem label="Initial Tacho" value={aircraft.initialTacho} />
            <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <h4 className="text-md font-semibold text-foreground col-span-full">Inspection Tracking</h4>
             <DetailItem label="Next 50hr Inspection (Tacho)" value={aircraft.tachoAtNext50Inspection} />
            <DetailItem label="Next 100hr Inspection (Tacho)" value={aircraft.tachoAtNext100Inspection} />
        </div>
      </CardContent>
    </Card>
  );
}
