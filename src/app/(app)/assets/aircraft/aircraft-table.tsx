
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Aircraft } from '@/types/aircraft';
import { AircraftActions } from './aircraft-actions';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';

interface AircraftTableProps {
  data: Aircraft[];
  tenantId: string;
  inspectionSettings: AircraftInspectionWarningSettings | null;
}

const getWarningStyle = (remainingHours: number | undefined, warnings: HourWarning[] | undefined): React.CSSProperties => {
  if (remainingHours === undefined || !warnings || warnings.length === 0) {
    return {};
  }
  // Warnings should be sorted high to low for precedence
  const sortedWarnings = [...warnings].sort((a, b) => b.hours - a.hours);
  for (const warning of sortedWarnings) {
    if (remainingHours <= warning.hours) {
      return { backgroundColor: warning.color, color: warning.foregroundColor };
    }
  }
  return {};
};


export function AircraftTable({ data, tenantId, inspectionSettings }: AircraftTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Hobbs</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead>Next 50hr Insp.</TableHead>
          <TableHead>Next 100hr Insp.</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data && data.length > 0 ? (
          data.map((aircraft) => {
            const tachoTill50 = aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : undefined;
            const tachoTill100 = aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : undefined;
            
            const fiftyHourStyle = getWarningStyle(tachoTill50, inspectionSettings?.fiftyHourWarnings);
            const hundredHourStyle = getWarningStyle(tachoTill100, inspectionSettings?.oneHundredHourWarnings);

            return (
              <TableRow key={aircraft.id}>
                <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                <TableCell>{aircraft.model}</TableCell>
                <TableCell>{aircraft.currentHobbs?.toFixed(1) ?? 'N/A'}</TableCell>
                <TableCell>{aircraft.currentTacho?.toFixed(1) ?? 'N/A'}</TableCell>
                <TableCell>
                  {tachoTill50 !== undefined ? (
                    <Badge style={fiftyHourStyle}>{tachoTill50.toFixed(1)} hrs</Badge>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                   {tachoTill100 !== undefined ? (
                    <Badge style={hundredHourStyle}>{tachoTill100.toFixed(1)} hrs</Badge>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <AircraftActions aircraft={aircraft} tenantId={tenantId} />
                </TableCell>
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              No aircraft found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
