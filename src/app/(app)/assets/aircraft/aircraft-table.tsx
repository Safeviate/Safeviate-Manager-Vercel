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

interface AircraftTableProps {
  data: Aircraft[];
}

export function AircraftTable({ data }: AircraftTableProps) {
  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No aircraft have been added yet.
        </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Make</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Hobbs Hours</TableHead>
          <TableHead>Tacho Hours</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.type}</TableCell>
            <TableCell>{aircraft.make}</TableCell>
            <TableCell>{aircraft.model}</TableCell>
            <TableCell>{aircraft.currentHobbs?.toFixed(1) || 'N/A'}</TableCell>
            <TableCell>{aircraft.currentTacho?.toFixed(1) || 'N/A'}</TableCell>
            <TableCell className="text-right">
              <AircraftActions aircraft={aircraft} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
