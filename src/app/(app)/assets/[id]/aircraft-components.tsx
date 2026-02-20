
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComponent, setNewComponent] = useState<Partial<Omit<AircraftComponent, 'id'>>>({});
  const { hasPermission } = usePermissions();
  const firestore = useFirestore();
  const { toast } = useToast();

  const canEdit = hasPermission('assets-edit');

  const handleInputChange = (field: keyof typeof newComponent, value: string) => {
    setNewComponent(prev => ({ ...prev, [field]: value }));
  };

  const handleAddComponent = () => {
    if (!newComponent.name || !newComponent.partNumber) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Component Name and Part Number are required.',
      });
      return;
    }
    const componentToAdd: AircraftComponent = {
      id: uuidv4(),
      ...newComponent,
    } as AircraftComponent;

    const updatedComponents = [...(aircraft.components || []), componentToAdd];

    if (firestore) {
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
      updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
      toast({
        title: 'Component Added',
        description: `${componentToAdd.name} has been added to the aircraft.`,
      });
    }

    setNewComponent({});
    setIsOpen(false);
  };
  
  const handleDeleteComponent = (componentId: string) => {
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    if(firestore) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
        toast({
            title: 'Component Removed',
        });
    }
  }

  if (!aircraft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Components</CardTitle>
          <CardDescription>Tracked components installed on this aircraft.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading components...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
              <div>
                  <CardTitle>Components</CardTitle>
                  <CardDescription>Tracked components installed on this aircraft.</CardDescription>
              </div>
              {canEdit && (
                  <DialogTrigger asChild>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                      </Button>
                  </DialogTrigger>
              )}
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.components || []).length > 0 ? (
                aircraft.components?.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell className="font-medium">{component.name}</TableCell>
                    <TableCell>{component.partNumber}</TableCell>
                    <TableCell>{component.serialNumber || 'N/A'}</TableCell>
                    <TableCell>{component.installDate || 'N/A'}</TableCell>
                    <TableCell>{component.installHours || 'N/A'}</TableCell>
                    <TableCell>{component.maxHours || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteComponent(component.id)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No components tracked for this aircraft.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <DialogContent>
          <DialogHeader>
              <DialogTitle>Add New Component</DialogTitle>
              <DialogDescription>
                  Track a new component installed on {aircraft.tailNumber}.
              </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="name">Component Name</Label>
                      <Input id="name" value={newComponent.name || ''} onChange={e => handleInputChange('name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="partNumber">Part Number</Label>
                      <Input id="partNumber" value={newComponent.partNumber || ''} onChange={e => handleInputChange('partNumber', e.target.value)} />
                  </div>
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="serialNumber">Serial Number</Label>
                      <Input id="serialNumber" value={newComponent.serialNumber || ''} onChange={e => handleInputChange('serialNumber', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input id="manufacturer" value={newComponent.manufacturer || ''} onChange={e => handleInputChange('manufacturer', e.target.value)} />
                  </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="installDate">Install Date</Label>
                      <Input id="installDate" type="date" value={newComponent.installDate || ''} onChange={e => handleInputChange('installDate', e.target.value)} />
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="installHours">Install Hours</Label>
                      <Input id="installHours" type="number" value={newComponent.installHours || ''} onChange={e => handleInputChange('installHours', e.target.value)} />
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxHours">Max Hours</Label>
                      <Input id="maxHours" type="number" value={newComponent.maxHours || ''} onChange={e => handleInputChange('maxHours', e.target.value)} />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" value={newComponent.notes || ''} onChange={e => handleInputChange('notes', e.target.value)} />
              </div>
          </div>
          <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAddComponent}>Add Component</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
