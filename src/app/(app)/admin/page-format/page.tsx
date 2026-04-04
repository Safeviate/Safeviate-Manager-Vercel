'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Layers } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { MainPageHeader } from '@/components/page-header';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';
import { Skeleton } from '@/components/ui/skeleton';

const ColorThemeForm = dynamic(
  () => import('../../settings/color-theme-form').then((module) => module.ColorThemeForm),
  { ssr: false }
);

const VisibilityManager = dynamic(
  () => import('./visibility-manager').then((module) => module.VisibilityManager),
  { ssr: false }
);

export default function PageFormatPage() {
  const { hasPermission, isLoading: isPermissionsLoading } = usePermissions();
  const canManage = hasPermission('admin-settings-manage');
  const [activeTab, setActiveTab] = useState('branding');

  if (isPermissionsLoading) {
    return (
      <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground bg-muted/20 px-4 py-2 border rounded-full">Access Restricted</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <MainPageHeader title="Page Formatting" />

          <ResponsiveTabRow
            value={activeTab}
            onValueChange={setActiveTab}
            placeholder="Select Section"
            className="border-b bg-muted/5 px-6 py-3 shrink-0"
            options={[
              { value: 'branding', label: 'Branding & Colors', icon: Palette },
              { value: 'visibility', label: 'Access & Visibility', icon: Layers },
            ]}
          />

          <CardContent className="flex-1 p-0 overflow-hidden bg-background">
            <TabsContent value="branding" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-0">
                  <ColorThemeForm showHeader={false} />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="visibility" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-4 lg:p-6">
                  <VisibilityManager />
                </div>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
