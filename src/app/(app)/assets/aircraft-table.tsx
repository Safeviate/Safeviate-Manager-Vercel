
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
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { getInspectionBadgeStyle } from './utils';

interface AircraftTableProps {
  aircrafts: Aircraft[];
  inspectionSettings: AircraftInspectionWarningSettings | null;
  onEditClick: (aircraft: Aircraft) => void;
}

export function AircraftTable({ aircrafts, inspectionSettings, onEditClick }: AircraftTableProps) {
  if (aircrafts.length === 0) {
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
          <TableHead>Model</TableHead>
          <TableHead>Hobbs</TableHead>
          <TableHead>Tacho</TableHead>
          <TableHead>Next 50hr</TableHead>
          <TableHead>Next 100hr</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircrafts.map((aircraft) => {
          const fiftyHrStyle = getInspectionBadgeStyle(aircraft, '50hr', inspectionSettings);
          const hundredHrStyle = getInspectionBadgeStyle(aircraft, '100hr', inspectionSettings);
          const next50 =
            aircraft.tachoAtNext50Inspection !== undefined && aircraft.currentTacho !== undefined
              ? (aircraft.tachoAtNext50Inspection - aircraft.currentTacho).toFixed(1)
              : 'N/A';
          const next100 =
            aircraft.tachoAtNext100Inspection !== undefined && aircraft.currentTacho !== undefined
              ? (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1)
              : 'N/A';

          return (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.currentHobbs?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>{aircraft.currentTacho?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>
                <Badge style={fiftyHrStyle}>{next50} hrs</Badge>
              </TableCell>
              <TableCell>
                <Badge style={hundredHrStyle}>{next100} hrs</Badge>
              </TableCell>
              <TableCell className="text-right">
                <AircraftActions aircraft={aircraft} onEditClick={onEditClick} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
