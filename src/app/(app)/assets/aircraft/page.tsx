'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftList } from './aircraft-list';
import type { Aircraft } from '@/types/aircraft';
import { MainPageHeader } from '@/components/page-header';
import { AddAircraftDialog } from './add-aircraft-dialog';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  // Check if the user has permission to manage assets (to show the Add Aircraft button)
  const canManageAssets = hasPermission('assets-view'); // Reusing assets-view or create a new one like 'assets-manage'

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircrafts, isLoading } = useCollection<Aircraft>(aircraftQuery);

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
          title="Aircraft Fleet"
          description="Manage all aircraft in your organization's inventory."
          actions={
            canManageAssets && (
              <AddAircraftDialog tenantId={tenantId} />
            )
          }
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <AircraftList data={aircrafts || []} tenantId={tenantId} />
        </CardContent>
      </Card>
    </div>
  );
}
