
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Aircraft } from '../page';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Aircraft Overview</CardTitle>
            <CardDescription>
              Basic details and specifications for {aircraft.tailNumber}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DetailItem label="Tail Number" value={aircraft.tailNumber} />
            <DetailItem label="Model" value={aircraft.model} />
            <DetailItem label="Type" value={aircraft.type} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <CardTitle>Hours &amp; Inspections</CardTitle>
            <CardDescription>Current Hobbs, Tacho, and upcoming inspection intervals.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <DetailItem label="Current Hobbs" value={`${aircraft.currentHobbs || 0} hrs`} />
            <DetailItem label="Current Tacho" value={`${aircraft.currentTacho || 0} hrs`} />
            <DetailItem label="Next 50hr Insp." value={`${aircraft.tachoAtNext50Inspection || 'N/A'} hrs`} />
            <DetailItem label="Next 100hr Insp." value={`${aircraft.tachoAtNext100Inspection || 'N/A'} hrs`} />
        </CardContent>
      </Card>
    </div>
  );
}
