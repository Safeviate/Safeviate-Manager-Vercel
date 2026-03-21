'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X, Shield, LayoutGrid } from 'lucide-react';
import { menuConfig } from '@/lib/menu-config';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { Skeleton } from '@/components/ui/skeleton';
import type { Role } from '../../admin/roles/page';
import Link from 'next/link';

export default function AccessOverviewPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { tenant, isLoading: isLoadingTenant } = useTenantConfig();

  const rolesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/roles`)) : null),
    [firestore, tenantId]
  );
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);

  const isLoading = isLoadingTenant || isLoadingRoles;

  const coreModules = useMemo(() => {
    return menuConfig.filter(m => m.label !== 'Admin' && m.label !== 'Development');
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto w-full px-1">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 h-[500px]">
          <Skeleton className="h-full w-full" />
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Access Overview</h1>
        <p className="text-muted-foreground text-sm">Verify module availability and role-based permissions at a glance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 flex-1 min-h-0">
        <Card className="flex flex-col h-full overflow-hidden shadow-none border">
          <CardHeader className="shrink-0 border-b bg-muted/5 p-6">
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <Shield className="h-5 w-5 text-primary" />
              Role Access Matrix
            </CardTitle>
            <CardDescription className="text-xs">Permissions required to see core modules.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="overflow-x-auto w-full h-full custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-48 text-[10px] uppercase font-black bg-muted/30">Module</TableHead>
                    {(roles || []).map(role => (
                      <TableHead key={role.id} className="text-center text-[10px] uppercase font-black bg-muted/30">
                        {role.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coreModules.map(module => {
                    const isEnabled = !tenant?.enabledMenus || tenant.enabledMenus.includes(module.href);
                    
                    return (
                      <TableRow key={module.href} className={!isEnabled ? "opacity-40 grayscale" : ""}>
                        <TableCell className="font-bold text-xs flex items-center gap-2 py-4">
                          <module.icon className="h-3.5 w-3.5 text-primary" />
                          {module.label}
                          {!isEnabled && <Badge variant="outline" className="text-[8px] h-4 py-0 ml-1">Disabled</Badge>}
                        </TableCell>
                        {(roles || []).map(role => {
                          const permissionId = module.permissionId;
                          const hasAccess = role.permissions?.includes(permissionId || '');
                          
                          return (
                            <TableCell key={role.id} className="text-center">
                              {isEnabled && hasAccess ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-none border">
            <CardHeader className="bg-muted/10 p-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                Active Modules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-4 space-y-2">
              {coreModules.map(m => {
                const isEnabled = !tenant?.enabledMenus || tenant.enabledMenus.includes(m.href);
                return (
                  <div key={m.href} className="flex items-center justify-between text-[11px] font-medium">
                    <span>{m.label}</span>
                    <Badge variant={isEnabled ? "default" : "outline"} className="h-4 text-[8px] font-black">
                      {isEnabled ? 'ENABLED' : 'HIDDEN'}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardHeader className="p-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest">Visibility Logic</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[10px] text-muted-foreground font-medium leading-relaxed">
              For a user to see a module, two conditions must be met:
              <ol className="list-decimal pl-4 mt-2 space-y-1">
                <li>The module must be enabled globally in <Link href="/admin/page-format" className="text-primary hover:underline">Page Format</Link>.</li>
                <li>The user&apos;s Role must have the corresponding &quot;view&quot; permission.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
