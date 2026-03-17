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
import { ScrollArea } from '@/components/ui/scroll-area';

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
      <div className="flex justify-between items-center px-1 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts & Notices</h1>
          <p className="text-muted-foreground">
            View and manage critical alerts and company-wide notices.
          </p>
        </div>
        {canCreateAlerts && <AlertForm tenantId={tenantId} />}
      </div>

      {isLoading ? (
        <div className="space-y-4 px-1">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="red-tags" className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-1 shrink-0">
                <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
                    <TabsTrigger value="red-tags" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Red Tags ({redTags.length})</TabsTrigger>
                    <TabsTrigger value="yellow-tags" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Yellow Tags ({yellowTags.length})</TabsTrigger>
                    <TabsTrigger value="company-notices" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Company Notices ({companyNotices.length})</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="red-tags" className="mt-0 flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4 px-1 pb-10">
                        {redTags.length > 0 ? (
                            redTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                        ) : (
                            <Card className="flex h-48 items-center justify-center shadow-none border">
                                <p className="text-muted-foreground text-sm">No active red tags.</p>
                            </Card>
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="yellow-tags" className="mt-0 flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4 px-1 pb-10">
                        {yellowTags.length > 0 ? (
                            yellowTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                        ) : (
                            <Card className="flex h-48 items-center justify-center shadow-none border">
                                <p className="text-muted-foreground text-sm">No active yellow tags.</p>
                            </Card>
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="company-notices" className="mt-0 flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4 px-1 pb-10">
                        {companyNotices.length > 0 ? (
                            companyNotices.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                        ) : (
                            <Card className="flex h-48 items-center justify-center shadow-none border">
                                <p className="text-muted-foreground text-sm">No active company notices.</p>
                            </Card>
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
