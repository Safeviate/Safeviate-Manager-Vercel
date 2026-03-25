'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Layers } from 'lucide-react';
import { ColorThemeForm } from '../../settings/color-theme-form';
import { VisibilityManager } from './visibility-manager';
import { usePermissions } from '@/hooks/use-permissions';
import { MainPageHeader } from '@/components/page-header';

export default function PageFormatPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('admin-settings-manage');

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
        <Tabs defaultValue="branding" className="flex-1 flex flex-col overflow-hidden">
          <MainPageHeader title="Page Formatting" />

          <div className="border-b bg-muted/5 px-6 py-3 overflow-x-auto no-scrollbar">
            <div className="flex w-max gap-2 pr-6 flex-nowrap">
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                <TabsTrigger 
                  value="branding" 
                  className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2 text-[10px] font-black uppercase shrink-0 transition-all"
                >
                  <Palette className="h-3.5 w-3.5" /> Branding & Colors
                </TabsTrigger>
                <TabsTrigger 
                  value="visibility" 
                  className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2 text-[10px] font-black uppercase shrink-0 transition-all"
                >
                  <Layers className="h-3.5 w-3.5" /> Access & Visibility
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

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
