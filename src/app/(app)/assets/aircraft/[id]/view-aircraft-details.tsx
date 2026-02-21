
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ViewAircraftDetailsProps {
    aircraft: Aircraft;
    inspectionWarningSettings: AircraftInspectionWarningSettings | null;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value || 'N/A'}</p>
    </div>
);

const getWarningBadgeStyle = (remainingHours: number, warnings: HourWarning[]): React.CSSProperties => {
    if (!warnings || warnings.length === 0) return {};

    const applicableWarning = warnings
        .sort((a, b) => b.hours - a.hours) // Sort descending to find the highest threshold met
        .find(w => remainingHours <= w.hours);

    if (applicableWarning) {
        return {
            backgroundColor: applicableWarning.color,
            color: applicableWarning.foregroundColor,
        };
    }

    return {};
};


export function ViewAircraftDetails({ aircraft, inspectionWarningSettings }: ViewAircraftDetailsProps) {

  const hoursTo50hr = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : null;
  const hoursTo100hr = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : null;
  
  const badgeStyle50hr = hoursTo50hr !== null ? getWarningBadgeStyle(hoursTo50hr, inspectionWarningSettings?.fiftyHourWarnings || []) : {};
  const badgeStyle100hr = hoursTo100hr !== null ? getWarningBadgeStyle(hoursTo100hr, inspectionWarningSettings?.oneHundredHourWarnings || []) : {};


  return (
    <Card>
      <CardHeader>
        <CardTitle>Aircraft Details</CardTitle>
        <CardDescription>
          Viewing details for {aircraft.make} {aircraft.model} - {aircraft.tailNumber}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DetailItem label="Make" value={aircraft.make} />
            <DetailItem label="Model" value={aircraft.model} />
            <DetailItem label="Tail Number" value={aircraft.tailNumber} />
            <DetailItem label="Type" value={aircraft.type} />
            <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem label="Frame Hours" value={aircraft.frameHours} />
            <DetailItem label="Engine Hours" value={aircraft.engineHours} />
            <DetailItem label="Initial Hobbs Hours" value={aircraft.initialHobbs} />
            <DetailItem label="Current Hobbs Hours" value={aircraft.currentHobbs} />
            <DetailItem label="Initial Tacho Hours" value={aircraft.initialTacho} />
            <DetailItem label="Current Tacho Hours" value={aircraft.currentTacho} />
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tacho at Next 50hr Inspection</p>
              <div className="flex items-center gap-2">
                <p className="text-base">{aircraft.tachoAtNext50Inspection || 'N/A'}</p>
                {hoursTo50hr !== null && hoursTo50hr > 0 && (
                  <Badge style={badgeStyle50hr}>{hoursTo50hr.toFixed(1)} hrs remaining</Badge>
                )}
                {hoursTo50hr !== null && hoursTo50hr <= 0 && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
              </div>
            </div>
             <div>
              <p className="text-sm font-medium text-muted-foreground">Tacho at Next 100hr Inspection</p>
              <div className="flex items-center gap-2">
                <p className="text-base">{aircraft.tachoAtNext100Inspection || 'N/A'}</p>
                {hoursTo100hr !== null && hoursTo100hr > 0 && (
                  <Badge style={badgeStyle100hr}>{hoursTo100hr.toFixed(1)} hrs remaining</Badge>
                )}
                 {hoursTo100hr !== null && hoursTo100hr <= 0 && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
              </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

