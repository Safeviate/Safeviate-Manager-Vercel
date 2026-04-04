'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AircraftForm } from '../aircraft-form';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentUploader } from '@/components/document-uploader';
import { format } from 'date-fns';
import { PlusCircle, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

type Document = NonNullable<Aircraft['documents']>[0];


// Edit Details Dialog
export function EditAircraftDetailsDialog({ aircraft, tenantId, isOpen, onOpenChange }: { aircraft: Aircraft; tenantId: string; isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <AircraftForm
          tenantId={tenantId}
          existingAircraft={aircraft}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Manage Components Dialog
export function ManageComponentsDialog({ aircraft, isOpen, onOpenChange }: { aircraft: Aircraft; tenantId: string; isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const { toast } = useToast();
  const [components, setComponents] = useState<AircraftComponent[]>(aircraft.components || []);

  const handleAddComponent = async () => {
    const nextComponents = [
      ...components,
      {
        id: crypto.randomUUID(),
        manufacturer: '',
        name: 'New Component',
        partNumber: '',
        serialNumber: '',
        installDate: new Date().toISOString(),
        installHours: 0,
        maxHours: 0,
        notes: '',
        tsn: 0,
        tso: 0,
        totalTime: 0,
      },
    ];

    try {
      const stored = localStorage.getItem('safeviate.aircrafts');
      if (!stored) return;
      const aircrafts = JSON.parse(stored) as Aircraft[];
      const nextAircrafts = aircrafts.map(a => a.id === aircraft.id ? { ...a, components: nextComponents } : a);
      
      localStorage.setItem('safeviate.aircrafts', JSON.stringify(nextAircrafts));
      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
      
      setComponents(nextComponents);
      toast({ title: 'Component Added' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Unable to add this component locally.',
      });
    }
  };

  const handleRemoveComponent = async (componentId: string) => {
    const nextComponents = components.filter((component) => component.id !== componentId);

    try {
      const stored = localStorage.getItem('safeviate.aircrafts');
      if (!stored) return;
      const aircrafts = JSON.parse(stored) as Aircraft[];
      const nextAircrafts = aircrafts.map(a => a.id === aircraft.id ? { ...a, components: nextComponents } : a);
      
      localStorage.setItem('safeviate.aircrafts', JSON.stringify(nextAircrafts));
      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

      setComponents(nextComponents);
      toast({ title: 'Component Removed' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Unable to remove this component locally.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-xl font-black uppercase">Fleet Components</DialogTitle>
          <DialogDescription className="text-xs font-medium uppercase text-muted-foreground">Manage tracked parts and life-limited components for {aircraft.tailNumber}.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase font-black">Component Name</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Serial #</TableHead>
                <TableHead className="text-[10px] uppercase font-black">Installed At</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-bold">{comp.name}</TableCell>
                  <TableCell className="font-mono text-xs">{comp.serialNumber || 'N/A'}</TableCell>
                  <TableCell className="text-xs">{comp.installHours}h</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveComponent(comp.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="p-6 border-t bg-muted/5">
          <Button onClick={handleAddComponent} className="gap-2 text-[10px] font-black uppercase">
            <PlusCircle className="h-4 w-4" /> Add Component
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
