'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { AircraftActions } from './aircraft-actions';
import { getInspectionBadgeStyle } from './utils';

interface AircraftTableProps {
  data: Aircraft[];
  inspectionSettings?: AircraftInspectionWarningSettings;
  onEdit: (aircraft: Aircraft) => void;
  onDelete: (aircraft: Aircraft) => void;
}

export function AircraftTable({ data, inspectionSettings, onEdit, onDelete }: AircraftTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No aircraft found. Add one to get started.
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
        {data.map((aircraft) => {
            const fiftyHourStyle = getInspectionBadgeStyle(
                aircraft.currentTacho, 
                aircraft.tachoAtNext50Inspection, 
                inspectionSettings?.fiftyHourWarnings
            );
            const hundredHourStyle = getInspectionBadgeStyle(
                aircraft.currentTacho, 
                aircraft.tachoAtNext100Inspection, 
                inspectionSettings?.oneHundredHourWarnings
            );
          return (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.currentHobbs?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>{aircraft.currentTacho?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>
                <Badge style={fiftyHourStyle}>{aircraft.tachoAtNext50Inspection?.toFixed(1) ?? 'N/A'}</Badge>
              </TableCell>
              <TableCell>
                <Badge style={hundredHourStyle}>{aircraft.tachoAtNext100Inspection?.toFixed(1) ?? 'N/A'}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <AircraftActions aircraft={aircraft} onEdit={onEdit} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
