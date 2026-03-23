'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-6">
      {isLoading ? (
        <div className="space-y-4 px-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Card className="w-full flex-1 flex flex-col min-h-0 overflow-hidden shadow-none border">
          <Tabs defaultValue="red-tags" className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="shrink-0 border-b bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                {canCreateAlerts && (
                  <div className="flex flex-col gap-1 sm:items-end w-full sm:w-auto">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Alert Control</p>
                    <AlertForm tenantId={tenantId} />
                  </div>
                )}
              </div>
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
                <TabsTrigger value="red-tags" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Red Tags ({redTags.length})</TabsTrigger>
                <TabsTrigger value="yellow-tags" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Yellow Tags ({yellowTags.length})</TabsTrigger>
                <TabsTrigger value="company-notices" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Company Notices ({companyNotices.length})</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
              <TabsContent value="red-tags" className="mt-0 h-full min-h-0 overflow-y-auto no-scrollbar">
                <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-6">
                  {redTags.length > 0 ? (
                    redTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                  ) : (
                    <Card className="flex h-48 items-center justify-center shadow-none border">
                      <p className="text-muted-foreground text-sm">No active red tags.</p>
                    </Card>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="yellow-tags" className="mt-0 h-full min-h-0 overflow-y-auto no-scrollbar">
                <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-6">
                  {yellowTags.length > 0 ? (
                    yellowTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                  ) : (
                    <Card className="flex h-48 items-center justify-center shadow-none border">
                      <p className="text-muted-foreground text-sm">No active yellow tags.</p>
                    </Card>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="company-notices" className="mt-0 h-full min-h-0 overflow-y-auto no-scrollbar">
                <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-6">
                  {companyNotices.length > 0 ? (
                    companyNotices.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                  ) : (
                    <Card className="flex h-48 items-center justify-center shadow-none border">
                      <p className="text-muted-foreground text-sm">No active company notices.</p>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}
