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
import { ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InstructorsTableProps {
  data: PilotProfile[];
  tenantId: string;
}

export function InstructorsTable({ data, tenantId }: InstructorsTableProps) {
  if (data.length === 0) {
    return (
        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
            No instructors found.
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
            <TableHead>License No.</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((pilot) => (
            <TableRow key={pilot.id}>
              <TableCell className="font-mono text-xs font-bold text-primary">{pilot.userNumber || '-'}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {pilot.firstName} {pilot.lastName}
                  <div className="flex gap-1">
                    {pilot.isErpIncerfaContact && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                        </TooltipTrigger>
                        <TooltipContent>Designated ERP INCERFA Contact</TooltipContent>
                      </Tooltip>
                    )}
                    {pilot.isErpAlerfaContact && (
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
              <TableCell>{pilot.email}</TableCell>
              <TableCell>{pilot.pilotLicense?.licenseNumber || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <PersonnelActions tenantId={tenantId} user={pilot} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
