'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplatesTab } from './templates-tab';

export default function MassBalancePage() {
    return (
        <div className="flex flex-col gap-6 h-full">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mass & Balance</h1>
                    <p className="text-muted-foreground">Manage reusable W&B profiles for your aircraft models.</p>
                </div>
            </div>
            <Tabs defaultValue="templates" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>
                <TabsContent value="templates">
                    <TemplatesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
