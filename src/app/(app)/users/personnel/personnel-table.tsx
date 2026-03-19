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
import { ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
            No personnel found.
        </div>
    );
  }
  
  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((person) => (
            <TableRow key={person.id}>
              <TableCell className="font-mono text-xs font-bold text-primary">{person.userNumber || '-'}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {person.firstName} {person.lastName}
                  <div className="flex gap-1">
                    {person.isErpIncerfaContact && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                        </TooltipTrigger>
                        <TooltipContent>Designated ERP INCERFA Contact</TooltipContent>
                      </Tooltip>
                    )}
                    {person.isErpAlerfaContact && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                        </TooltipTrigger>
                        <TooltipContent>Designated ERP ALERFA Contact</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>{departmentsMap.get(person.department || '') || 'N/A'}</TableCell>
              <TableCell>{rolesMap.get(person.role) || person.role}</TableCell>
              <TableCell className="text-right">
                <PersonnelActions tenantId={tenantId} user={person} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
