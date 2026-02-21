'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from './aircraft-type';
import { AircraftActions } from './aircraft-actions';
import { AircraftInspectionWarningSettings } from '@/types/inspection';
import { getInspectionBadgeStyle } from './utils';

interface AircraftTableProps {
  aircrafts: Aircraft[];
  inspectionSettings: AircraftInspectionWarningSettings | null;
  onEdit: (aircraft: Aircraft) => void;
  onDelete: (aircraftId: string) => void;
}

export function AircraftTable({ aircrafts, inspectionSettings, onEdit, onDelete }: AircraftTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Current Hobbs</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead>Next 50hr (hrs remaining)</TableHead>
          <TableHead>Next 100hr (hrs remaining)</TableHead>
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
                {next50 !== 'N/A' ? (
                  <Badge style={fiftyHrStyle || {}}>{next50} hrs</Badge>
                ) : (
                  'N/A'
                )}
              </TableCell>
              <TableCell>
                {next100 !== 'N/A' ? (
                  <Badge style={hundredHrStyle || {}}>{next100} hrs</Badge>
                ) : (
                  'N/A'
                )}
              </TableCell>
              <TableCell className="text-right">
                <AircraftActions onEdit={() => onEdit(aircraft)} onDelete={() => onDelete(aircraft.id)} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
