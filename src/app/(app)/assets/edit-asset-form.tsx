'use client';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../page';

interface EditAircraftFormProps {
  aircraft: Aircraft;
  onCancel: () => void;
}

export function EditAircraftForm({ aircraft, onCancel }: EditAircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [formData, setFormData] = useState(aircraft);

  const handleInputChange = (field: keyof Aircraft, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = () => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants/safeviate/aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, formData);
    toast({
      title: 'Aircraft Updated',
      description: `Details for ${formData.tailNumber} have been updated.`,
    });
    onCancel();
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="tailNumber">Tail Number</Label>
                    <Input id="tailNumber" value={formData.tailNumber || ''} onChange={(e) => handleInputChange('tailNumber', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" value={formData.model || ''} onChange={(e) => handleInputChange('model', e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="type">Aircraft Type</Label>
                <Select onValueChange={(value) => handleInputChange('type', value)} value={formData.type}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                        <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="initialHobbs">Initial Hobbs</Label>
                    <Input id="initialHobbs" type="number" value={formData.initialHobbs || ''} onChange={(e) => handleInputChange('initialHobbs', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currentHobbs">Current Hobbs</Label>
                    <Input id="currentHobbs" type="number" value={formData.currentHobbs || ''} onChange={(e) => handleInputChange('currentHobbs', parseFloat(e.target.value))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="initialTacho">Initial Tacho</Label>
                    <Input id="initialTacho" type="number" value={formData.initialTacho || ''} onChange={(e) => handleInputChange('initialTacho', parseFloat(e.target.value))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="currentTacho">Current Tacho</Label>
                    <Input id="currentTacho" type="number" value={formData.currentTacho || ''} onChange={(e) => handleInputChange('currentTacho', parseFloat(e.target.value))} />
                </div>
            </div>
        </div>
      </ScrollArea>
       <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
      </div>
    </div>
  );
}
