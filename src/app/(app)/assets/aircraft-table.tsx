
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
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye } from 'lucide-react';

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
          <TableHead>View Details</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircraft.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.tailNumber}</TableCell>
            <TableCell>{item.model}</TableCell>
            <TableCell>
                <Button asChild variant="outline" size="sm">
                    <Link href={`/assets/${item.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                    </Link>
                </Button>
            </TableCell>
            <TableCell className="text-right">
              <AircraftActions tenantId={tenantId} aircraft={item} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
