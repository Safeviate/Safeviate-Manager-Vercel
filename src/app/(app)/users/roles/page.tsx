'use client';

import { useState, useEffect } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Role as AdminRole } from '../../admin/roles/page';

export default function RolesPage() {
  const isMobile = useIsMobile();
  const { tenantId: resolvedTenantId } = useUserProfile();
  const tenantId = resolvedTenantId || 'safeviate';
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    try {
      const scopedKey = `safeviate.roles:${tenantId}`;
      const stored = localStorage.getItem(scopedKey) || localStorage.getItem('safeviate.roles');
      if (stored) {
        setRoles(JSON.parse(stored));
      } else {
        setRoles([]);
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

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
          {isMobile ? (
            <div className="space-y-0">
              {isLoading ? (
                <div className="p-6 text-center text-sm text-foreground/80">Loading roles...</div>
              ) : error ? (
                <div className="p-6 text-center font-semibold text-destructive">{error.message}</div>
              ) : roles && roles.length > 0 ? (
                  roles.map((role) => (
                    <div key={role.id} className="border-b px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <p className="text-sm font-bold leading-snug text-foreground break-words">{role.name}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant="outline" className="h-6 px-3 text-[10px] font-black uppercase">
                            {role.category || 'N/A'}
                          </Badge>
                          <Badge className="h-10 rounded-full bg-blue-100 px-4 text-[10px] font-black uppercase text-slate-900 hover:bg-blue-100">
                            {(role.permissions?.length || 0)} Permissions
                          </Badge>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <RoleActions tenantId={tenantId} role={role} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-foreground/80">No roles found.</div>
              )}
            </div>
          ) : (
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
                    <TableCell colSpan={3} className="h-24 text-center text-foreground/80">
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
                      <TableCell colSpan={3} className="h-24 text-center text-foreground/80">
                          No roles found.
                      </TableCell>
                   </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
