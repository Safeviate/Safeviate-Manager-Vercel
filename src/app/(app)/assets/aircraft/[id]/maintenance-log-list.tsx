'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
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
import { Loader2, WandSparkles, History, FileText, Calendar } from 'lucide-react';
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
        <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm border-2" disabled={!canSummarize}>
          <WandSparkles className="h-4 w-4 text-primary" />
          AI Analysis Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-3xl border-2 shadow-2xl overflow-hidden">
        <DialogHeader className="p-8 border-b bg-muted/5">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Maintenance intelligence</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            AI-generated synthesis of historical maintenance patterns and compliance status.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-8">
          <div className="rounded-2xl border-2 bg-muted/5 p-6 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-widest">Processing Data Streams...</p>
              </div>
            ) : summary ? (
              summary
            ) : (
              <p className="text-center py-10 text-muted-foreground italic">No historical analysis has been requested yet.</p>
            )}
          </div>
        </div>
        <DialogFooter className="p-8 border-t bg-muted/5">
          <Button onClick={handleSummarize} className="h-12 px-10 text-[10px] font-black uppercase shadow-lg" disabled={isLoading || !canSummarize}>
            {isLoading ? 'Synthesizing...' : 'Generate New Synthesis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceLogList({ aircraftId }: { aircraftId: string, tenantId: string }) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/aircraft/${aircraftId}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({ aircraft: null }));
      const nextLogs = ((payload.aircraft?.maintenanceLogs as MaintenanceLog[]) || []).slice().sort((a, b) => b.date.localeCompare(a.date));
      setLogs(nextLogs);
    } catch (e) {
      console.error('Failed to load logs', e);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [aircraftId]);

  useEffect(() => {
    loadLogs();
    window.addEventListener('safeviate-aircrafts-updated', loadLogs);
    return () => window.removeEventListener('safeviate-aircrafts-updated', loadLogs);
  }, [loadLogs]);

  if (isLoading) return (
    <div className="py-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest">Querying Technical Logbook...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-tight">Technical Log History</h3>
        </div>
        <MaintenanceSummaryDialog logs={logs || []} />
      </div>
      <div className="rounded-2xl border-2 shadow-sm overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/5">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="text-[10px] font-black uppercase tracking-widest h-12"><div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Date</div></TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest h-12"><div className="flex items-center gap-2"><FileText className="h-3 w-3" /> Technical Statement</div></TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Authorization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs && logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="whitespace-nowrap font-bold text-sm">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="py-4">
                    <p className="text-sm font-medium text-foreground leading-relaxed">{log.details}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase mt-2 tracking-widest">Category: {log.maintenanceType}</p>
                  </TableCell>
                  <TableCell className="w-48">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-tight text-primary">AME: {log.ameNo}</span>
                      <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">AMO: {log.amoNo}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/60">{log.reference || 'NO REF'}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center opacity-40">
                    <History className="h-10 w-10 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Null Log Record</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
