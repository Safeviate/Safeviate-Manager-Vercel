
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '../page';

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null, children?: React.ReactNode }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children ? <div className="text-base font-semibold">{children}</div> : <p className="text-base font-semibold">{value ?? 'N/A'}</p>}
    </div>
);

export function ViewAircraftDetails({ aircraft }: ViewAircraftDetailsProps) {
  if (!aircraft) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Aircraft Overview</CardTitle>
                <CardDescription>
                    Summary of the aircraft's details and current hours.
                </CardDescription>
            </div>
            <Badge variant="outline">{aircraft.type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
        <DetailItem label="Tail Number" value={aircraft.tailNumber} />
        <DetailItem label="Model" value={aircraft.model} />
        <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
        <DetailItem label="Frame Hours" value={`${aircraft.frameHours?.toFixed(1) || '0.0'} hrs`} />
        <DetailItem label="Engine Hours" value={`${aircraft.engineHours?.toFixed(1) || '0.0'} hrs`} />
        <DetailItem label="Current Hobbs" value={`${aircraft.currentHobbs?.toFixed(1) || '0.0'} hrs`} />
        <DetailItem label="Current Tacho" value={`${aircraft.currentTacho?.toFixed(1) || '0.0'} hrs`} />
        <DetailItem label="Next 50hr Inspection" value={`${aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'} tacho`} />
        <DetailItem label="Next 100hr Inspection" value={`${aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'} tacho`} />
      </CardContent>
    </Card>
  );
}
