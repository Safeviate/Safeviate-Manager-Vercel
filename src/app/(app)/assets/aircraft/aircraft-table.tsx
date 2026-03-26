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
import { Settings2 } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';
import { doc } from 'firebase/firestore';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';

interface AircraftTableProps {
  aircraft: Aircraft[];
  tenantId: string;
}

export function AircraftTable({ aircraft, tenantId }: AircraftTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = (id: string, tail: string) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({ title: 'Aircraft Deleted', description: `${tail} has been removed from the fleet.` });
  };

  if (aircraft.length === 0) {
    return <div className="text-center p-8 text-muted-foreground italic">No aircraft registered in the fleet.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase font-bold">Tail Number</TableHead>
          <TableHead className="text-xs uppercase font-bold">Make/Model</TableHead>
          <TableHead className="text-xs uppercase font-bold text-right">Hobbs</TableHead>
          <TableHead className="text-xs uppercase font-bold text-right">Tacho</TableHead>
          <TableHead className="text-xs uppercase font-bold">Status</TableHead>
          <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aircraft.map((ac) => (
          <TableRow key={ac.id}>
            <TableCell className="font-bold text-primary">{ac.tailNumber}</TableCell>
            <TableCell className="text-xs">{ac.make} {ac.model}</TableCell>
            <TableCell className="text-right font-mono text-xs">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
            <TableCell className="text-right font-mono text-xs">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
            <TableCell><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Airworthy</Badge></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <ViewActionButton href={`/assets/aircraft/${ac.id}`} />
                <DeleteActionButton
                  title="Delete Aircraft?"
                  description={`This will permanently remove ${ac.tailNumber} and all its technical records.`}
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
