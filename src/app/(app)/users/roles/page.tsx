'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { RoleForm } from '../../admin/roles/role-form';
import { RoleActions } from '../../admin/roles/role-actions';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MainPageHeader } from '@/components/page-header';

export type Role = {
  id: string;
  name: string;
  permissions: string[];
};

export default function RolesPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const rolesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'roles'))
        : null,
    [firestore]
  );

  const {
    data: roles,
    isLoading,
    error,
  } = useCollection<Role>(rolesQuery);

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Roles & Permissions"
          description="Manage organizational roles and their associated system permissions."
          actions={
            <RoleForm tenantId={tenantId} />
          }
        />
        <CardContent className="flex-1 p-0 overflow-auto bg-background">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-xs uppercase font-bold tracking-wider">Name</TableHead>
                <TableHead className="text-xs uppercase font-bold tracking-wider">Permissions</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Loading roles...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && error && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-destructive font-semibold">
                    Error: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && roles && roles.length > 0 && (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.permissions?.length || 0} assigned</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <RoleActions tenantId={tenantId} role={role} />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && !error && (!roles || roles.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        No roles found.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}