'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Box, PenTool, Hash, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { ComponentForm } from './component-form';

interface ComponentsTableProps {
  data: AircraftComponent[];
  tenantId: string;
  aircraftId: string;
  canManage: boolean;
}

export function ComponentsTable({ data, aircraftId, canManage }: ComponentsTableProps) {
  const { toast } = useToast();

  const handleDelete = (id: string, name: string) => {
    try {
      const stored = localStorage.getItem('safeviate.aircrafts');
      if (!stored) return;
      const aircrafts = JSON.parse(stored) as Aircraft[];
      
      const nextAircrafts = aircrafts.map(a => {
        if (a.id === aircraftId) {
            const nextComponents = (a.components || []).filter(c => c.id !== id);
            return { ...a, components: nextComponents };
        }
        return a;
      });
      
      localStorage.setItem('safeviate.aircrafts', JSON.stringify(nextAircrafts));
      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

      toast({ title: 'Component Removed', description: `The tracking record for ${name} has been purged.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Purge Failed' });
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-24 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-50">
        <Box className="h-10 w-10 text-muted-foreground/30 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No physical components tracked</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 shadow-sm overflow-hidden bg-background">
      <Table>
        <TableHeader className="bg-muted/5">
          <TableRow className="hover:bg-transparent border-b-2">
            <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 px-6"><div className="flex items-center gap-2"><Box className="h-3 w-3" /> Part Entity</div></TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 text-center"><div className="flex items-center justify-center gap-2"><Hash className="h-3 w-3" /> Tracking</div></TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-12">TSN</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-12">TSO</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-12 px-6">Vault</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((comp) => (
            <TableRow key={comp.id} className="hover:bg-muted/5 transition-colors">
              <TableCell className="px-6 py-4">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-black uppercase tracking-tight">{comp.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{comp.manufacturer}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-black border-2 border-slate-200 px-2 rounded-md bg-white">{comp.serialNumber || 'NO_SN'}</span>
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">{comp.partNumber || 'NO_PN'}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-black text-sm text-foreground">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
              <TableCell className="text-right font-black text-sm text-foreground">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
              <TableCell className="px-6 text-right">
                <div className="flex justify-end gap-1">
                  {canManage && (
                    <>
                      <ComponentForm
                        aircraftId={aircraftId}
                        existingComponent={comp}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10">
                                <Info className="h-4 w-4" />
                            </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(comp.id, comp.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
