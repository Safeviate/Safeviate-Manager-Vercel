
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';

interface ComponentFormState extends Omit<AircraftComponent, 'installDate'> {
  installDate: string;
}

interface AircraftComponentsProps {
    aircraft: Aircraft;
    tenantId: string;
}

function ComponentForm({
  aircraftId,
  tenantId,
  onComponentAdded,
}: {
  aircraftId: string;
  tenantId: string;
  onComponentAdded: (component: AircraftComponent) => void;
}) {
  const [formData, setFormData] = useState<Partial<ComponentFormState>>({});

  const handleSave = () => {
    const newComponent: AircraftComponent = {
      id: uuidv4(),
      name: formData.name || '',
      partNumber: formData.partNumber || '',
      serialNumber: formData.serialNumber || '',
      installDate: formData.installDate ? new Date(formData.installDate).toISOString() : null,
      installHours: Number(formData.installHours) || null,
      maxHours: Number(formData.maxHours) || null,
      notes: formData.notes || '',
    };
    onComponentAdded(newComponent);
  };

  return (
    <div className="grid gap-4 py-4">
      {/* Form fields for component details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="name">Component Name</Label>
            <Input id="name" value={formData.name || ''} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="partNumber">Part Number</Label>
            <Input id="partNumber" value={formData.partNumber || ''} onChange={(e) => setFormData(p => ({...p, partNumber: e.target.value}))} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input id="serialNumber" value={formData.serialNumber || ''} onChange={(e) => setFormData(p => ({...p, serialNumber: e.target.value}))} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="installDate">Install Date</Label>
            <Input id="installDate" type="date" value={formData.installDate || ''} onChange={(e) => setFormData(p => ({...p, installDate: e.target.value}))} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="installHours">Install Hours</Label>
            <Input id="installHours" type="number" value={formData.installHours || ''} onChange={(e) => setFormData(p => ({...p, installHours: Number(e.target.value)}))} />
        </div>
         <div className="space-y-2">
            <Label htmlFor="maxHours">Max Hours</Label>
            <Input id="maxHours" type="number" value={formData.maxHours || ''} onChange={(e) => setFormData(p => ({...p, maxHours: Number(e.target.value)}))} />
        </div>
      </div>
       <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={formData.notes || ''} onChange={(e) => setFormData(p => ({...p, notes: e.target.value}))} />
        </div>
      <Button onClick={handleSave}>Add Component</Button>
    </div>
  );
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  if (!aircraft) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Components</CardTitle>
                <CardDescription>
                    Tracked components installed on this aircraft.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-40 w-full" />
            </CardContent>
        </Card>
    );
  }


  const handleAddComponent = (component: AircraftComponent) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, {
      components: arrayUnion(component),
    });
    toast({
      title: 'Component Added',
      description: `"${component.name}" has been added to the aircraft.`,
    });
    setIsOpen(false);
  };
  
  const handleRemoveComponent = (component: AircraftComponent) => {
    if (!firestore) return;
    if (!window.confirm(`Are you sure you want to delete the component "${component.name}"?`)) return;

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, {
      components: arrayRemove(component),
    });
    toast({
      title: 'Component Removed',
      description: `"${component.name}" has been removed from the aircraft.`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Components</CardTitle>
                <CardDescription>
                    Tracked components installed on this aircraft.
                </CardDescription>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Component</DialogTitle>
                        <DialogDescription>
                            Enter the details for the new component being installed.
                        </DialogDescription>
                    </DialogHeader>
                    <ComponentForm 
                        aircraftId={aircraft.id} 
                        tenantId={tenantId}
                        onComponentAdded={handleAddComponent}
                    />
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Part No.</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead>Install Date</TableHead>
              <TableHead>Install Hours</TableHead>
              <TableHead>Max Hours</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.components || []).length > 0 ? (
              aircraft.components?.map((component) => (
                <TableRow key={component.id}>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>{component.partNumber}</TableCell>
                  <TableCell>{component.serialNumber}</TableCell>
                  <TableCell>{component.installDate ? format(parseISO(component.installDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>{component.installHours}</TableCell>
                  <TableCell>{component.maxHours}</TableCell>
                   <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveComponent(component)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  No components added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
