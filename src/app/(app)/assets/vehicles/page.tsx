'use client';

import { collection, query } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AddVehicleDialog } from './add-vehicle-dialog';
import { VehicleList } from './vehicle-list';
import type { Vehicle } from '@/types/vehicle';

export default function VehiclesPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();

  const canManageAssets = hasPermission('assets-create') || hasPermission('assets-edit');

  const vehiclesQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/vehicles`)) : null),
    [firestore, tenantId]
  );

  const { data: vehicles, isLoading } = useCollection<Vehicle>(vehiclesQuery);

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
          title="Vehicle Fleet"
          description="Manage company vehicles and supporting ground assets."
          actions={canManageAssets ? <AddVehicleDialog tenantId={tenantId || ''} /> : undefined}
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <VehicleList data={vehicles || []} />
        </CardContent>
      </Card>
    </div>
  );
}
