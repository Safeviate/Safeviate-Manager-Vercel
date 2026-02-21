'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
  inspectionSettings: AircraftInspectionWarningSettings | null;
}

function getWarningStyle(hoursRemaining: number | undefined, warnings: HourWarning[] | undefined): React.CSSProperties | undefined {
    if (hoursRemaining === undefined || !warnings || warnings.length === 0) {
        return undefined;
    }

    // Sort from lowest hours to highest to find the correct warning bucket.
    const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);

    for (const warning of sortedWarnings) {
        // If remaining hours are less than or equal to the threshold, we've found our match.
        if (hoursRemaining <= warning.hours) {
            return { backgroundColor: warning.color, color: warning.foregroundColor };
        }
    }
    
    // If no threshold is met, return no style.
    return undefined;
}


const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value ?? 'N/A'}</p>
    </div>
);

export function ViewAircraftDetails({ aircraft, inspectionSettings }: ViewAircraftDetailsProps) {
    if (!aircraft) {
        return null; // Or a loading/error state
    }
    
    const tachoTill50 = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : undefined;
    const tachoTill100 = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : undefined;

    const fiftyHourStyle = getWarningStyle(tachoTill50, inspectionSettings?.fiftyHourWarnings);
    const hundredHourStyle = getWarningStyle(tachoTill100, inspectionSettings?.oneHundredHourWarnings);

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>{aircraft.make} {aircraft.model} - {aircraft.tailNumber}</CardTitle>
                <CardDescription>Detailed information and status for the aircraft.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <DetailItem label="Aircraft Type" value={aircraft.type} />
                <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1)} />
                <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toFixed(1)} />
                <DetailItem label="Frame Hours" value={aircraft.frameHours?.toFixed(1)} />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Inspection Status</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Next 50hr Insp. Due In</p>
                    {tachoTill50 !== undefined ? (
                        <Badge style={fiftyHourStyle} className="mt-1 text-base">{tachoTill50.toFixed(1)} hrs</Badge>
                    ) : <p className="text-base">N/A</p>}
                </div>
                 <div>
                    <p className="text-sm font-medium text-muted-foreground">Next 100hr Insp. Due In</p>
                    {tachoTill100 !== undefined ? (
                        <Badge style={hundredHourStyle} className="mt-1 text-base">{tachoTill100.toFixed(1)} hrs</Badge>
                    ) : <p className="text-base">N/A</p>}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Tracked Components</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Part No.</TableHead>
                            <TableHead>Serial No.</TableHead>
                            <TableHead>TSN</TableHead>
                            <TableHead>TSO</TableHead>
                            <TableHead>Install Date</TableHead>
                            <TableHead>Hours Remaining</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aircraft.components && aircraft.components.length > 0 ? (
                            aircraft.components.map(comp => {
                                const hoursUsed = (aircraft.currentTacho || 0) - comp.installHours;
                                const hoursRemaining = comp.maxHours ? comp.maxHours - hoursUsed : undefined;
                                return (
                                <TableRow key={comp.id}>
                                    <TableCell className="font-medium">{comp.name}</TableCell>
                                    <TableCell>{comp.partNumber}</TableCell>
                                    <TableCell>{comp.serialNumber}</TableCell>
                                    <TableCell>{comp.tsn?.toFixed(1)}</TableCell>
                                    <TableCell>{comp.tso?.toFixed(1)}</TableCell>
                                    <TableCell>{format(new Date(comp.installDate), 'PPP')}</TableCell>
                                    <TableCell>{hoursRemaining?.toFixed(1) ?? 'N/A'}</TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">No tracked components on this aircraft.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
