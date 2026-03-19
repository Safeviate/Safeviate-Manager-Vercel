'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, AlertCircle, Megaphone, ScrollText, Play, HelpCircle, FileSearch, Calculator } from 'lucide-react';
import { ContactsTab } from './contacts-tab';
import { TriggersTab } from './triggers-tab';
import { MediaTab } from './media-tab';
import { DiaryTab } from './diary-tab';
import { PhasesTab } from './phases-tab';
import { DocumentsTab } from './documents-tab';
import { EstimatorTab } from './estimator-tab';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function EmergencyResponsePage() {
  const { tenantId } = useUserProfile();

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1">
        <h1 className="text-3xl font-bold tracking-tight">Emergency Response Plan</h1>
        <p className="text-muted-foreground">Standardized protocols and real-time response management for aviation emergencies.</p>
      </div>

      <Tabs defaultValue="diary" className="w-full flex-1 flex flex-col min-h-0">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
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

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-10">
          <TabsContent value="diary" className="m-0 h-full">
            <DiaryTab tenantId={tenantId || 'safeviate'} />
          </TabsContent>
          <TabsContent value="estimator" className="m-0">
            <EstimatorTab />
          </TabsContent>
          <TabsContent value="documents" className="m-0">
            <DocumentsTab tenantId={tenantId || 'safeviate'} />
          </TabsContent>
          <TabsContent value="contacts" className="m-0">
            <ContactsTab tenantId={tenantId || 'safeviate'} />
          </TabsContent>
          <TabsContent value="triggers" className="m-0">
            <TriggersTab tenantId={tenantId || 'safeviate'} />
          </TabsContent>
          <TabsContent value="media" className="m-0">
            <MediaTab tenantId={tenantId || 'safeviate'} />
          </TabsContent>
          <TabsContent value="phases" className="m-0">
            <PhasesTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
