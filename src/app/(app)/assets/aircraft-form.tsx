
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
  const [type, setType] = useState('');
  const [frameHours, setFrameHours] = useState('');
  const [engineHours, setEngineHours] = useState('');
  const [initialHobbs, setInitialHobbs] = useState('');
  const [initialTacho, setInitialTacho] = useState('');
  const [tachoAtNext50Inspection, setTachoAtNext50Inspection] = useState('');
  const [tachoAtNext100Inspection, setTachoAtNext100Inspection] = useState('');
  const [emptyWeight, setEmptyWeight] = useState('');
  const [emptyWeightMoment, setEmptyWeightMoment] = useState('');


  const [isOpen, setIsOpen] = useState(false);

  const handleAddAircraft = () => {
    if (!tailNumber.trim() || !model.trim() || !type.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please provide Tail Number, Model, and Type.',
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
    
    const initialHobbsValue = Number(initialHobbs) || 0;
    const initialTachoValue = Number(initialTacho) || 0;

    addDocumentNonBlocking(aircraftRef, { 
        tailNumber, 
        model,
        type,
        frameHours: Number(frameHours) || 0,
        engineHours: Number(engineHours) || 0,
        initialHobbs: initialHobbsValue,
        currentHobbs: initialHobbsValue,
        initialTacho: initialTachoValue,
        currentTacho: initialTachoValue,
        tachoAtNext50Inspection: Number(tachoAtNext50Inspection) || 0,
        tachoAtNext100Inspection: Number(tachoAtNext100Inspection) || 0,
        emptyWeight: Number(emptyWeight) || 0,
        emptyWeightMoment: Number(emptyWeightMoment) || 0,
    });

    toast({
      title: 'Aircraft Added',
      description: `The aircraft "${tailNumber}" is being created.`,
    });

    resetForm();
  };

  const resetForm = () => {
    setTailNumber('');
    setModel('');
    setType('');
    setFrameHours('');
    setEngineHours('');
    setInitialHobbs('');
    setInitialTacho('');
    setTachoAtNext50Inspection('');
    setTachoAtNext100Inspection('');
    setEmptyWeight('');
    setEmptyWeightMoment('');
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add New Aircraft</DialogTitle>
          <DialogDescription>
            Enter the details for the new aircraft below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tailNumber">Tail Number</Label>
            <Input id="tailNumber" value={tailNumber} onChange={(e) => setTailNumber(e.target.value)} placeholder="e.g., N12345" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g., Cessna 172" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Input id="type" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g., Single-Engine" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="frameHours">Frame Hours</Label>
            <Input id="frameHours" type="number" value={frameHours} onChange={(e) => setFrameHours(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="engineHours">Engine Hours</Label>
            <Input id="engineHours" type="number" value={engineHours} onChange={(e) => setEngineHours(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialHobbs">Initial Hobbs</Label>
            <Input id="initialHobbs" type="number" value={initialHobbs} onChange={(e) => setInitialHobbs(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="currentHobbs" className="text-muted-foreground">Current Hobbs</Label>
            <Input id="currentHobbs" type="number" value={initialHobbs} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialTacho">Initial Tacho</Label>
            <Input id="initialTacho" type="number" value={initialTacho} onChange={(e) => setInitialTacho(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="currentTacho" className="text-muted-foreground">Current Tacho</Label>
            <Input id="currentTacho" type="number" value={initialTacho} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tachoAtNext50Inspection">Tacho at Next 50 Insp.</Label>
            <Input id="tachoAtNext50Inspection" type="number" value={tachoAtNext50Inspection} onChange={(e) => setTachoAtNext50Inspection(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tachoAtNext100Inspection">Tacho at Next 100 Insp.</Label>
            <Input id="tachoAtNext100Inspection" type="number" value={tachoAtNext100Inspection} onChange={(e) => setTachoAtNext100Inspection(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="emptyWeight">Empty Weight (lbs)</Label>
            <Input id="emptyWeight" type="number" value={emptyWeight} onChange={(e) => setEmptyWeight(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emptyWeightMoment">Empty Weight Moment</Label>
            <Input id="emptyWeightMoment" type="number" value={emptyWeightMoment} onChange={(e) => setEmptyWeightMoment(e.target.value)} />
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
    
    
