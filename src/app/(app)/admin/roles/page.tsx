'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { RoleForm } from './role-form';
import { RoleActions } from './role-actions';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
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
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Roles"
          actions={canManage && <RoleForm tenantId={tenantId} />}
        />

        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider px-6">Role Name</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider">Category</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold tracking-wider">Permissions</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center p-8 uppercase font-bold text-[10px] tracking-widest text-muted-foreground italic bg-muted/5">Loading roles...</TableCell>
                    </TableRow>
                  ) : (roles || []).map((role) => (
                    <TableRow key={role.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="font-bold text-sm text-foreground px-6 py-4">{role.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-black uppercase py-0.5 px-3 border-slate-300">{role.category || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-black uppercase py-0.5 px-3">{role.permissions?.length || 0} PERMISSIONS</Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                         <RoleActions tenantId={tenantId} role={role} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && (!roles || roles.length === 0) && (
                     <TableRow>
                        <TableCell colSpan={4} className="text-center h-48 text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest bg-muted/5">
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
