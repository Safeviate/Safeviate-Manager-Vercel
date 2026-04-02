'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from '@/components/page-header';
import { Wrench } from 'lucide-react';

export default function MaintenanceSchedulePage() {
  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden p-4">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader
          title="Maintenance Schedule"
          description="Track upcoming aircraft maintenance events, inspections, and time-limited components. (Under development)"
        />
        <CardContent className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border animate-pulse">
                <Wrench className="h-8 w-8 text-primary/50" />
            </div>
            <div className="text-center">
                <p className="font-bold text-lg uppercase tracking-tight text-foreground">Maintenance Schedule System</p>
                <p className="text-sm">This module is currently being built to handle dynamic aircraft hours and cycle tracking. (Under development)</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
