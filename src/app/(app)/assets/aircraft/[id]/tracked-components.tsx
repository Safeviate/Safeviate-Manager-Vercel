'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AircraftComponent } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Settings2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface TrackedComponentsProps {
  aircraftId: string;
  tenantId: string;
}

export function TrackedComponents({ aircraftId }: TrackedComponentsProps) {
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadComponents = useCallback(async () => {
    try {
        const response = await fetch(`/api/aircraft/${aircraftId}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ aircraft: null }));
        setComponents((payload.aircraft?.components || []) as AircraftComponent[]);
    } catch (e) {
        console.error("Failed to load local components", e);
    } finally {
        setIsLoading(false);
    }
  }, [aircraftId]);

  useEffect(() => {
    loadComponents();
    window.addEventListener('safeviate-aircrafts-updated', loadComponents);
    return () => window.removeEventListener('safeviate-aircrafts-updated', loadComponents);
  }, [loadComponents]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  return (
    <div className="rounded-3xl border-2 overflow-hidden bg-background shadow-sm">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Part Information</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Serial Number</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">TSN (H)</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">TSO (H)</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Remaining</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components && components.length > 0 ? (
            components.map((comp) => {
              const maxHours = 2000; // Mock threshold for default illustration
              const remaining = Math.max(0, maxHours - (comp.tsn || 0));
              const status = remaining < 50 ? 'Critical' : remaining < 200 ? 'Caution' : 'Optimal';
              
              return (
                <TableRow key={comp.id} className="hover:bg-muted/5 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-black text-xs uppercase tracking-tight text-primary">{comp.name}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{comp.manufacturer}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-[10px] font-black bg-muted/40 px-3 py-1 rounded border border-slate-200 uppercase">{comp.serialNumber}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[11px] font-black">{(comp.tsn || 0).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono text-[11px] font-black">{(comp.tso || 0).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono text-[11px] font-black text-primary">
                    <div className="flex items-center justify-end gap-1.5">
                        <Clock className="h-3 w-3 opacity-30" />
                        {remaining.toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Badge variant="outline" className={Object.assign({
                        "Critical": "bg-red-50 text-red-700 border-red-200",
                        "Caution": "bg-amber-50 text-amber-700 border-amber-200",
                        "Optimal": "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }[status] || "", " text-[9px] font-black uppercase h-7 px-4 shadow-sm")}>
                      {status === 'Optimal' && <CheckCircle2 className="h-2.5 w-2.5 mr-1.5" />}
                      {status === 'Caution' && <AlertTriangle className="h-2.5 w-2.5 mr-1.5" />}
                      {status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-48 text-center text-muted-foreground bg-muted/5">
                <div className="flex flex-col items-center justify-center gap-3 opacity-30 grayscale pt-8">
                    <Settings2 className="h-10 w-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">No technical components registered for hourly tracking.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
