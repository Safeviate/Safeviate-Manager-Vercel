
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Aircraft } from '../page';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';
import { SetServiceForm } from './set-service-form';
import { ServiceCountdown } from './service-countdown';

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
  const tenantId = 'safeviate'; // Hardcoded

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Aircraft Information</CardTitle>
                <CardDescription>Details for aircraft {aircraft.tailNumber}.</CardDescription>
            </div>
            <SetServiceForm tenantId={tenantId} aircraft={aircraft}>
                <Button variant="outline">
                    <Wrench className="mr-2 h-4 w-4" />
                    Set Service
                </Button>
            </SetServiceForm>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem label="Tail Number" value={aircraft.tailNumber} />
            <DetailItem label="Model" value={aircraft.model} />
            <DetailItem label="Type" value={aircraft.type} />
            <DetailItem label="Frame Hours" value={aircraft.frameHours} />
            <DetailItem label="Engine Hours" value={aircraft.engineHours} />
            <DetailItem label="Initial Hobbs" value={aircraft.initialHobbs} />
            <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
            <DetailItem label="Initial Tacho" value={aircraft.initialTacho} />
            <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
            <DetailItem label="Empty Weight (lbs)" value={aircraft.emptyWeight} />
            <DetailItem label="Empty Weight Moment" value={aircraft.emptyWeightMoment} />
            <div className="md:col-span-2 space-y-4">
              <ServiceCountdown label="Next 50hr Inspection" currentTacho={aircraft.currentTacho} tachoAtNextInspection={aircraft.tachoAtNext50Inspection} inspectionInterval={50} />
              <ServiceCountdown label="Next 100hr Inspection" currentTacho={aircraft.currentTacho} tachoAtNextInspection={aircraft.tachoAtNext100Inspection} inspectionInterval={100} />
            </div>
        </CardContent>
    </Card>
  );
}
