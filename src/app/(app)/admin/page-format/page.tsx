'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Layers, PanelsTopLeft, Settings2 } from 'lucide-react';
import { ColorThemeForm } from '../../settings/color-theme-form';
import { VisibilityManager } from './visibility-manager';
import { usePermissions } from '@/hooks/use-permissions';

export default function PageFormatPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('admin-settings-manage');

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Access Restricted.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Page Format</h1>
        <p className="text-muted-foreground">Manage organization branding, module availability, and UI tab visibility.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <Tabs defaultValue="branding" className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="shrink-0 border-b bg-muted/5 p-4 md:p-6">
            <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
              <TabsTrigger 
                value="branding" 
                className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2 text-xs font-bold uppercase tracking-tight"
              >
                <Palette className="h-4 w-4" /> Branding & Colors
              </TabsTrigger>
              <TabsTrigger 
                value="visibility" 
                className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2 text-xs font-bold uppercase tracking-tight"
              >
                <Layers className="h-4 w-4" /> Access & Visibility
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden bg-background">
            <TabsContent value="branding" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-0">
                  <ColorThemeForm />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="visibility" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-6">
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