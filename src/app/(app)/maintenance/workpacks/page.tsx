'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AddWorkpackDialog } from './add-workpack-dialog';
import { WorkpackList } from './workpack-list';
import type { Workpack } from '@/types/workpack';

export default function WorkpacksPage() {
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();
  const [workpacks, setWorkpacks] = useState<Workpack[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManageWorkpacks = hasPermission('maintenance-workpacks-create') || hasPermission('admin');

  const loadWorkpacks = useCallback(() => {
    setIsLoading(true);
    try {
        const stored = localStorage.getItem('safeviate.maintenance-workpacks');
        if (stored) {
            setWorkpacks(JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to load workpacks", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkpacks();
    window.addEventListener('safeviate-maintenance-workpacks-updated', loadWorkpacks);
    return () => window.removeEventListener('safeviate-maintenance-workpacks-updated', loadWorkpacks);
  }, [loadWorkpacks]);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader
          title="Maintenance Workpacks"
          description="Manage aircraft task cards, maintenance scopes, and digital sign-offs. (Under development)"
          actions={canManageWorkpacks ? <AddWorkpackDialog tenantId={tenantId || ''} /> : undefined}
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <WorkpackList data={workpacks || []} />
        </CardContent>
      </Card>
    </div>
  );
}
