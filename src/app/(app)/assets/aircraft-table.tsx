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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AircraftTableProps {
  aircrafts: Aircraft[];
  tenantId: string;
  onEdit: (aircraft: Aircraft) => void;
}

export function AircraftTable({ aircrafts, tenantId, onEdit }: AircraftTableProps) {
  const router = useRouter();

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
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircrafts.map((aircraft) => {
          const hoursTo50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
          const hoursTo100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

          return (
            <TableRow 
              key={aircraft.id} 
              className="cursor-pointer"
              onClick={() => router.push(`/assets/${aircraft.id}`)}
            >
              <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
              <TableCell>{aircraft.model}</TableCell>
              <TableCell>{aircraft.currentHobbs?.toFixed(1)}</TableCell>
              <TableCell>{aircraft.currentTacho?.toFixed(1)}</TableCell>
              <TableCell>
                <Badge variant={hoursTo50 < 10 ? 'destructive' : 'outline'}>
                    {hoursTo50 > 0 ? `${hoursTo50.toFixed(1)} hrs` : 'Due'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={hoursTo100 < 10 ? 'destructive' : 'outline'}>
                    {hoursTo100 > 0 ? `${hoursTo100.toFixed(1)} hrs` : 'Due'}
                </Badge>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <AircraftActions tenantId={tenantId} aircraft={aircraft} onEdit={() => onEdit(aircraft)} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
