'use client';

import { collection, query } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AddToolDialog } from './add-tool-dialog';
import { ToolList } from './tool-list';
import type { Tool } from '@/types/tool';

export default function ToolsPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();

  const canManageAssets = hasPermission('maintenance-view') || hasPermission('admin');

  const toolsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/tools`)) : null),
    [firestore, tenantId]
  );

  const { data: tools, isLoading } = useCollection<Tool>(toolsQuery);

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
