
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ViewAircraftDetailsProps {
  aircraft: Aircraft | null;
  inspectionSettings: AircraftInspectionWarningSettings | null;
}

function getWarningStyle(hours: number | undefined, warnings: HourWarning[] | undefined): React.CSSProperties {
    if (hours === undefined || !warnings) {
        return {};
    }
    // Sort warnings from most urgent (lowest hours) to least urgent
    const sortedWarnings = [...warnings].sort((a, b) => a.hours - b.hours);

    for (const warning of sortedWarnings) {
        if (hours <= warning.hours) {
            return { color: warning.color, fontWeight: 'bold' };
        }
    }
    return {};
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    {children ? <div className="text-lg font-semibold">{children}</div> : <p className="text-lg font-semibold">{value ?? 'N/A'}</p>}
  </div>
);


export function ViewAircraftDetails({ aircraft, inspectionSettings }: ViewAircraftDetailsProps) {
    if (!aircraft) {
        return null;
    }
    const tachoTill50 = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : undefined;
    const tachoTill100 = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : undefined;

    const fiftyHourStyle = getWarningStyle(tachoTill50, inspectionSettings?.fiftyHourWarnings);
    const hundredHourStyle = getWarningStyle(tachoTill100, inspectionSettings?.oneHundredHourWarnings);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>{aircraft.make} {aircraft.model}</CardTitle>
                    <CardDescription>Tail Number: {aircraft.tailNumber}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <DetailItem label="Type" value={aircraft.type} />
                    <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
                    <DetailItem label="Frame Hours" value={aircraft.frameHours} />
                    <DetailItem label="Engine Hours" value={aircraft.engineHours} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tacho & Hobbs</CardTitle>
                    <CardDescription>Current meter readings and inspection status.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
                    <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
                    <DetailItem label="Next 50hr Insp. Due In">
                        <span style={fiftyHourStyle}>{tachoTill50?.toFixed(2) ?? 'N/A'} hours</span>
                    </DetailItem>
                    <DetailItem label="Next 100hr Insp. Due In">
                        <span style={hundredHourStyle}>{tachoTill100?.toFixed(2) ?? 'N/A'} hours</span>
                    </DetailItem>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Components</CardTitle>
                <CardDescription>Trackable components installed on the aircraft.</CardDescription>
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aircraft.components && aircraft.components.length > 0 ? (
                            aircraft.components.map(comp => (
                                <TableRow key={comp.id}>
                                    <TableCell>{comp.name}</TableCell>
                                    <TableCell>{comp.partNumber}</TableCell>
                                    <TableCell>{comp.serialNumber}</TableCell>
                                    <TableCell>{comp.tsn}</TableCell>
                                    <TableCell>{comp.tso}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No components tracked.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}

    