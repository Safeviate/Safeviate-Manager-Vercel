
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Aircraft } from '@/types/aircraft';
import { Separator } from '@/components/ui/separator';

interface AircraftFormProps {
  tenantId: string;
  existingAircraft?: Aircraft | null;
  onCancel?: () => void;
}

const aircraftTypes = ['Single-Engine', 'Multi-Engine'];

export function AircraftForm({ tenantId, existingAircraft = null, onCancel }: AircraftFormProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Aircraft>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // When `existingAircraft` prop changes, reset the form state
    setFormData(existingAircraft || {});
  }, [existingAircraft]);

  const handleInputChange = (field: keyof Aircraft, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!firestore) {
      toast({ variant: "destructive", title: "Error", description: "Database not available." });
      return;
    }
    if (!formData.make || !formData.model || !formData.tailNumber) {
        toast({ variant: "destructive", title: "Missing Fields", description: "Make, Model, and Tail Number are required." });
        return;
    }

    setIsSubmitting(true);

    try {
      if (existingAircraft) {
        // Update existing aircraft
        const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', existingAircraft.id);
        await updateDocumentNonBlocking(aircraftRef, formData);
        toast({ title: "Aircraft Updated", description: `${formData.tailNumber} has been updated.` });
        if (onCancel) onCancel();
      } else {
        // Create new aircraft
        const aircraftsCollection = collection(firestore, 'tenants', tenantId, 'aircrafts');
        await addDocumentNonBlocking(aircraftsCollection, formData);
        toast({ title: "Aircraft Created", description: `${formData.tailNumber} has been added to the fleet.` });
        router.push('/assets/aircraft');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existingAircraft ? 'Edit Aircraft' : 'Create New Aircraft'}</CardTitle>
        <CardDescription>
          {existingAircraft ? `Update the details for ${existingAircraft.tailNumber}.` : 'Enter the details for the new aircraft.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" value={formData.make || ''} onChange={e => handleInputChange('make', e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={formData.model || ''} onChange={e => handleInputChange('model', e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="tailNumber">Tail Number</Label>
                <Input id="tailNumber" value={formData.tailNumber || ''} onChange={e => handleInputChange('tailNumber', e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type || ''} onValueChange={value => handleInputChange('type', value)}>
                    <SelectTrigger id="type"><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                        {aircraftTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="abbreviation">Abbreviation (5 chars)</Label>
                <Input id="abbreviation" value={formData.abbreviation || ''} onChange={e => handleInputChange('abbreviation', e.target.value)} maxLength={5} />
            </div>
        </div>

        <Separator />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="frameHours">Frame Hours</Label>
                <Input id="frameHours" type="number" value={formData.frameHours || ''} onChange={e => handleInputChange('frameHours', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="engineHours">Engine Hours</Label>
                <Input id="engineHours" type="number" value={formData.engineHours || ''} onChange={e => handleInputChange('engineHours', parseFloat(e.target.value) || 0)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="initialHobbs">Initial Hobbs Hours</Label>
                <Input id="initialHobbs" type="number" value={formData.initialHobbs || ''} onChange={e => handleInputChange('initialHobbs', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="currentHobbs">Current Hobbs Hours</Label>
                <Input id="currentHobbs" type="number" value={formData.currentHobbs || ''} onChange={e => handleInputChange('currentHobbs', parseFloat(e.target.value) || 0)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="initialTacho">Initial Tacho Hours</Label>
                <Input id="initialTacho" type="number" value={formData.initialTacho || ''} onChange={e => handleInputChange('initialTacho', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="currentTacho">Current Tacho Hours</Label>
                <Input id="currentTacho" type="number" value={formData.currentTacho || ''} onChange={e => handleInputChange('currentTacho', parseFloat(e.target.value) || 0)} />
            </div>
        </div>

         <Separator />

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="next50hr">Tacho at Next 50hr Inspection</Label>
                <Input id="next50hr" type="number" value={formData.tachoAtNext50Inspection || ''} onChange={e => handleInputChange('tachoAtNext50Inspection', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="next100hr">Tacho at Next 100hr Inspection</Label>
                <Input id="next100hr" type="number" value={formData.tachoAtNext100Inspection || ''} onChange={e => handleInputChange('tachoAtNext100Inspection', parseFloat(e.target.value) || 0)} />
            </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel || (() => router.back())} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>

      </CardContent>
    </Card>
  );
}
