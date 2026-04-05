'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftList } from './aircraft-list';
import type { Aircraft } from '@/types/aircraft';
import { MainPageHeader } from '@/components/page-header';
import { AddAircraftDialog } from './add-aircraft-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function AircraftFleetPage() {
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManageAssets = hasPermission('assets-create') || hasPermission('assets-edit');

  const loadAircrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/aircraft', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({ aircraft: [] }));
      setAircrafts(Array.isArray(payload.aircraft) ? payload.aircraft : []);
    } catch (e) {
      console.error('Failed to load aircrafts', e);
      setAircrafts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAircrafts();
    window.addEventListener('safeviate-aircrafts-updated', loadAircrafts);
    return () => window.removeEventListener('safeviate-aircrafts-updated', loadAircrafts);
  }, [loadAircrafts]);

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
          title="Aircraft Fleet"
          description="Manage all aircraft in your organization's inventory."
          actions={canManageAssets ? <AddAircraftDialog tenantId={tenantId || ''} /> : undefined}
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <AircraftList data={aircrafts || []} tenantId={tenantId || ''} />
        </CardContent>
      </Card>
    </div>
  );
}
