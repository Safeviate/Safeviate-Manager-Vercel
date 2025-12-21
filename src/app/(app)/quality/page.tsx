
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QualityDashboard from './quality-dashboard';
import AuditChecklistsManager from './audit-checklists-manager';
import CapTracker from './cap-tracker';

export default function QualityPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Quality Assurance</h1>
                <p className="text-muted-foreground">
                    Manage audits, checklists, and corrective action plans.
                </p>
            </div>
        </div>
        <Tabs defaultValue="dashboard">
            <TabsList>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="checklists">Audit Checklists</TabsTrigger>
                <TabsTrigger value="cap">CAP Tracker</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="mt-6">
                <QualityDashboard />
            </TabsContent>
            <TabsContent value="checklists" className="mt-6">
                <AuditChecklistsManager />
            </TabsContent>
            <TabsContent value="cap" className="mt-6">
                <CapTracker />
            </TabsContent>
        </Tabs>
    </div>
  );
}
