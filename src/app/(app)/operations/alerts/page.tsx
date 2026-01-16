
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Alert } from '@/types/alert';
import { AlertForm } from './alert-form';
import { AlertCard } from './alert-card';
import { usePermissions } from '@/hooks/use-permissions';

export default function AlertsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { hasPermission } = usePermissions();
  const canManageAlerts = hasPermission('operations-alerts-manage');

  const alertsQuery = useMemoFirebase(
    () => (firestore ? query(
      collection(firestore, `tenants/${tenantId}/alerts`),
      where('status', '==', 'Active')
    ) : null),
    [firestore, tenantId]
  );

  const { data: alerts, isLoading } = useCollection<Alert>(alertsQuery);

  const redTags = useMemo(() => alerts?.filter(a => a.type === 'Red Tag') || [], [alerts]);
  const yellowTags = useMemo(() => alerts?.filter(a => a.type === 'Yellow Tag') || [], [alerts]);
  const companyNotices = useMemo(() => alerts?.filter(a => a.type === 'Company Notice') || [], [alerts]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts & Notices</h1>
          <p className="text-muted-foreground">
            View and manage critical alerts and company-wide notices.
          </p>
        </div>
        {canManageAlerts && <AlertForm tenantId={tenantId} />}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-red-600">Red Tags</h2>
            {redTags.length > 0 ? (
              redTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canManageAlerts} />)
            ) : (
              <p className="text-muted-foreground text-sm">No active red tags.</p>
            )}
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-yellow-500">Yellow Tags</h2>
             {yellowTags.length > 0 ? (
              yellowTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canManageAlerts} />)
            ) : (
              <p className="text-muted-foreground text-sm">No active yellow tags.</p>
            )}
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Company Notices</h2>
             {companyNotices.length > 0 ? (
              companyNotices.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canManageAlerts} />)
            ) : (
              <p className="text-muted-foreground text-sm">No active company notices.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
