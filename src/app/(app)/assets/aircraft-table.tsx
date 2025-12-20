
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
  if (!aircraft || aircraft.length === 0) {
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
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircraft.map((ac) => (
          <TableRow key={ac.id}>
            <TableCell className="font-medium">{ac.tailNumber}</TableCell>
            <TableCell>{ac.model}</TableCell>
            <TableCell>{ac.type}</TableCell>
            <TableCell className="text-right">
              <AircraftActions tenantId={tenantId} aircraft={ac} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
