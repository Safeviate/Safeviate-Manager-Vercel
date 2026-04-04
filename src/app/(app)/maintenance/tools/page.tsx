'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AddToolDialog } from './add-tool-dialog';
import { ToolList } from './tool-list';
import type { Tool } from '@/types/tool';

export default function ToolsPage() {
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManageAssets = hasPermission('maintenance-view') || hasPermission('admin');

  const loadTools = useCallback(() => {
    setIsLoading(true);
    try {
        const stored = localStorage.getItem('safeviate.maintenance-tools');
        if (stored) {
            setTools(JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to load tools", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
    window.addEventListener('safeviate-maintenance-tools-updated', loadTools);
    return () => window.removeEventListener('safeviate-maintenance-tools-updated', loadTools);
  }, [loadTools]);

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
          title="Tools & Equipment"
          description="Manage specialized tools, equipment tracking, and calibration standards. (Under development)"
          actions={canManageAssets ? <AddToolDialog tenantId={tenantId || ''} /> : undefined}
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <ToolList data={tools || []} />
        </CardContent>
      </Card>
    </div>
  );
}
