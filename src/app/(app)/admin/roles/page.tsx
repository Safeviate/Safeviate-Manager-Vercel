
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/use-permissions';

export type RoleCategory = 'Personnel' | 'Instructor' | 'Student' | 'Private Pilot' | 'External';

export type Role = {
  id: string;
  name: string;
  category: RoleCategory;
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
    <div className="flex flex-col gap-6 h-full min-h-0">
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6">
          <div className="space-y-1">
            <CardTitle>System Roles</CardTitle>
            <CardDescription>
              Define and manage administrative and operational roles.
            </CardDescription>
          </div>
          {canManage && (
            <div className="flex flex-col gap-1.5 sm:items-end w-full sm:w-auto">
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Role Control</p>
              <RoleForm tenantId={tenantId} />
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center p-8">Loading roles...</TableCell>
                    </TableRow>
                  ) : (roles || []).map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{role.category || 'N/A'}</Badge>
                      </TableCell>
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
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                            No roles defined yet.
                        </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
