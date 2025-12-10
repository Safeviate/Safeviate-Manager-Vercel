
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
  aircraft: Aircraft[];
  tenantId: string;
}

export function AircraftTable({ aircraft, tenantId }: AircraftTableProps) {
  if (aircraft.length === 0) {
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
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircraft.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.tailNumber}</TableCell>
            <TableCell>{item.model}</TableCell>
            <TableCell className="text-right">
              <AircraftActions tenantId={tenantId} aircraft={item} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
