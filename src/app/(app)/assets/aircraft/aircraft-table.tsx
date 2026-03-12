
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
import type { Aircraft } from '@/types/aircraft';
import { AircraftActions } from './aircraft-actions';

interface AircraftTableProps {
  data: Aircraft[];
  tenantId: string;
  canEdit: boolean;
}

export function AircraftTable({ data, tenantId, canEdit }: AircraftTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
        No aircraft registered for this organization.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Registration</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Make/Model</TableHead>
          <TableHead className="text-right">Hobbs</TableHead>
          <TableHead className="text-right">Tacho</TableHead>
          <TableHead className="text-right">Next 100hr</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((ac) => (
          <TableRow key={ac.id}>
            <TableCell className="font-bold">{ac.tailNumber}</TableCell>
            <TableCell>
              <Badge variant="outline">{ac.type}</Badge>
            </TableCell>
            <TableCell>{ac.make} {ac.model}</TableCell>
            <TableCell className="text-right font-mono">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
            <TableCell className="text-right font-mono">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
            <TableCell className="text-right font-mono">
                {ac.tachoAtNext100Inspection ? ac.tachoAtNext100Inspection.toFixed(1) : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <AircraftActions tenantId={tenantId} aircraft={ac} canEdit={canEdit} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
