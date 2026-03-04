
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
import { Trash2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { AircraftComponent } from '@/types/aircraft';
import { ComponentForm } from './component-form';

interface ComponentsTableProps {
  data: AircraftComponent[];
  tenantId: string;
  aircraftId: string;
  canManage: boolean;
}

export function ComponentsTable({ data, tenantId, aircraftId, canManage }: ComponentsTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = (id: string, name: string) => {
    if (!firestore) return;
    const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, id);
    deleteDocumentNonBlocking(componentRef);
    toast({ title: 'Component Removed', description: `${name} is no longer being tracked.` });
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">No components tracked for this aircraft.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Manufacturer</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>Install Date</TableHead>
            <TableHead className="text-right">TSN</TableHead>
            <TableHead className="text-right">TSO</TableHead>
            <TableHead className="text-right">Total Time</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((comp) => (
            <TableRow key={comp.id}>
              <TableCell className="font-medium">{comp.name}</TableCell>
              <TableCell>{comp.manufacturer}</TableCell>
              <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
              <TableCell>{comp.installDate}</TableCell>
              <TableCell className="text-right font-mono">{comp.tsn.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{comp.tso.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{comp.totalTime.toFixed(1)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {canManage && (
                    <>
                      <ComponentForm
                        tenantId={tenantId}
                        aircraftId={aircraftId}
                        existingComponent={comp}
                        trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
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
