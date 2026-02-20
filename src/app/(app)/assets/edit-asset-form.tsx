
'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { Aircraft } from '../page';

interface EditAircraftFormProps {
  aircraft: Aircraft;
  onSave: () => void;
  onCancel: () => void;
}

export function EditAircraftForm({ aircraft, onSave, onCancel }: EditAircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const [formData, setFormData] = useState<Partial<Aircraft>>({});

  useEffect(() => {
    // Pre-fill the form data when the dialog opens or the aircraft prop changes
    if (aircraft) {
        setFormData({ ...aircraft });
    }
  }, [aircraft]);


  const handleInputChange = (field: keyof Aircraft, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdate = () => {
    if (!firestore || !formData.id) return;
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', formData.id);

    // Create a new object for update to avoid passing the whole formData which might contain extra fields
    const updateData: Partial<Aircraft> = {
      tailNumber: formData.tailNumber,
      model: formData.model,
      type: formData.type,
      initialHobbs: Number(formData.initialHobbs) || 0,
      currentHobbs: Number(formData.currentHobbs) || 0,
      initialTacho: Number(formData.initialTacho) || 0,
      currentTacho: Number(formData.currentTacho) || 0,
      tachoAtNext50Inspection: Number(formData.tachoAtNext50Inspection) || 0,
      tachoAtNext100Inspection: Number(formData.tachoAtNext100Inspection) || 0,
    };
    
    updateDocumentNonBlocking(aircraftRef, updateData);
    toast({ title: 'Aircraft Updated', description: `Details for ${formData.tailNumber} have been saved.` });
    onSave();
  };

  if (!aircraft) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Aircraft</CardTitle>
        <CardDescription>
            Update details for aircraft {aircraft.tailNumber}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-25rem)] pr-6">
            <div className="flex flex-col gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="tailNumber">Tail Number</Label>
                        <Input id="tailNumber" value={formData.tailNumber || ''} onChange={(e) => handleInputChange('tailNumber', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input id="model" value={formData.model || ''} onChange={(e) => handleInputChange('model', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select onValueChange={(value) => handleInputChange('type', value)} value={formData.type || ''}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                                <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Separator />
                <h4 className="text-lg font-semibold">Hour Tracking</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="initialHobbs">Initial Hobbs</Label>
                        <Input id="initialHobbs" type="number" value={formData.initialHobbs || ''} onChange={(e) => handleInputChange('initialHobbs', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="currentHobbs">Current Hobbs</Label>
                        <Input id="currentHobbs" type="number" value={formData.currentHobbs || ''} onChange={(e) => handleInputChange('currentHobbs', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="initialTacho">Initial Tacho</Label>
                        <Input id="initialTacho" type="number" value={formData.initialTacho || ''} onChange={(e) => handleInputChange('initialTacho', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="currentTacho">Current Tacho</Label>
                        <Input id="currentTacho" type="number" value={formData.currentTacho || ''} onChange={(e) => handleInputChange('currentTacho', e.target.value)} />
                    </div>
                </div>
                 <Separator />
                <h4 className="text-lg font-semibold">Maintenance Tracking</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="tachoAtNext50Inspection">Tacho at Next 50hr</Label>
                        <Input id="tachoAtNext50Inspection" type="number" value={formData.tachoAtNext50Inspection || ''} onChange={(e) => handleInputChange('tachoAtNext50Inspection', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tachoAtNext100Inspection">Tacho at Next 100hr</Label>
                        <Input id="tachoAtNext100Inspection" type="number" value={formData.tachoAtNext100Inspection || ''} onChange={(e) => handleInputChange('tachoAtNext100Inspection', e.target.value)} />
                    </div>
                </div>

            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleUpdate}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
