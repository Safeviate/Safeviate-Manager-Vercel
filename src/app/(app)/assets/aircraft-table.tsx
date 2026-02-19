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
  tenantId: string;
  isLoading: boolean;
  error: Error | null;
}

export function AircraftTable({ data, tenantId, isLoading, error }: AircraftTableProps) {
  if (isLoading) {
      return (
          <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      )
  }

  if (error) {
      return <div className="text-center text-destructive">Error loading aircraft: {error.message}</div>
  }

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
          <TableHead>Current Hobbs</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.model}</TableCell>
            <TableCell>{aircraft.type || 'N/A'}</TableCell>
            <TableCell>{aircraft.currentHobbs ? `${aircraft.currentHobbs.toFixed(1)} hrs` : 'N/A'}</TableCell>
            <TableCell className="text-right">
              <AircraftActions aircraft={aircraft} tenantId={tenantId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
