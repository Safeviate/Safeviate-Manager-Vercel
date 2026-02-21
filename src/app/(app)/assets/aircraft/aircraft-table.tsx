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
  onEdit: (aircraft: Aircraft) => void;
  tenantId: string;
}

export function AircraftTable({ data, onEdit, tenantId }: AircraftTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No aircraft found. Click &quot;Create Aircraft&quot; to add one.
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
              <AircraftActions onEdit={() => onEdit(aircraft)} aircraftId={aircraft.id} tenantId={tenantId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
