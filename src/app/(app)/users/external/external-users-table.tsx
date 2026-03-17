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
import type { PilotProfile, Personnel } from '../personnel/page';
import { PersonnelActions } from '../personnel/personnel-actions';
import { ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type UserProfile = Personnel | PilotProfile;

interface ExternalUsersTableProps {
  data: UserProfile[];
  orgMap: Map<string, string>;
  rolesMap: Map<string, string>;
  tenantId: string;
}

export function ExternalUsersTable({ data, orgMap, rolesMap, tenantId }: ExternalUsersTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
        No external users found.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>User Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {user.firstName} {user.lastName}
                  <div className="flex gap-1">
                    {user.isErpIncerfaContact && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                        </TooltipTrigger>
                        <TooltipContent>Designated ERP INCERFA Contact</TooltipContent>
                      </Tooltip>
                    )}
                    {user.isErpAlerfaContact && (
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
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {orgMap.get(user.organizationId || '') || 'Unknown Org'}
                </Badge>
              </TableCell>
              <TableCell>{rolesMap.get(user.role) || user.role}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.userType}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <PersonnelActions tenantId={tenantId} user={user} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
