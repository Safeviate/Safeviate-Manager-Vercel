'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SafetyReportsPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Safety Reports</h1>
          <p className="text-muted-foreground">
            View and manage all filed safety reports.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          File Safety Report
        </Button>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Filed Reports</CardTitle>
            <CardDescription>A list of all submitted safety reports.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No safety reports have been filed.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}