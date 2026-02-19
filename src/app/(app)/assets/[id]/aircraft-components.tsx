'use client';

import { useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AircraftComponentForm } from './aircraft-component-form';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { useToast } from '@/hooks/use-toast';

interface AircraftComponentsProps {
  aircraft: Aircraft;
}

export function AircraftComponents({ aircraft }: AircraftComponentsProps) {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraft.id}/components`) : null),
    [firestore, tenantId, aircraft.id]
  );
  
  const { data: components, isLoading, error } = useCollection<AircraftComponent>(componentsQuery);

  const handleOpenForm = (component: AircraftComponent | null = null) => {
    setEditingComponent(component);
    setIsFormOpen(true);
  };
  
  const handleDeleteComponent = (componentId: string) => {
    if (!firestore) return;
    const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraft.id}/components`, componentId);
    deleteDocumentNonBlocking(componentRef);
    toast({ title: 'Component Deleted' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>A list of all major components installed on this aircraft.</CardDescription>
            </div>
            <Button onClick={() => handleOpenForm()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Component
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading components...</p>}
        {error && <p className="text-destructive">Error: {error.message}</p>}
        {!isLoading && components && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Install Hours</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length > 0 ? components.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell>{comp.name}</TableCell>
                  <TableCell>{comp.partNumber}</TableCell>
                  <TableCell>{comp.serialNumber || 'N/A'}</TableCell>
                  <TableCell>{comp.installHours || 'N/A'}</TableCell>
                  <TableCell>{comp.maxHours || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(comp)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteComponent(comp.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No components added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle>
            </DialogHeader>
            <AircraftComponentForm
                aircraftId={aircraft.id}
                tenantId={tenantId}
                component={editingComponent!}
                onFormSubmit={() => setIsFormOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
