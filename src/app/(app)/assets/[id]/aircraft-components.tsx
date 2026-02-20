'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AircraftComponentsProps {
  aircraft: Aircraft | null;
  tenantId: string;
  aircraftId: string;
}

export function AircraftComponents({ aircraft, tenantId, aircraftId }: AircraftComponentsProps) {
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [installDate, setInstallDate] = useState<Date | undefined>();
  const [installHours, setInstallHours] = useState<number | ''>('');
  const [maxHours, setMaxHours] = useState<number | ''>('');
  const [tsn, setTsn] = useState<number | ''>('');
  const [tso, setTso] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (aircraft) {
      setComponents(aircraft.components || []);
    }
  }, [aircraft]);

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    if (component) {
      setName(component.name);
      setPartNumber(component.partNumber);
      setSerialNumber(component.serialNumber || '');
      setInstallDate(component.installDate ? new Date(component.installDate) : undefined);
      setInstallHours(component.installHours || '');
      setMaxHours(component.maxHours || '');
      setTsn(component.tsn || '');
      setTso(component.tso || '');
      setNotes(component.notes || '');
    } else {
      // Reset form for new component
      setName('');
      setPartNumber('');
      setSerialNumber('');
      setInstallDate(undefined);
      setInstallHours('');
      setMaxHours('');
      setTsn('');
      setTso('');
      setNotes('');
    }
    setIsDialogOpen(true);
  };

  const handleRemoveComponent = (componentId: string) => {
    const updatedComponents = components.filter(c => c.id !== componentId);
    setComponents(updatedComponents);

    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Component Removed' });
  };

  const onSubmit = () => {
    if (!name || !partNumber) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Component Name and Part Number are required.',
      });
      return;
    }

    const newOrUpdatedComponent: AircraftComponent = {
      id: editingComponent?.id || uuidv4(),
      name,
      partNumber,
      serialNumber,
      installDate: installDate?.toISOString(),
      installHours: Number(installHours) || undefined,
      maxHours: Number(maxHours) || undefined,
      tsn: Number(tsn) || undefined,
      tso: Number(tso) || undefined,
      notes,
    };

    let updatedComponents;
    if (editingComponent) {
      updatedComponents = components.map(c => (c.id === editingComponent.id ? newOrUpdatedComponent : c));
    } else {
      updatedComponents = [...components, newOrUpdatedComponent];
    }
    setComponents(updatedComponents);

    if (!firestore) return;
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Component
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Part No.</TableHead>
            <TableHead>Serial No.</TableHead>
            <TableHead>TSN</TableHead>
            <TableHead>TSO</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {components.map(component => (
              <TableRow key={component.id}>
                <TableCell>{component.name}</TableCell>
                <TableCell>{component.partNumber}</TableCell>
                <TableCell>{component.serialNumber}</TableCell>
                <TableCell>{component.tsn ?? 'N/A'}</TableCell>
                <TableCell>{component.tso ?? 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(component)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveComponent(component.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          {components.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No components added yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
            <DialogDescription>
              {editingComponent ? 'Update the details for this component.' : 'Add a new component to this aircraft.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="partNumber">Part Number</Label>
                    <Input id="partNumber" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installDate">Install Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !installDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {installDate ? format(installDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent onInteractOutside={(e) => e.preventDefault()} className="w-auto p-0">
                       <CustomCalendar 
                          selectedDate={installDate} 
                          onDateSelect={(date) => {
                            if (date) {
                              setInstallDate(date);
                            }
                          }}
                       />
                    </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="installHours">Install Hours</Label>
                <Input id="installHours" type="number" value={installHours} onChange={e => setInstallHours(Number(e.target.value))} />
              </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="maxHours">Max Hours</Label>
                    <Input id="maxHours" type="number" value={maxHours} onChange={e => setMaxHours(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tsn">Time Since New (TSN)</Label>
                    <Input id="tsn" type="number" value={tsn} onChange={e => setTsn(Number(e.target.value))} />
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="tso">Time Since Overhaul (TSO)</Label>
                <Input id="tso" type="number" value={tso} onChange={e => setTso(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={onSubmit}>{editingComponent ? 'Save Changes' : 'Add Component'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
