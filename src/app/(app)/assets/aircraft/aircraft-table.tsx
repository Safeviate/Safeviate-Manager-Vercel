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
import { Badge } from '@/components/ui/badge';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';
import { cn } from '@/lib/utils';

interface AircraftTableProps {
  data: Aircraft[];
  onEdit: (aircraft: Aircraft) => void;
  inspectionSettings: AircraftInspectionWarningSettings | null;
}

const getTachoWarningStyle = (
  currentTacho: number | undefined,
  nextInspectionTacho: number | undefined,
  warnings: HourWarning[] | undefined
) => {
  if (currentTacho === undefined || nextInspectionTacho === undefined || !warnings) {
    return {};
  }

  const hoursRemaining = nextInspectionTacho - currentTacho;

  const applicableWarning = warnings
    .filter(w => hoursRemaining <= w.hours)
    .sort((a, b) => a.hours - b.hours)[0];

  if (applicableWarning) {
    return { color: applicableWarning.color };
  }

  return {};
};


export function AircraftTable({ data, onEdit, inspectionSettings }: AircraftTableProps) {
  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No aircraft found.
        </div>
    );
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead>Next 50hr Insp.</TableHead>
          <TableHead>Next 100hr Insp.</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => {
            const fiftyHourStyle = getTachoWarningStyle(aircraft.currentTacho, aircraft.tachoAtNext50Inspection, inspectionSettings?.fiftyHourWarnings);
            const hundredHourStyle = getTachoWarningStyle(aircraft.currentTacho, aircraft.tachoAtNext100Inspection, inspectionSettings?.oneHundredHourWarnings);

            return (
              <TableRow key={aircraft.id}>
                <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                <TableCell>{aircraft.type}</TableCell>
                <TableCell>{aircraft.model}</TableCell>
                <TableCell>{aircraft.currentTacho?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell style={fiftyHourStyle} className="font-medium">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell style={hundredHourStyle} className="font-medium">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <AircraftActions aircraft={aircraft} onEdit={() => onEdit(aircraft)} />
                </TableCell>
              </TableRow>
            )
        })}
      </TableBody>
    </Table>
  );
}
