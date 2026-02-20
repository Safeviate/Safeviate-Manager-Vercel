'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// --- Sub-component for the form ---
interface ComponentFormProps {
  component: Partial<AircraftComponent> | null;
  onSubmit: (formData: Omit<AircraftComponent, 'id'>) => void;
  onCancel: () => void;
}

function ComponentForm({ component, onSubmit, onCancel }: ComponentFormProps) {
  const [formData, setFormData] = useState<Omit<AircraftComponent, 'id'>>({
    name: component?.name || '',
    partNumber: component?.partNumber || '',
    serialNumber: component?.serialNumber || '',
    installDate: component?.installDate || '',
    installHours: component?.installHours || 0,
    maxHours: component?.maxHours || 0,
    tsn: component?.tsn || 0,
    tso: component?.tso || 0,
    notes: component?.notes || '',
  });

  const handleChange = (field: keyof Omit<AircraftComponent, 'id'>, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
        setFormData(prev => ({ ...prev, installDate: date.toISOString() }));
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Component Name</Label>
          <Input id="name" value={formData.name} onChange={e => handleChange('name', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partNumber">Part Number</Label>
          <Input id="partNumber" value={formData.partNumber} onChange={e => handleChange('partNumber', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input id="serialNumber" value={formData.serialNumber || ''} onChange={e => handleChange('serialNumber', e.target.value)} />
        </div>
        <div className="space-y-2 flex flex-col">
          <Label htmlFor="installDate">Install Date</Label>
          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !formData.installDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.installDate ? format(new Date(formData.installDate), 'PPP') : <span>Pick a date</span>}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" onInteractOutside={(e) => e.preventDefault()}>
                  <CustomCalendar
                      selectedDate={formData.installDate ? new Date(formData.installDate) : undefined}
                      onDateSelect={handleDateChange}
                  />
              </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="installHours">Install Hours</Label>
          <Input id="installHours" type="number" value={formData.installHours || ''} onChange={e => handleChange('installHours', Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxHours">Max Hours</Label>
          <Input id="maxHours" type="number" value={formData.maxHours || ''} onChange={e => handleChange('maxHours', Number(e.target.value))} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="tsn">TSN (Time Since New)</Label>
            <Input id="tsn" type="number" value={formData.tsn || ''} onChange={e => handleChange('tsn', Number(e.target.value))} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="tso">TSO (Time Since Overhaul)</Label>
            <Input id="tso" type="number" value={formData.tso || ''} onChange={e => handleChange('tso', Number(e.target.value))} />
        </div>
        <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Component</Button>
      </DialogFooter>
    </form>
  );
}

// --- Main Component ---
interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [components, setComponents] = useState<AircraftComponent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  useEffect(() => {
    setComponents(aircraft.components || []);
  }, [aircraft]);

  const handleOpenDialog = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    setIsDialogOpen(true);
  };

  const handleDeleteComponent = (componentId: string) => {
    const updatedComponents = components.filter(c => c.id !== componentId);
    setComponents(updatedComponents);

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Component Deleted' });
  };

  const onSubmit = (formData: Omit<AircraftComponent, 'id'>) => {
    let updatedComponents;
    if (editingComponent) {
      updatedComponents = components.map(c =>
        c.id === editingComponent.id ? { ...editingComponent, ...formData } : c
      );
    } else {
      updatedComponents = [...components, { id: uuidv4(), ...formData }];
    }
    setComponents(updatedComponents);

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: editingComponent ? 'Component Updated' : 'Component Added' });
    setIsDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Components</CardTitle>
              <CardDescription>Trackable components installed on this aircraft.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2" /> Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Install Date</TableHead>
                <TableHead>Install Hours</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead>TSN</TableHead>
                <TableHead>TSO</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length > 0 ? (
                components.map(component => (
                  <TableRow key={component.id}>
                    <TableCell>{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber}</TableCell>
                    <TableCell>{component.installDate ? format(new Date(component.installDate), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{component.installHours}</TableCell>
                    <TableCell>{component.maxHours}</TableCell>
                    <TableCell>{component.tsn}</TableCell>
                    <TableCell>{component.tso}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(component)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteComponent(component.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No components added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
                  <DialogDescription>
                      {editingComponent ? `Editing component: ${editingComponent.name}` : 'Add a new trackable component to this aircraft.'}
                  </DialogDescription>
              </DialogHeader>
              <ComponentForm 
                  component={editingComponent}
                  onSubmit={onSubmit}
                  onCancel={() => setIsDialogOpen(false)}
              />
          </DialogContent>
      </Dialog>
    </>
  );
}