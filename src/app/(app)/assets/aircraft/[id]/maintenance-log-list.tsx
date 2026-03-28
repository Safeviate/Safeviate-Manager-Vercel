
'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import type { MaintenanceLog } from '@/types/maintenance';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, WandSparkles } from 'lucide-react';
import { callAiFlow } from '@/lib/ai-client';
import type { SummarizeMaintenanceLogsOutput } from '@/ai/flows/summarize-maintenance-logs';

function MaintenanceSummaryDialog({ logs }: { logs: MaintenanceLog[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');

  const canSummarize = logs.length > 0;

  const handleSummarize = async () => {
    if (!canSummarize) return;

    setIsLoading(true);
    try {
      const maintenanceLogs = logs
        .map(
          log =>
            `Date: ${log.date}\nType: ${log.maintenanceType || 'Unknown'}\nReference: ${
              log.reference || 'N/A'
            }\nDescription: ${log.details || 'N/A'}`
        )
        .join('\n\n---\n\n');

      const result = await callAiFlow<
        { maintenanceLogs: string },
        SummarizeMaintenanceLogsOutput
      >('summarizeMaintenanceLogs', { maintenanceLogs });

      setSummary(result.summary);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!canSummarize}>
          <WandSparkles className="h-4 w-4" />
          AI Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Maintenance Log Summary</DialogTitle>
          <DialogDescription>
            Generate an AI summary of recent maintenance activity for this aircraft.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted/20 p-4 text-sm whitespace-pre-wrap">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Summarizing logs...
            </div>
          ) : summary ? (
            summary
          ) : (
            'No summary generated yet.'
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSummarize} disabled={isLoading || !canSummarize}>
            {isLoading ? 'Summarizing...' : 'Generate Summary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceLogList({ aircraftId, tenantId }: { aircraftId: string, tenantId: string }) {
  const firestore = useFirestore();

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: logs, isLoading } = useCollection<MaintenanceLog>(logsQuery);

  if (isLoading) return <div>Loading logs...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <MaintenanceSummaryDialog logs={logs || []} />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Procedure</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs && logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'PPP')}</TableCell>
                  <TableCell className="font-medium">{log.details}</TableCell>
                  <TableCell>{log.reference || 'N/A'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  No maintenance logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
