'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from './aircraft-type';
import { AircraftActions } from './aircraft-actions';

interface AircraftTableProps {
  data: Aircraft[];
  onEdit: (aircraft: Aircraft) => void;
  getAircraftStatusBadge: (aircraft: Aircraft) => React.ReactNode;
}

export function AircraftTable({ data, onEdit, getAircraftStatusBadge }: AircraftTableProps) {
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
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              No aircraft found. Add one to get started.
            </TableCell>
          </TableRow>
        ) : (
          data.map((aircraft) => (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.currentHobbs?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>{aircraft.currentTacho?.toFixed(1) ?? 'N/A'}</TableCell>
              <TableCell>{getAircraftStatusBadge(aircraft)}</TableCell>
              <TableCell>
                {aircraft.tachoAtNext100Inspection !== undefined && aircraft.currentTacho !== undefined
                  ? (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1)
                  : 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                <AircraftActions aircraft={aircraft} onEdit={() => onEdit(aircraft)} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
