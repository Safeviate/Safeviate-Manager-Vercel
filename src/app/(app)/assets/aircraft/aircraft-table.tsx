
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
  aircrafts: Aircraft[];
  tenantId: string;
}

export function AircraftTable({ aircrafts, tenantId }: AircraftTableProps) {
  if (!aircrafts || aircrafts.length === 0) {
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
          <TableHead>Make</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Current Hobbs</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead>Next 50hr Insp.</TableHead>
          <TableHead>Next 100hr Insp.</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircrafts.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.make}</TableCell>
            <TableCell>{aircraft.model}</TableCell>
            <TableCell>{aircraft.currentHobbs ?? 'N/A'}</TableCell>
            <TableCell>{aircraft.currentTacho ?? 'N/A'}</TableCell>
            <TableCell>{aircraft.tachoAtNext50Inspection ?? 'N/A'}</TableCell>
            <TableCell>{aircraft.tachoAtNext100Inspection ?? 'N/A'}</TableCell>
            <TableCell className="text-right">
              <AircraftActions aircraft={aircraft} tenantId={tenantId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
