'use client';

import { useMemo, useState } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListFilter } from 'lucide-react';

export default function AlertsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('red-tags');

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

  const tabs = [
    { value: 'red-tags', label: 'Red Tags', count: redTags.length },
    { value: 'yellow-tags', label: 'Yellow Tags', count: yellowTags.length },
    { value: 'company-notices', label: 'Company Notices', count: companyNotices.length },
  ];

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
            <MainPageHeader 
              title="Operations Alerts"
              actions={canCreateAlerts && <AlertForm tenantId={tenantId} />}
            />
            
            <div className="border-b bg-muted/5 px-6 py-3 shrink-0">
                {isMobile ? (
                    <Select value={activeTab} onValueChange={setActiveTab}>
                        <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase h-9">
                            <SelectValue placeholder="Select Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            {tabs.map((tab) => (
                                <SelectItem key={tab.value} value={tab.value} className="text-[10px] font-bold uppercase">
                                    <div className="flex items-center gap-2">
                                        <ListFilter className="h-3.5 w-3.5" />
                                        {tab.label} ({tab.count})
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="flex w-max gap-2 pr-6 flex-nowrap">
                        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                            {tabs.map((tab) => (
                                <TabsTrigger 
                                    key={tab.value} 
                                    value={tab.value} 
                                    className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase transition-all"
                                >
                                    {tab.label} ({tab.count})
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                )}
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
