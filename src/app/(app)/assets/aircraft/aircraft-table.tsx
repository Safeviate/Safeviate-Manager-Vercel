'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Aircraft } from './page';
import { AircraftActions } from './aircraft-actions';

interface AircraftTableProps {
  data: Aircraft[];
  tenantId: string;
}

export function AircraftTable({ data, tenantId }: AircraftTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Make</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Current Hobbs</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.make}</TableCell>
            <TableCell>{aircraft.model}</TableCell>
            <TableCell>{aircraft.currentHobbs || 0}</TableCell>
            <TableCell className="text-right">
              <AircraftActions tenantId={tenantId} aircraft={aircraft} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
