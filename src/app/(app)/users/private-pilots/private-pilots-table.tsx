
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PilotProfile } from '../personnel/page';
import { PersonnelActions } from '../personnel/personnel-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye } from 'lucide-react';

interface PrivatePilotsTableProps {
  data: PilotProfile[];
  tenantId: string;
}

export function PrivatePilotsTable({ data, tenantId }: PrivatePilotsTableProps) {
  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No private pilots found.
        </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Contact Number</TableHead>
          <TableHead>License No.</TableHead>
          <TableHead>View Profile</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((pilot) => (
          <TableRow key={pilot.id}>
            <TableCell className="font-medium">{pilot.firstName} {pilot.lastName}</TableCell>
            <TableCell>{pilot.email}</TableCell>
            <TableCell>{pilot.contactNumber || 'N/A'}</TableCell>
            <TableCell>{pilot.pilotLicense?.licenseNumber || 'N/A'}</TableCell>
            <TableCell>
              <Button asChild variant="outline" size="sm">
                <Link href={`/users/personnel/${pilot.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Profile
                </Link>
              </Button>
            </TableCell>
            <TableCell className="text-right">
              <PersonnelActions tenantId={tenantId} user={pilot} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
