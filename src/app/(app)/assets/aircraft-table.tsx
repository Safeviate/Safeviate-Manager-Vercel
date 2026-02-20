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
  tenantId: string;
  onEdit: (aircraft: Aircraft) => void;
}

export function AircraftTable({ data, tenantId, onEdit }: AircraftTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
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
          <TableHead>Type</TableHead>
          <TableHead>Hobbs</TableHead>
          <TableHead>Tacho</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.model}</TableCell>
            <TableCell>{aircraft.type}</TableCell>
            <TableCell>{aircraft.currentHobbs?.toFixed(1)}</TableCell>
            <TableCell>{aircraft.currentTacho?.toFixed(1)}</TableCell>
            <TableCell className="text-right">
              <AircraftActions tenantId={tenantId} aircraft={aircraft} onEdit={() => onEdit(aircraft)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
