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
import type { Aircraft } from '@/types/aircraft';
import { useToast } from '@/hooks/use-toast';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';

interface AircraftTableProps {
  aircraft: Aircraft[];
  tenantId: string;
}

export function AircraftTable({ aircraft }: AircraftTableProps) {
  const { toast } = useToast();

  const handleDelete = (id: string, tail: string) => {
    try {
        const stored = localStorage.getItem('safeviate.aircrafts');
        if (!stored) return;
        
        const aircrafts = JSON.parse(stored) as Aircraft[];
        const nextAircrafts = aircrafts.filter(a => a.id !== id);
        
        localStorage.setItem('safeviate.aircrafts', JSON.stringify(nextAircrafts));
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        
        toast({ title: 'Aircraft Removed', description: `${tail} has been permanently deleted from the local inventory.` });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Failed to remove aircraft from storage.' });
    }
  };

  if (aircraft.length === 0) {
    return (
        <div className="text-center p-20 bg-muted/5 rounded-3xl border-2 border-dashed m-8">
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-50 italic">No aircraft registered in the fleet inventory.</p>
        </div>
    );
  }

  return (
    <Table>
      <TableHeader className="bg-muted/30 sticky top-0 z-10">
        <TableRow>
          <TableHead className="text-[10px] uppercase font-black tracking-widest px-8">Tail Number</TableHead>
          <TableHead className="text-[10px] uppercase font-black tracking-widest">Manufacturer / Model</TableHead>
          <TableHead className="text-[10px] uppercase font-black tracking-widest text-right">Current Hobbs</TableHead>
          <TableHead className="text-[10px] uppercase font-black tracking-widest text-right">Current Tacho</TableHead>
          <TableHead className="text-[10px] uppercase font-black tracking-widest">Status</TableHead>
          <TableHead className="text-right text-[10px] uppercase font-black tracking-widest pr-8">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircraft.map((ac) => (
          <TableRow key={ac.id} className="hover:bg-muted/5 transition-colors group">
            <TableCell className="font-black text-primary px-8 text-sm uppercase tracking-tight">{ac.tailNumber}</TableCell>
            <TableCell className="text-xs font-black uppercase tracking-tight opacity-70">{ac.make} {ac.model}</TableCell>
            <TableCell className="text-right font-mono text-[11px] font-black">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
            <TableCell className="text-right font-mono text-[11px] font-black">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
            <TableCell>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase h-7 px-4 shadow-sm">
                    Airworthy
                </Badge>
            </TableCell>
            <TableCell className="text-right pr-8">
              <div className="flex justify-end gap-2">
                <ViewActionButton href={`/assets/aircraft/${ac.id}`} />
                <DeleteActionButton
                  title="Remove Aircraft?"
                  description={`This will permanently remove ${ac.tailNumber} and all its associated technical records from the local system.`}
                  onDelete={() => handleDelete(ac.id, ac.tailNumber)}
                  srLabel="Delete aircraft"
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
