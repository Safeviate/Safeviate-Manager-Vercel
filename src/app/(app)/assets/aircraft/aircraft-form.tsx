'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft | null;
  onComplete: () => void;
}

export function AircraftForm({ tenantId, existingAircraft, onComplete }: AircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Local state for all form fields
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [tailNumber, setTailNumber] = useState('');
  const [initialHobbs, setInitialHobbs] = useState('');
  const [currentHobbs, setCurrentHobbs] = useState('');
  const [initialTacho, setInitialTacho] = useState('');
  const [currentTacho, setCurrentTacho] = useState('');

  // Effect to populate form when editing
  useEffect(() => {
    if (existingAircraft) {
      setMake(existingAircraft.make || '');
      setModel(existingAircraft.model || '');
      setTailNumber(existingAircraft.tailNumber || '');
      setInitialHobbs(existingAircraft.initialHobbs?.toString() || '');
      setCurrentHobbs(existingAircraft.currentHobbs?.toString() || '');
      setInitialTacho(existingAircraft.initialTacho?.toString() || '');
      setCurrentTacho(existingAircraft.currentTacho?.toString() || '');
    }
  }, [existingAircraft]);

  const handleSubmit = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
      return;
    }
    
    const aircraftData = {
      make,
      model,
      tailNumber,
      initialHobbs: parseFloat(initialHobbs) || 0,
      currentHobbs: parseFloat(currentHobbs) || 0,
      initialTacho: parseFloat(initialTacho) || 0,
      currentTacho: parseFloat(currentTacho) || 0,
    };

    try {
      if (existingAircraft) {
        // Update existing document
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, existingAircraft.id);
        updateDocumentNonBlocking(aircraftRef, aircraftData);
        toast({ title: 'Aircraft Updated', description: `Details for ${tailNumber} have been updated.` });
      } else {
        // Create new document
        const aircraftsCollection = collection(firestore, `tenants/${tenantId}/aircrafts`);
        await addDocumentNonBlocking(aircraftsCollection, aircraftData);
        toast({ title: 'Aircraft Created', description: `${tailNumber} has been added to the fleet.` });
      }
      onComplete(); // Close dialog on success
    } catch (error: any) {
        console.error("Error saving aircraft:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{existingAircraft ? 'Edit Aircraft' : 'Create Aircraft'}</DialogTitle>
        <DialogDescription>
          {existingAircraft ? `Editing details for ${existingAircraft.tailNumber}.` : 'Add a new aircraft to your fleet.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="tailNumber">Tail Number</Label>
            <Input id="tailNumber" value={tailNumber} onChange={(e) => setTailNumber(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="initialHobbs">Initial Hobbs Hours</Label>
                <Input id="initialHobbs" type="number" value={initialHobbs} onChange={(e) => setInitialHobbs(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="currentHobbs">Current Hobbs Hours</Label>
                <Input id="currentHobbs" type="number" value={currentHobbs} onChange={(e) => setCurrentHobbs(e.target.value)} />
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="initialTacho">Initial Tacho Hours</Label>
                <Input id="initialTacho" type="number" value={initialTacho} onChange={(e) => setInitialTacho(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="currentTacho">Current Tacho Hours</Label>
                <Input id="currentTacho" type="number" value={currentTacho} onChange={(e) => setCurrentTacho(e.target.value)} />
            </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={handleSubmit}>
          {existingAircraft ? 'Save Changes' : 'Create Aircraft'}
        </Button>
      </DialogFooter>
    </>
  );
}
