
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
import { Edit, Trash2 } from 'lucide-react';
import type { AircraftComponent } from '@/types/aircraft';
import { format } from 'date-fns';
import { doc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ComponentForm } from './component-form';

interface ComponentListProps {
  components: AircraftComponent[];
  isLoading: boolean;
  aircraftId: string;
  tenantId: string;
}

export function ComponentList({ components, isLoading, aircraftId, tenantId }: ComponentListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Are you sure you want to delete this component?')) return;
    try {
      await deleteDoc(doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, id));
      toast({ title: 'Component deleted' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading components...</div>;

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
          {components.length > 0 ? (
            components.map((comp) => (
              <TableRow key={comp.id}>
                <TableCell className="font-semibold">{comp.name}</TableCell>
                <TableCell>{comp.manufacturer}</TableCell>
                <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                <TableCell className="text-right font-mono font-bold text-primary">{comp.totalTime?.toFixed(1) || '0.0'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ComponentForm 
                      aircraftId={aircraftId} 
                      tenantId={tenantId} 
                      existingComponent={comp}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      } 
                    />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(comp.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                No components tracked for this aircraft.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
