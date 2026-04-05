'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AddVehicleDialog } from './add-vehicle-dialog';
import { VehicleList } from './vehicle-list';
import type { Vehicle } from '@/types/vehicle';

export default function VehiclesPage() {
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManageAssets = hasPermission('assets-create') || hasPermission('assets-edit');

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/vehicles', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({ vehicles: [] }));
      setVehicles(Array.isArray(payload.vehicles) ? payload.vehicles : []);
    } catch (e) {
      console.error('Failed to load vehicles', e);
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
    const handleVehiclesUpdated = () => {
      void loadVehicles();
    };
    window.addEventListener('safeviate-vehicles-updated', handleVehiclesUpdated);
    return () => window.removeEventListener('safeviate-vehicles-updated', handleVehiclesUpdated);
  }, [loadVehicles]);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
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
