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
import type { Personnel } from './page';
import { PersonnelActions } from './personnel-actions';

interface PersonnelTableProps {
  data: Personnel[];
  rolesMap: Map<string, string>;
  departmentsMap: Map<string, string>;
  tenantId: string;
}

export function PersonnelTable({ data, rolesMap, departmentsMap, tenantId }: PersonnelTableProps) {
  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No personnel found. Add one to get started.
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
          <TableHead>Department</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Custom Permissions</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((person) => (
          <TableRow key={person.id}>
            <TableCell className="font-medium">{person.firstName} {person.lastName}</TableCell>
            <TableCell>{person.email}</TableCell>
            <TableCell>{person.contactNumber || 'N/A'}</TableCell>
            <TableCell>{departmentsMap.get(person.department || '') || 'N/A'}</TableCell>
            <TableCell>{rolesMap.get(person.role) || person.role}</TableCell>
            <TableCell>
              <Badge variant={person.permissions?.length > 0 ? "secondary" : "outline"}>
                {person.permissions?.length || 0} assigned
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <PersonnelActions tenantId={tenantId} user={person} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
