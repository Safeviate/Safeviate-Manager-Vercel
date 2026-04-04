'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';

export type RoleCategory = 'Personnel' | 'Instructor' | 'Student' | 'Private Pilot' | 'External';

export type Role = {
  id: string;
  name: string;
  category: RoleCategory;
  permissions: string[];
  requiredDocuments?: string[];
};

export default function RolesPage() {
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  const canManage = hasPermission('admin-roles-manage');
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoles = useCallback(() => {
    setIsLoading(true);
    try {
        const stored = localStorage.getItem('safeviate.roles');
        if (stored) {
            setRoles(JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to load roles", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    window.addEventListener('safeviate-roles-updated', loadRoles);
    return () => window.removeEventListener('safeviate-roles-updated', loadRoles);
  }, [loadRoles]);

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Roles"
          actions={canManage && <RoleForm tenantId={tenantId || ''} />}
        />

        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {isMobile ? (
              <div className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center uppercase font-bold text-[10px] tracking-widest text-muted-foreground italic bg-muted/5">
                    Loading roles...
                  </div>
                ) : roles.length > 0 ? (
                  roles.map((role) => (
                    <div key={role.id} className="border-b px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-3">
                          <p className="break-words text-sm font-bold leading-snug text-foreground">{role.name}</p>
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline" className="h-6 border-slate-300 px-3 text-[10px] font-black uppercase">
                              {role.category || 'N/A'}
                            </Badge>
                            <Badge variant="secondary" className="h-10 rounded-full px-4 text-[10px] font-black uppercase">
                              {role.permissions?.length || 0} Permissions
                            </Badge>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <RoleActions tenantId={tenantId || ''} role={role} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center h-48 p-8 text-muted-foreground italic uppercase font-bold text-[10px] tracking-widest bg-muted/5">
                    No roles defined yet.
                  </div>
                )}
              </div>
            ) : (
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
                           <RoleActions tenantId={tenantId || ''} role={role} />
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
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
