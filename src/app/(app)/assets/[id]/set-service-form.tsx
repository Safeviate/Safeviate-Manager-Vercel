
'use client';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
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
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../page';

interface SetServiceFormProps {
  tenantId: string;
  aircraft: Aircraft;
  children: React.ReactNode;
}

export function SetServiceForm({ tenantId, aircraft, children }: SetServiceFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [currentHobbs, setCurrentHobbs] = useState(aircraft.currentHobbs?.toString() || '');
  const [currentTacho, setCurrentTacho] = useState(aircraft.currentTacho?.toString() || '');
  const [tachoAtNext50Inspection, setTachoAtNext50Inspection] = useState(aircraft.tachoAtNext50Inspection?.toString() || '');
  const [tachoAtNext100Inspection, setTachoAtNext100Inspection] = useState(aircraft.tachoAtNext100Inspection?.toString() || '');

  const handleUpdateService = () => {
    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    
    updateDocumentNonBlocking(aircraftRef, { 
        currentHobbs: Number(currentHobbs) || 0,
        currentTacho: Number(currentTacho) || 0,
        tachoAtNext50Inspection: Number(tachoAtNext50Inspection) || 0,
        tachoAtNext100Inspection: Number(tachoAtNext100Inspection) || 0,
    });

    toast({
        title: 'Service Data Updated',
        description: `Service data for aircraft ${aircraft.tailNumber} is being updated.`,
    });
    
    setIsOpen(false);
  };
  
  const onOpenChange = (open: boolean) => {
    if (open) {
        // Reset form to current aircraft state when opening
        setCurrentHobbs(aircraft.currentHobbs?.toString() || '');
        setCurrentTacho(aircraft.currentTacho?.toString() || '');
        setTachoAtNext50Inspection(aircraft.tachoAtNext50Inspection?.toString() || '');
        setTachoAtNext100Inspection(aircraft.tachoAtNext100Inspection?.toString() || '');
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Service Details</DialogTitle>
          <DialogDescription>
            Update meter readings and inspection hours for {aircraft.tailNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="currentHobbs">Current Hobbs</Label>
            <Input id="currentHobbs" type="number" value={currentHobbs} onChange={(e) => setCurrentHobbs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentTacho">Current Tacho</Label>
            <Input id="currentTacho" type="number" value={currentTacho} onChange={(e) => setCurrentTacho(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tachoAtNext50Inspection">Tacho at Next 50hr</Label>
            <Input id="tachoAtNext50Inspection" type="number" value={tachoAtNext50Inspection} onChange={(e) => setTachoAtNext50Inspection(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tachoAtNext100Inspection">Tacho at Next 100hr</Label>
            <Input id="tachoAtNext100Inspection" type="number" value={tachoAtNext100Inspection} onChange={(e) => setTachoAtNext100Inspection(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpdateService}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    
    