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
import { Skeleton } from '@/components/ui/skeleton';

interface AircraftTableProps {
  data: Aircraft[];
  isLoading: boolean;
  tenantId: string;
}

export function AircraftTable({ data, isLoading, tenantId }: AircraftTableProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
        No aircraft found in the fleet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tail Number</TableHead>
          <TableHead>Make & Model</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Airframe Hours</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-bold">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.make} {aircraft.model}</TableCell>
            <TableCell className="font-black uppercase tracking-widest">{aircraft.type || 'N/A'}</TableCell>
            <TableCell>{aircraft.frameHours?.toFixed(1) || '0.0'} hrs</TableCell>
            <TableCell className="text-right">
              <AircraftActions tenantId={tenantId} aircraft={aircraft} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
