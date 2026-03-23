'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, AlertCircle, Megaphone, ScrollText, HelpCircle, FileSearch, Calculator } from 'lucide-react';
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

export default function EmergencyResponsePage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { shouldShowOrganizationTabs } = useOrganizationScope();
  const [activeCompanyTab, setActiveCompanyTab] = useState('internal');

  const organizationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId || 'safeviate'}/external-organizations`)) : null),
    [firestore, tenantId]
  );
  const { data: organizations } = useCollection<ExternalOrganization>(organizationsQuery);

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-2 sm:px-4">
      <Card className="w-full flex-1 flex flex-col min-h-0 overflow-hidden shadow-none border">
        <Tabs defaultValue="diary" className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="shrink-0 bg-card space-y-1">
            <div className="space-y-1">
              <CardTitle>Emergency Response Plan</CardTitle>
              <CardDescription>
                Standardized protocols and real-time response management for aviation emergencies.
              </CardDescription>
            </div>
          </CardHeader>

          {shouldShowOrganizationTabs && (
            <div className="border-y border-card-border bg-card px-6 py-4">
              <div className="overflow-x-auto no-scrollbar">
                <div className="flex min-w-max gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCompanyTab('internal')}
                    className={`rounded-full border px-6 py-2 text-sm font-medium shrink-0 ${activeCompanyTab === 'internal' ? 'bg-button-primary text-button-primary-foreground' : 'bg-transparent'}`}
                  >
                    Internal
                  </button>
                  {(organizations || []).map((organization) => (
                    <button
                      key={organization.id}
                      type="button"
                      onClick={() => setActiveCompanyTab(organization.id)}
                      className={`rounded-full border px-6 py-2 text-sm font-medium shrink-0 ${activeCompanyTab === organization.id ? 'bg-button-primary text-button-primary-foreground' : 'bg-transparent'}`}
                    >
                      {organization.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="border-b border-card-border px-6 py-4">
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start w-full flex min-w-max">
                <TabsTrigger value="diary" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
                  <ScrollText className="h-4 w-4" /> Live Diary
                </TabsTrigger>
                <TabsTrigger value="estimator" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
                  <Calculator className="h-4 w-4" /> Safety Estimator
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
                  <FileSearch className="h-4 w-4" /> Evidence & Docs
                </TabsTrigger>
                <TabsTrigger value="contacts" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
                  <Phone className="h-4 w-4" /> Emergency Contacts
                </TabsTrigger>
                <TabsTrigger value="triggers" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
                  <AlertCircle className="h-4 w-4" /> Response Triggers
                </TabsTrigger>
                <TabsTrigger value="media" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
                  <Megaphone className="h-4 w-4" /> Media Release
                </TabsTrigger>
                <TabsTrigger value="phases" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
                  <HelpCircle className="h-4 w-4" /> Emergency Phases Guide
                </TabsTrigger>
              </TabsList>
            </div>
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
