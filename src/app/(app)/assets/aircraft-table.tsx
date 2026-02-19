
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { ViewAircraftDialog } from './view-aircraft-dialog';
import type { Aircraft } from '@/types/aircraft';
import { AircraftActions } from './aircraft-actions';

interface AircraftTableProps {
  data: Aircraft[];
  tenantId: string;
}

export function AircraftTable({ data, tenantId }: AircraftTableProps) {
  const [selectedAircraft, setSelectedAircraft] = React.useState<Aircraft | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tail Number</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>View</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((aircraft) => (
            <TableRow key={aircraft.id}>
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.type ?? 'N/A'}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setSelectedAircraft(aircraft)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
              </TableCell>
              <TableCell className="text-right">
                <AircraftActions aircraft={aircraft} tenantId={tenantId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {selectedAircraft && (
        <ViewAircraftDialog
          aircraft={selectedAircraft}
          isOpen={!!selectedAircraft}
          onClose={() => setSelectedAircraft(null)}
        />
      )}
    </>
  );
}
