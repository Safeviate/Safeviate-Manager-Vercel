'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, AlertCircle, Megaphone, ScrollText, HelpCircle, FileSearch, Calculator, MoreVertical, Building } from 'lucide-react';
import { MainPageHeader } from "@/components/page-header";
import { ContactsTab } from './contacts-tab';
import { TriggersTab } from './triggers-tab';
import { MediaTab } from './media-tab';
import { DiaryTab } from './diary-tab';
import { PhasesTab } from './phases-tab';
import { DocumentsTab } from './documents-tab';
import { EstimatorTab } from './estimator-tab';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import type { ExternalOrganization } from '@/types/quality';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EmergencyResponsePage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { shouldShowOrganizationTabs } = useOrganizationScope();
  const [activeCompanyTab, setActiveCompanyTab] = useState('internal');
  const [activeTab, setActiveTab] = useState('diary');
  const isMobile = useIsMobile();

  const organizationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId || 'safeviate'}/external-organizations`)) : null),
    [firestore, tenantId]
  );
  const { data: organizations } = useCollection<ExternalOrganization>(organizationsQuery);

  const tabs = [
    { value: 'diary', label: 'Live Diary', icon: ScrollText },
    { value: 'estimator', label: 'Safety Estimator', icon: Calculator },
    { value: 'documents', label: 'Evidence & Docs', icon: FileSearch },
    { value: 'contacts', label: 'Emergency Contacts', icon: Phone },
    { value: 'triggers', label: 'Response Triggers', icon: AlertCircle },
    { value: 'media', label: 'Media Release', icon: Megaphone },
    { value: 'phases', label: 'Phases Guide', icon: HelpCircle },
  ];

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-4 h-full overflow-hidden px-2 sm:px-4 pt-2">
      <Card className="w-full flex-1 flex flex-col min-h-0 overflow-hidden shadow-none border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
          <MainPageHeader 
            title="Emergency Response Plan"
          />
          
          {shouldShowOrganizationTabs && (
            <div className="border-b bg-muted/5 px-4 py-2 overflow-x-auto no-scrollbar">
              {isMobile ? (
                <Select value={activeCompanyTab} onValueChange={setActiveCompanyTab}>
                  <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase h-9">
                    <SelectValue placeholder="Select Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal" className="text-[10px] font-bold uppercase">
                      <div className="flex items-center gap-2">
                        <Building className="h-3.5 w-3.5" />
                        Internal
                      </div>
                    </SelectItem>
                    {(organizations || []).map((organization) => (
                      <SelectItem key={organization.id} value={organization.id} className="text-[10px] font-bold uppercase">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5" />
                          {organization.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex w-max gap-2 pr-4 flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setActiveCompanyTab('internal')}
                    className={cn(
                      "rounded-full border px-4 py-1 text-[10px] font-bold uppercase shrink-0 transition-colors",
                      activeCompanyTab === 'internal' ? "bg-button-primary text-button-primary-foreground border-button-primary" : "bg-transparent hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    Internal
                  </button>
                  {(organizations || []).map((organization) => (
                    <button
                      key={organization.id}
                      type="button"
                      onClick={() => setActiveCompanyTab(organization.id)}
                      className={cn(
                        "rounded-full border px-4 py-1 text-[10px] font-bold uppercase shrink-0 transition-colors",
                        activeCompanyTab === organization.id ? "bg-button-primary text-button-primary-foreground border-button-primary" : "bg-transparent hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {organization.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-b bg-muted/5 px-4 py-2 overflow-x-auto no-scrollbar">
            {isMobile ? (
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase h-9">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value} className="text-[10px] font-bold uppercase">
                      <div className="flex items-center gap-2">
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-4 flex-nowrap">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value} 
                    className="rounded-full px-5 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2 text-[10px] font-bold uppercase"
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
          </div>

          <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
            <TabsContent value="diary" className="m-0 h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
              <DiaryTab tenantId={tenantId || 'safeviate'} />
            </TabsContent>
            <TabsContent value="estimator" className="m-0 h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
              <EstimatorTab />
            </TabsContent>
            <TabsContent value="documents" className="m-0 h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
              <DocumentsTab tenantId={tenantId || 'safeviate'} />
            </TabsContent>
            <TabsContent value="contacts" className="m-0 h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
              <ContactsTab tenantId={tenantId || 'safeviate'} />
            </TabsContent>
            <TabsContent value="triggers" className="m-0 h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
              <TriggersTab tenantId={tenantId || 'safeviate'} />
            </TabsContent>
            <TabsContent value="media" className="m-0 h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
              <MediaTab tenantId={tenantId || 'safeviate'} />
            </TabsContent>
            <TabsContent value="phases" className="m-0 h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
              <PhasesTab />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
