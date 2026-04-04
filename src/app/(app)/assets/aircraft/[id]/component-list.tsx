'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Box, Hash, Timer, PenTool } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ComponentForm } from './component-form';

interface ComponentListProps {
  components: AircraftComponent[];
  isLoading: boolean;
  aircraftId: string;
  tenantId: string;
}

export function ComponentList({ components, isLoading, aircraftId, tenantId }: ComponentListProps) {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently remove this component from tracking?')) return;
    try {
        const stored = localStorage.getItem('safeviate.aircrafts');
        if (!stored) return;
        const aircrafts = JSON.parse(stored) as Aircraft[];
        
        const nextAircrafts = aircrafts.map(a => {
            if (a.id === aircraftId) {
                return { ...a, components: (a.components || []).filter(c => c.id !== id) };
            }
            return a;
        });

        localStorage.setItem('safeviate.aircrafts', JSON.stringify(nextAircrafts));
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

        toast({ title: 'Component Decommissioned', description: 'The registered part has been removed from the local vault.' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Deletion Failed' });
    }
  };

  if (isLoading) return <div className="text-center p-24 opacity-40 font-black uppercase tracking-widest text-[10px]">Decrypting vault components...</div>;

  return (
    <div className="rounded-[2rem] border-2 overflow-hidden shadow-sm bg-background">
      <Table>
        <TableHeader className="bg-muted/5 border-b-2">
          <TableRow className="hover:bg-transparent border-b-0">
            <TableHead className="px-8 text-[10px] font-black uppercase tracking-widest h-14">Identifier</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Manufacturer</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Serial Number</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Install Date</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-14 px-8">Operational Age</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest h-14 px-8">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.length > 0 ? (
            components.map((comp) => (
              <TableRow key={comp.id} className="hover:bg-muted/5 transition-colors group border-b last:border-b-0">
                <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-white border shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Box className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-sm text-foreground uppercase tracking-tight">{comp.name}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{comp.partNumber || 'NA-PN'}</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="py-5">
                    <div className="flex items-center gap-2">
                        <PenTool className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">{comp.manufacturer}</span>
                    </div>
                </TableCell>
                <TableCell className="py-5 text-center">
                    <span className="text-[10px] font-mono font-black border-2 border-slate-200 px-3 py-1 rounded-lg bg-white shadow-sm uppercase">{comp.serialNumber}</span>
                </TableCell>
                <TableCell className="py-5">
                    <span className="text-xs font-bold uppercase text-muted-foreground">{comp.installDate ? format(new Date(comp.installDate), 'dd MMM y') : 'N/A'}</span>
                </TableCell>
                <TableCell className="text-right px-8 py-5">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-primary uppercase tracking-tight">{(comp.totalTime || 0).toFixed(1)}h Total</span>
                        <div className="flex items-center gap-1.5 mt-0.5 opacity-50">
                            <Timer className="h-2.5 w-2.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">TSN: {(comp.tsn || 0).toFixed(1)}h</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="text-right px-8 py-5">
                  <div className="flex justify-end gap-2">
                    <ComponentForm 
                      aircraftId={aircraftId} 
                      tenantId={tenantId} 
                      existingComponent={comp}
                      trigger={
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2 hover:bg-primary hover:text-white transition-all hover:border-primary">
                          <Edit className="h-4 w-4" />
                        </Button>
                      } 
                    />
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all hover:border-destructive" onClick={() => handleDelete(comp.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center opacity-30">
                    <Hash className="h-10 w-10 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Vault contents empty</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
