'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { RoleForm } from './role-form';
import { RoleActions } from './role-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';

export type Role = {
  id: string;
  name: string;
  permissions: string[];
  requiredDocuments?: string[];
};

export default function RolesPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canManage = hasPermission('admin-roles-manage');

  const rolesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'roles')) : null),
    [firestore, tenantId]
  );

  const { data: roles, isLoading } = useCollection<Role>(rolesQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-end">
        {canManage && <RoleForm tenantId={tenantId} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
          <CardDescription>
            Define and manage administrative and operational roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center p-8">Loading roles...</TableCell>
                </TableRow>
              ) : (roles || []).map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{role.permissions?.length || 0} assigned</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <RoleActions tenantId={tenantId} role={role} />
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (!roles || roles.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No roles defined yet.
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
