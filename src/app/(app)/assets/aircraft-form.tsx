
'use client';

import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface AircraftFormProps {
  tenantId: string;
}

export function AircraftForm({ tenantId }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tailNumber, setTailNumber] = useState('');
  const [model, setModel] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAddAircraft = () => {
    if (!tailNumber.trim() || !model.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please provide both a tail number and a model.',
      });
      return;
    }

    if (!firestore || !tenantId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database.',
      });
      return;
    }

    const aircraftRef = collection(firestore, 'tenants', tenantId, 'aircrafts');
    
    addDocumentNonBlocking(aircraftRef, { tailNumber, model });

    toast({
      title: 'Aircraft Added',
      description: `The aircraft "${tailNumber}" is being created.`,
    });

    resetForm();
  };

  const resetForm = () => {
    setTailNumber('');
    setModel('');
    setIsOpen(false);
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
        resetForm();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Aircraft</DialogTitle>
          <DialogDescription>
            Enter the details for the new aircraft below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tailNumber" className="text-right">
              Tail Number
            </Label>
            <Input
              id="tailNumber"
              value={tailNumber}
              onChange={(e) => setTailNumber(e.target.value)}
              className="col-span-3"
              placeholder="e.g., N12345"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">
              Model
            </Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Cessna 172"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddAircraft}>Save Aircraft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
