
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { Aircraft } from '../page';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditAircraftFormProps {
  tenantId: string;
  aircraft: Aircraft;
  onCancel: () => void;
}

export function EditAircraftForm({ tenantId, aircraft, onCancel }: EditAircraftFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [tailNumber, setTailNumber] = useState(aircraft.tailNumber);
  const [model, setModel] = useState(aircraft.model);
  const [type, setType] = useState(aircraft.type || '');
  const [frameHours, setFrameHours] = useState(aircraft.frameHours?.toString() || '');
  const [engineHours, setEngineHours] = useState(aircraft.engineHours?.toString() || '');
  const [initialHobbs, setInitialHobbs] = useState(aircraft.initialHobbs?.toString() || '');
  const [currentHobbs, setCurrentHobbs] = useState(aircraft.currentHobbs?.toString() || '');
  const [initialTacho, setInitialTacho] = useState(aircraft.initialTacho?.toString() || '');
  const [currentTacho, setCurrentTacho] = useState(aircraft.currentTacho?.toString() || '');
  const [tachoAtNext50Inspection, setTachoAtNext50Inspection] = useState(aircraft.tachoAtNext50Inspection?.toString() || '');
  const [tachoAtNext100Inspection, setTachoAtNext100Inspection] = useState(aircraft.tachoAtNext100Inspection?.toString() || '');
  const [emptyWeight, setEmptyWeight] = useState(aircraft.emptyWeight?.toString() || '');
  const [emptyWeightMoment, setEmptyWeightMoment] = useState(aircraft.emptyWeightMoment?.toString() || '');
  
  const handleUpdateAircraft = () => {
    if (!tailNumber.trim() || !model.trim() || !type.trim()) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Tail Number, Model, and Type are required.',
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
    
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    
    updateDocumentNonBlocking(aircraftRef, { 
      tailNumber, 
      model,
      type,
      frameHours: Number(frameHours) || 0,
      engineHours: Number(engineHours) || 0,
      initialHobbs: Number(initialHobbs) || 0,
      currentHobbs: Number(currentHobbs) || 0,
      initialTacho: Number(initialTacho) || 0,
      currentTacho: Number(currentTacho) || 0,
      tachoAtNext50Inspection: Number(tachoAtNext50Inspection) || 0,
      tachoAtNext100Inspection: Number(tachoAtNext100Inspection) || 0,
      emptyWeight: Number(emptyWeight) || 0,
      emptyWeightMoment: Number(emptyWeightMoment) || 0,
    });

    toast({
        title: 'Aircraft Updated',
        description: `Aircraft ${tailNumber} is being updated.`,
    });
    
    onCancel(); // Go back to view mode after saving
  };
  
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Aircraft Information</CardTitle>
        <CardDescription>
            Update the core details for this aircraft.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="tailNumber">Tail Number</Label>
                    <Input id="tailNumber" value={tailNumber} onChange={(e) => setTailNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select onValueChange={setType} value={type}>
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
                    <Label htmlFor="currentHobbs">Current Hobbs</Label>
                    <Input id="currentHobbs" type="number" value={currentHobbs} onChange={(e) => setCurrentHobbs(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="initialTacho">Initial Tacho</Label>
                    <Input id="initialTacho" type="number" value={initialTacho} onChange={(e) => setInitialTacho(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currentTacho">Current Tacho</Label>
                    <Input id="currentTacho" type="number" value={currentTacho} onChange={(e) => setCurrentTacho(e.target.value)} />
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
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleUpdateAircraft}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
