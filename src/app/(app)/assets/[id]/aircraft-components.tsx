'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { v4 as uuidv4 } from 'uuid';

interface AircraftComponentsProps {
  aircraft: Aircraft;
  tenantId: string;
}

const NewComponentForm = ({ onAddComponent }: { onAddComponent: (component: AircraftComponent) => void }) => {
    const [name, setName] = useState('');
    const [partNumber, setPartNumber] = useState('');
    const { toast } = useToast();

    const handleAdd = () => {
        if (!name.trim() || !partNumber.trim()) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Component Name and Part Number are required.' });
            return;
        }
        onAddComponent({
            id: uuidv4(),
            name,
            partNumber,
        });
        setName('');
        setPartNumber('');
    }

    return (
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comp-name" className="text-right">Name</Label>
            <Input id="comp-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comp-part" className="text-right">Part No.</Label>
            <Input id="comp-part" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className="col-span-3" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd}>Add Component</Button>
          </div>
        </div>
    )
}

export function AircraftComponents({ aircraft, tenantId }: AircraftComponentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddComponent = (newComponent: AircraftComponent) => {
    if (!firestore) return;
    const updatedComponents = [...(aircraft.components || []), newComponent];
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Component Added' });
    setIsOpen(false);
  };

  const handleRemoveComponent = (componentId: string) => {
    if (!firestore) return;
    const updatedComponents = (aircraft.components || []).filter(c => c.id !== componentId);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updatedComponents });
    toast({ title: 'Component Removed' });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
            <CardTitle>Tracked Components</CardTitle>
            <CardDescription>Manage major components and their lifecycles for this aircraft.</CardDescription>
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
                </DialogHeader>
                <NewComponentForm onAddComponent={handleAddComponent} />
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {(aircraft.components || []).map(comp => (
                <div key={comp.id} className="flex justify-between items-center p-4 border rounded-md">
                    <div>
                        <p className="font-semibold">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">P/N: {comp.partNumber}</p>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleRemoveComponent(comp.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            {(aircraft.components || []).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No tracked components found.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
