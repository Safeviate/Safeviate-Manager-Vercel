'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from '@/components/page-header';
import { RoleForm } from '../role-form';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Role } from '../page';

export default function EditRolePage({ params }: { params: Promise<{ roleId: string }> }) {
  const { tenantId } = useUserProfile();
  const [role, setRole] = useState<Role | null>(null);
  const [roleId, setRoleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const resolvedParams = await params;
      if (cancelled) return;

      setRoleId(resolvedParams.roleId);
      setIsLoading(true);

      try {
        const response = await fetch(`/api/roles/${resolvedParams.roleId}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!cancelled) {
          setRole(response.ok && payload?.role ? (payload.role as Role) : null);
        }
      } catch {
        if (!cancelled) {
          setRole(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col gap-6 px-1 pt-4">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border shadow-none">
        <MainPageHeader title="Edit Role" />
        <CardContent className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading role...</div>
          ) : role ? (
            <RoleForm tenantId={tenantId || ''} existingRole={role} mode="page" />
          ) : (
            <div className="text-sm text-destructive">Role not found: {roleId}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
