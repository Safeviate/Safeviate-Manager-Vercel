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
import { AircraftActions } from './aircraft-actions';
import type { Aircraft } from './aircraft-type';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { getInspectionBadgeStyle } from './utils';
import { cn } from '@/lib/utils';

interface AircraftTableProps {
  aircrafts: Aircraft[];
  inspectionSettings?: AircraftInspectionWarningSettings;
  onEdit: (aircraft: Aircraft) => void;
  onDelete: (id: string) => void;
}

export function AircraftTable({ aircrafts, inspectionSettings, onEdit, onDelete }: AircraftTableProps) {
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

          const next50 = aircraft.tachoAtNext50Inspection !== undefined && aircraft.currentTacho !== undefined
            ? (aircraft.tachoAtNext50Inspection - aircraft.currentTacho).toFixed(1)
            : 'N/A';

          const next100 = aircraft.tachoAtNext100Inspection !== undefined && aircraft.currentTacho !== undefined
            ? (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1)
            : 'N/A';

          return (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.currentHobbs?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>{aircraft.currentTacho?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>
                <Badge style={fiftyHrStyle} className={cn(fiftyHrStyle?.color && 'text-white')}>{next50} hrs</Badge>
              </TableCell>
              <TableCell>
                 <Badge style={hundredHrStyle} className={cn(hundredHrStyle?.color && 'text-white')}>{next100} hrs</Badge>
              </TableCell>
              <TableCell className="text-right">
                <AircraftActions 
                  aircraft={aircraft} 
                  onEdit={() => onEdit(aircraft)}
                  onDelete={() => onDelete(aircraft.id)}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
