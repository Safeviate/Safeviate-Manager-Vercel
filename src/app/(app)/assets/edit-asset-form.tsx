
'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from './page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditAircraftFormProps {
  tenantId: string;
  aircraft: Aircraft;
  onCancel: () => void;
  onSuccess: () => void;
}

export function EditAircraftForm({ tenantId, aircraft, onCancel, onSuccess }: EditAircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Initialize state directly from the prop to avoid undefined issues.
  const [formData, setFormData] = useState<Partial<Aircraft>>(aircraft);

  // This effect ensures that if the dialog is reused for another aircraft,
  // the form state is updated to reflect the new aircraft's data.
  useEffect(() => {
    setFormData(aircraft);
  }, [aircraft]);

  const handleInputChange = (field: keyof Aircraft, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateAircraft = () => {
    if (!firestore || !tenantId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database.',
      });
      return;
    }
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, formData);
    toast({
      title: 'Aircraft Updated',
      description: `The details for ${formData.tailNumber} have been saved.`,
    });
    onSuccess();
  };
  
  // A simple guard to prevent rendering with incomplete data.
  if (!formData) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <>
      <div className="grid gap-4 py-4">
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
              <Label htmlFor="abbreviation">Abbreviation (5 chars)</Label>
              <Input id="abbreviation" maxLength={5} value={formData.abbreviation || ''} onChange={(e) => handleInputChange('abbreviation', e.target.value)} />
          </div>
          <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select onValueChange={(value) => handleInputChange('type', value)} value={formData.type}>
                  <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                      <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                  </SelectContent>
              </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="currentHobbs">Current Hobbs</Label>
                  <Input id="currentHobbs" type="number" value={formData.currentHobbs || ''} onChange={(e) => handleInputChange('currentHobbs', parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="currentTacho">Current Tacho</Label>
                  <Input id="currentTacho" type="number" value={formData.currentTacho || ''} onChange={(e) => handleInputChange('currentTacho', parseFloat(e.target.value))} />
              </div>
          </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleUpdateAircraft}>Save Changes</Button>
      </div>
    </>
  );
}
