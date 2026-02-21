
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AircraftActions } from './aircraft-actions';
import type { Aircraft } from '@/types/aircraft';

interface AircraftTableProps {
  data: Aircraft[];
  tenantId: string;
  onEdit: (aircraft: Aircraft) => void;
}

export function AircraftTable({ data, tenantId, onEdit }: AircraftTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Make</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Current Hobbs</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.make}</TableCell>
            <TableCell>{aircraft.model}</TableCell>
            <TableCell>{aircraft.type}</TableCell>
            <TableCell>{aircraft.currentHobbs || 'N/A'}</TableCell>
            <TableCell>{aircraft.currentTacho || 'N/A'}</TableCell>
            <TableCell className="text-right">
              <AircraftActions
                tenantId={tenantId}
                aircraft={aircraft}
                onEdit={onEdit}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
