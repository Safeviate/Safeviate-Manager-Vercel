
'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Aircraft } from '../page';

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
  
  const handleUpdateAircraft = () => {
    if (!tailNumber.trim() || !model.trim()) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Tail Number and Model are required.',
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
    
    updateDocumentNonBlocking(aircraftRef, { tailNumber, model });

    toast({
        title: 'Aircraft Updated',
        description: `Aircraft ${tailNumber} is being updated.`,
    });
    
    onCancel(); // Go back to view mode after saving
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Aircraft</CardTitle>
        <CardDescription>
            Update details for {aircraft.tailNumber}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="tailNumber">Tail Number</Label>
                <Input id="tailNumber" value={tailNumber} onChange={(e) => setTailNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleUpdateAircraft}>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
