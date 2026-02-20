'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '../page';

interface EditAircraftFormProps {
  aircraft: Aircraft;
  tenantId: string;
  onCancel: () => void;
}

export function EditAircraftForm({ aircraft, tenantId, onCancel }: EditAircraftFormProps) {
  const [formData, setFormData] = useState<Partial<Aircraft>>({});
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (aircraft) {
      setFormData(aircraft);
    }
  }, [aircraft]);

  const handleInputChange = (field: keyof Aircraft, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!firestore || !formData) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, formData);
    toast({ title: 'Aircraft Updated' });
    onCancel();
  };
  
  if (!formData.tailNumber) {
    return null; // Don't render form until data is loaded
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Aircraft</CardTitle>
        <CardDescription>Update details for {aircraft.tailNumber}.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="tailNumber">Tail Number</Label>
          <Input id="tailNumber" value={formData.tailNumber || ''} onChange={(e) => handleInputChange('tailNumber', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input id="model" value={formData.model || ''} onChange={(e) => handleInputChange('model', e.target.value)} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="abbreviation">Abbreviation (5 chars)</Label>
            <Input id="abbreviation" maxLength={5} value={formData.abbreviation || ''} onChange={(e) => handleInputChange('abbreviation', e.target.value)} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select onValueChange={(value) => handleInputChange('type', value)} value={formData.type}>
                <SelectTrigger id="type">
                    <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                    <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="currentHobbs">Current Hobbs</Label>
            <Input id="currentHobbs" type="number" value={formData.currentHobbs || ''} onChange={(e) => handleInputChange('currentHobbs', parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="currentTacho">Current Tacho</Label>
            <Input id="currentTacho" type="number" value={formData.currentTacho || ''} onChange={(e) => handleInputChange('currentTacho', parseFloat(e.target.value) || 0)} />
        </div>
         <div className="space-y-2">
            <Label htmlFor="tachoAtNext50Inspection">Tacho at Next 50hr</Label>
            <Input id="tachoAtNext50Inspection" type="number" value={formData.tachoAtNext50Inspection || ''} onChange={(e) => handleInputChange('tachoAtNext50Inspection', parseFloat(e.target.value) || 0)} />
        </div>
         <div className="space-y-2">
            <Label htmlFor="tachoAtNext100Inspection">Tacho at Next 100hr</Label>
            <Input id="tachoAtNext100Inspection" type="number" value={formData.tachoAtNext100Inspection || ''} onChange={(e) => handleInputChange('tachoAtNext100Inspection', parseFloat(e.target.value) || 0)} />
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
