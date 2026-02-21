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
}

export function AircraftTable({ data, tenantId }: AircraftTableProps) {
  if (!data || data.length === 0) {
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
          <TableHead>Current Hobbs</TableHead>
          <TableHead>Current Tacho</TableHead>
          <TableHead>Next 50hr Insp.</TableHead>
          <TableHead>Next 100hr Insp.</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.model}</TableCell>
            <TableCell>{aircraft.currentHobbs != null ? Number(aircraft.currentHobbs).toFixed(1) : 'N/A'}</TableCell>
            <TableCell>{aircraft.currentTacho != null ? Number(aircraft.currentTacho).toFixed(1) : 'N/A'}</TableCell>
            <TableCell>{aircraft.tachoAtNext50Inspection != null ? Number(aircraft.tachoAtNext50Inspection).toFixed(1) : 'N/A'}</TableCell>
            <TableCell>{aircraft.tachoAtNext100Inspection != null ? Number(aircraft.tachoAtNext100Inspection).toFixed(1) : 'N/A'}</TableCell>
            <TableCell className="text-right">
              <AircraftActions aircraft={aircraft} tenantId={tenantId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
