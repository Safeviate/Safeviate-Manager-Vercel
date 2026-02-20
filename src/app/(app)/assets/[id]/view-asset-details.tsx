'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Aircraft } from '../../page';

interface DetailItemProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

const DetailItem = ({ label, value, unit }: DetailItemProps) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-base">{value ?? 'N/A'} {value && unit}</p>
  </div>
);

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
}

export function ViewAircraftDetails({ aircraft }: ViewAircraftDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{aircraft.tailNumber}</CardTitle>
                <CardDescription>{aircraft.model}</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DetailItem label="Aircraft Type" value={aircraft.type} />
          <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
          <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} unit="hrs" />
          <DetailItem label="Current Tacho" value={aircraft.currentTacho} unit="hrs" />
          <DetailItem label="Next 50hr Insp." value={aircraft.tachoAtNext50Inspection} unit="tacho" />
          <DetailItem label="Next 100hr Insp." value={aircraft.tachoAtNext100Inspection} unit="tacho" />
        </div>
      </CardContent>
    </Card>
  );
}
