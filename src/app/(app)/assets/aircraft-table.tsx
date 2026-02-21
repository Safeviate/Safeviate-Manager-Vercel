
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from './page';
import { AircraftActions } from './aircraft-actions';

interface AircraftTableProps {
  aircrafts: Aircraft[] | null;
  tenantId: string;
}

export function AircraftTable({ aircrafts, tenantId }: AircraftTableProps) {

  if (!aircrafts) {
    return <div className="p-8 text-center">Loading...</div>;
  }
  
  if (aircrafts.length === 0) {
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
          <TableHead>Model</TableHead>
          <TableHead>Hobbs</TableHead>
          <TableHead>Tacho</TableHead>
          <TableHead>Next 50hr</TableHead>
          <TableHead>Next 100hr</TableHead>
          <TableHead className="text-right sr-only">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircrafts.map((aircraft) => (
          <TableRow key={aircraft.id}>
            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
            <TableCell>{aircraft.model}</TableCell>
            <TableCell>{aircraft.currentHobbs?.toFixed(1)}</TableCell>
            <TableCell>{aircraft.currentTacho?.toFixed(1)}</TableCell>
            <TableCell>
              {aircraft.tachoAtNext50Inspection != null ? (
                <Badge variant="outline">{aircraft.tachoAtNext50Inspection.toFixed(1)}</Badge>
              ) : 'N/A'}
            </TableCell>
            <TableCell>
              {aircraft.tachoAtNext100Inspection != null ? (
                <Badge variant="outline">{aircraft.tachoAtNext100Inspection.toFixed(1)}</Badge>
              ) : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <AircraftActions tenantId={tenantId} aircraft={aircraft} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
