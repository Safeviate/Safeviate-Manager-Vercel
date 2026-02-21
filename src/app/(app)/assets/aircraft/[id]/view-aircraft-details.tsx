
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { format } from 'date-fns';

interface ViewAircraftDetailsProps {
  aircraft: Aircraft;
  inspectionSettings: AircraftInspectionWarningSettings | null;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value || 'N/A'}</p>
    </div>
);

const getWarningStyle = (hours: number | undefined, warnings: AircraftInspectionWarningSettings['fiftyHourWarnings'] | undefined) => {
    if (hours === undefined || !warnings || warnings.length === 0) {
        return {};
    }
    // Sort warnings from most urgent (lowest hours) to least urgent
    const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);

    for (const warning of sortedWarnings) {
        if (hours <= warning.hours) {
            return { backgroundColor: warning.color, color: warning.foregroundColor };
        }
    }

    return {};
};

export function ViewAircraftDetails({ aircraft, inspectionSettings }: ViewAircraftDetailsProps) {
    const tachoTill50 = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : undefined;
    const tachoTill100 = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : undefined;

    const fiftyHourStyle = getWarningStyle(tachoTill50, inspectionSettings?.fiftyHourWarnings);
    const hundredHourStyle = getWarningStyle(tachoTill100, inspectionSettings?.oneHundredHourWarnings);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{aircraft.make} {aircraft.model}</CardTitle>
                            <CardDescription>Tail Number: {aircraft.tailNumber}</CardDescription>
                        </div>
                         <Badge variant="secondary">{aircraft.type}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
                    <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1)} />
                    <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toFixed(1)} />
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Next 50hr Insp. Due In</p>
                        <Badge style={fiftyHourStyle} className="mt-1 text-base">{tachoTill50 !== undefined ? tachoTill50.toFixed(1) + ' hrs' : 'N/A'}</Badge>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Next 100hr Insp. Due In</p>
                        <Badge style={hundredHourStyle} className="mt-1 text-base">{tachoTill100 !== undefined ? tachoTill100.toFixed(1) + ' hrs' : 'N/A'}</Badge>
                    </div>
                </CardContent>
            </Card>

            {(aircraft.components && aircraft.components.length > 0) && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Tracked Components</CardTitle>
                        <CardDescription>A list of all time-lifed components installed on this aircraft.</CardDescription>
                    </CardHeader>
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
                                {aircraft.components.map(comp => {
                                    const hoursSinceInstall = (aircraft.currentTacho || 0) - comp.installHours;
                                    const hoursRemaining = comp.maxHours ? comp.maxHours - hoursSinceInstall : undefined;

                                    return (
                                        <TableRow key={comp.id}>
                                            <TableCell className="font-medium">{comp.name}</TableCell>
                                            <TableCell>{comp.partNumber}</TableCell>
                                            <TableCell>{comp.serialNumber}</TableCell>
                                            <TableCell>{comp.tsn?.toFixed(1)}</TableCell>
                                            <TableCell>{comp.tso?.toFixed(1)}</TableCell>
                                            <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell>{hoursRemaining?.toFixed(1) ?? 'N/A'}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
