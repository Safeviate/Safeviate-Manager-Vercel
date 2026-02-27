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

interface StudentsTableProps {
  data: PilotProfile[];
  tenantId: string;
}

export function StudentsTable({ data, tenantId }: StudentsTableProps) {
  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No students found.
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
          <TableHead className="text-right w-[180px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((pilot) => (
          <TableRow key={pilot.id}>
            <TableCell className="font-medium">{pilot.firstName} {pilot.lastName}</TableCell>
            <TableCell>{pilot.email}</TableCell>
            <TableCell>{pilot.contactNumber || 'N/A'}</TableCell>
            <TableCell>{pilot.pilotLicense?.licenseNumber || 'N/A'}</TableCell>
            <TableCell className="text-right">
              <PersonnelActions tenantId={tenantId} user={pilot} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
