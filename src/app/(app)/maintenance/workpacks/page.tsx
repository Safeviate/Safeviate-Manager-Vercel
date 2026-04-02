'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AddWorkpackDialog } from './add-workpack-dialog';
import { WorkpackList } from './workpack-list';
import type { Workpack } from '@/types/workpack';

export default function WorkpacksPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();

  const canManageWorkpacks = hasPermission('maintenance-workpacks-create') || hasPermission('admin');

  // Fetch all workpacks for the tenant, ordered by creation date
  const workpacksQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/workpacks`)) : null),
    [firestore, tenantId]
  );

  const { data: workpacks, isLoading } = useCollection<Workpack>(workpacksQuery);

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
