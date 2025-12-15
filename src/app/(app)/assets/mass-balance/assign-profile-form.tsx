
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
  DialogClose
} from '@/components/ui/dialog';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { AircraftModelProfile } from './template-form';
import type { Aircraft } from '../page';
import { PlusCircle } from 'lucide-react';

interface AssignProfileFormProps {
    tenantId: string;
    profiles: AircraftModelProfile[];
    aircraftList: Aircraft[];
}

export function AssignProfileForm({ tenantId, profiles, aircraftList }: AssignProfileFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedAircraftId, setSelectedAircraftId] = useState('');

  const handleAssignProfile = () => {
    if (!selectedProfileId || !selectedAircraftId) {
        toast({
            variant: 'destructive',
            title: 'Missing Selection',
            description: 'Please select both a profile and an aircraft.',
        });
        return;
    }
    
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to database.' });
        return;
    }

    const profileToAssign = profiles.find(p => p.id === selectedProfileId);
    if (!profileToAssign) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected profile not found.' });
        return;
    }

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', selectedAircraftId);
    
    // Data to copy from the profile to the aircraft
    const dataToUpdate = {
        emptyWeight: profileToAssign.emptyWeight,
        emptyWeightMoment: profileToAssign.emptyWeightMoment,
        maxTakeoffWeight: profileToAssign.maxTakeoffWeight,
        maxLandingWeight: profileToAssign.maxLandingWeight,
        stationArms: profileToAssign.stationArms,
        // The configurator saves the envelope as [{x, y}], but the aircraft entity expects [[weight, cg]]
        // The y-value is weight, and x-value is CG.
        cgEnvelope: profileToAssign.cgEnvelope?.map(p => [p.y, p.x]),
    };

    updateDocumentNonBlocking(aircraftRef, dataToUpdate);

    toast({
        title: 'Profile Assigned',
        description: `The W&B profile for "${profileToAssign.make} ${profileToAssign.model}" has been assigned to the selected aircraft.`
    });

    setIsOpen(false);
    setSelectedProfileId('');
    setSelectedAircraftId('');
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className='mr-2' />
            Assign Profile to Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Mass & Balance Profile</DialogTitle>
          <DialogDescription>
            Select a profile and assign its W&B characteristics to an aircraft.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="profile-select">Mass & Balance Profile</Label>
                <Select onValueChange={setSelectedProfileId} value={selectedProfileId}>
                    <SelectTrigger id="profile-select">
                        <SelectValue placeholder="Select a profile..." />
                    </SelectTrigger>
                    <SelectContent>
                        {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.make} {p.model}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="aircraft-select">Aircraft Registration</Label>
                <Select onValueChange={setSelectedAircraftId} value={selectedAircraftId}>
                    <SelectTrigger id="aircraft-select">
                        <SelectValue placeholder="Select an aircraft..." />
                    </SelectTrigger>
                    <SelectContent>
                        {aircraftList.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.tailNumber}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAssignProfile} disabled={!selectedAircraftId || !selectedProfileId}>
            Save Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

