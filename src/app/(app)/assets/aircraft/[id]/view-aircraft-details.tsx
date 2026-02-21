
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { cn } from '@/lib/utils';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';

interface ViewAircraftDetailsProps {
  user: Aircraft;
  inspectionSettings: AircraftInspectionWarningSettings | null;
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | null, children?: React.ReactNode }) => (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children ? children : <p className="text-lg font-semibold">{value || 'N/A'}</p>}
    </div>
);

const getWarningStyle = (remainingHours: number | undefined, warnings: HourWarning[] | undefined): React.CSSProperties => {
  if (remainingHours === undefined || !warnings || warnings.length === 0) {
    return {};
  }
  const sortedWarnings = [...warnings].sort((a, b) => b.hours - a.hours);
  for (const warning of sortedWarnings) {
    if (remainingHours <= warning.hours) {
      return { backgroundColor: warning.color, color: warning.foregroundColor };
    }
  }
  return {};
};


export function ViewAircraftDetails({ user, inspectionSettings }: ViewAircraftDetailsProps) {
    const tachoTill50 = user.tachoAtNext50Inspection ? user.tachoAtNext50Inspection - (user.currentTacho || 0) : undefined;
    const tachoTill100 = user.tachoAtNext100Inspection ? user.tachoAtNext100Inspection - (user.currentTacho || 0) : undefined;

    const fiftyHourStyle = getWarningStyle(tachoTill50, inspectionSettings?.fiftyHourWarnings);
    const hundredHourStyle = getWarningStyle(tachoTill100, inspectionSettings?.oneHundredHourWarnings);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{user.make} {user.model}</CardTitle>
                <CardDescription>Tail Number: {user.tailNumber}</CardDescription>
            </div>
            <Badge>{user.type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
        <DetailItem label="Make" value={user.make} />
        <DetailItem label="Model" value={user.model} />
        <DetailItem label="Frame Hours" value={user.frameHours?.toString()} />
        <DetailItem label="Engine Hours" value={user.engineHours?.toString()} />
        <DetailItem label="Current Hobbs" value={user.currentHobbs?.toFixed(1)} />
        <DetailItem label="Current Tacho" value={user.currentTacho?.toFixed(1)} />
        
        <DetailItem label="Next 50hr Insp. Due In">
             {tachoTill50 !== undefined ? (
                <Badge style={fiftyHourStyle} className="text-lg">{tachoTill50.toFixed(1)} hrs</Badge>
              ) : (
                <p className="text-lg font-semibold">N/A</p>
              )}
        </DetailItem>

        <DetailItem label="Next 100hr Insp. Due In">
            {tachoTill100 !== undefined ? (
                <Badge style={hundredHourStyle} className="text-lg">{tachoTill100.toFixed(1)} hrs</Badge>
              ) : (
                <p className="text-lg font-semibold">N/A</p>
              )}
        </DetailItem>
      </CardContent>
    </Card>
  );
}
