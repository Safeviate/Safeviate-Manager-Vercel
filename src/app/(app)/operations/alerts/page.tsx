'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
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

  if (isLoading) {
    return (
        <div className="max-w-[1350px] mx-auto w-full px-1">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-64 w-full mt-6" />
        </div>
    );
  }

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col h-full overflow-hidden px-1">
        <Card className="w-full flex-1 flex flex-col min-h-0 overflow-hidden shadow-none border">
          <Tabs defaultValue="red-tags" className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
            <MainPageHeader 
              title="Operations Alerts"
              actions={canCreateAlerts && <AlertForm tenantId={tenantId} />}
            />
            
            <div className="border-b bg-muted/5 px-6 py-3 overflow-x-auto no-scrollbar shrink-0">
                <div className="flex w-max gap-2 pr-6 flex-nowrap">
                    <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                        <TabsTrigger value="red-tags" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase transition-all">Red Tags ({redTags.length})</TabsTrigger>
                        <TabsTrigger value="yellow-tags" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase transition-all">Yellow Tags ({yellowTags.length})</TabsTrigger>
                        <TabsTrigger value="company-notices" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase transition-all">Company Notices ({companyNotices.length})</TabsTrigger>
                    </TabsList>
                </div>
            </div>

            <CardContent className="flex-1 min-h-0 overflow-hidden p-0 bg-muted/5">
              <TabsContent value="red-tags" className="mt-0 h-full min-h-0 overflow-y-auto no-scrollbar">
                <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                  {redTags.length > 0 ? (
                    redTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                  ) : (
                    <Card className="flex h-64 items-center justify-center shadow-none border bg-background">
                      <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic opacity-40">No active red tags.</p>
                    </Card>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="yellow-tags" className="mt-0 h-full min-h-0 overflow-y-auto no-scrollbar">
                <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                  {yellowTags.length > 0 ? (
                    yellowTags.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                  ) : (
                    <Card className="flex h-64 items-center justify-center shadow-none border bg-background">
                      <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic opacity-40">No active yellow tags.</p>
                    </Card>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="company-notices" className="mt-0 h-full min-h-0 overflow-y-auto no-scrollbar">
                <div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-20">
                  {companyNotices.length > 0 ? (
                    companyNotices.map(alert => <AlertCard key={alert.id} alert={alert} tenantId={tenantId} canManage={canEditAlerts} />)
                  ) : (
                    <Card className="flex h-64 items-center justify-center shadow-none border bg-background">
                      <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic opacity-40">No active company notices.</p>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
    </div>
  );
}
