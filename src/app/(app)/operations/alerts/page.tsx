
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Alert } from '@/types/alert';
import { AlertForm } from './alert-form';
import { AlertCard } from './alert-card';
import { usePermissions } from '@/hooks/use-permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AlertsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { hasPermission } = usePermissions();
  const canCreateAlerts = hasPermission('operations-alerts-create');
  const canEditAlerts = hasPermission('operations-alerts-edit');

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
        {canCreateAlerts && <AlertForm tenantId={tenantId} />}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="red-tags" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="red-tags">Red Tags ({redTags.length})</TabsTrigger>
                <TabsTrigger value="yellow-tags">Yellow Tags ({yellowTags.length})</TabsTrigger>
                <TabsTrigger value="company-notices">Company Notices ({companyNotices.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="red-tags">
                <div className="space-y-4 pt-4">
                    {redTags.length > 0 ? (
                        redTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                    ) : (
                        <Card className="flex h-48 items-center justify-center">
                            <p className="text-muted-foreground text-sm">No active red tags.</p>
                        </Card>
                    )}
                </div>
            </TabsContent>
            <TabsContent value="yellow-tags">
                <div className="space-y-4 pt-4">
                    {yellowTags.length > 0 ? (
                        yellowTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                    ) : (
                         <Card className="flex h-48 items-center justify-center">
                            <p className="text-muted-foreground text-sm">No active yellow tags.</p>
                        </Card>
                    )}
                </div>
            </TabsContent>
            <TabsContent value="company-notices">
                <div className="space-y-4 pt-4">
                    {companyNotices.length > 0 ? (
                        companyNotices.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                    ) : (
                         <Card className="flex h-48 items-center justify-center">
                            <p className="text-muted-foreground text-sm">No active company notices.</p>
                        </Card>
                    )}
                </div>
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
