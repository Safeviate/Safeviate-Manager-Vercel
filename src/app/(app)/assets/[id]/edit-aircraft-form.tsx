
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { Aircraft } from '../page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format, differenceInDays } from 'date-fns';
import { DocumentUploader } from './document-uploader';
import { useFirestore, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Trash2, Upload, View, FileUp, Camera } from 'lucide-react';
import type { DocumentExpirySettings } from '../../admin/document-dates/page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [abbreviation, setAbbreviation] = useState(aircraft.abbreviation || '');
  const [type, setType] = useState(aircraft.type || '');
  const [frameHours, setFrameHours] = useState(aircraft.frameHours?.toString() || '');
  const [engineHours, setEngineHours] = useState(aircraft.engineHours?.toString() || '');
  const [hobbs, setHobbs] = useState(aircraft.hobbs?.toString() || '');
  const [tacho, setTacho] = useState(aircraft.tacho?.toString() || '');
  
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
      abbreviation,
      type,
      frameHours: Number(frameHours) || 0,
      engineHours: Number(engineHours) || 0,
      hobbs: Number(hobbs) || 0,
      tacho: Number(tacho) || 0,
    });

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="tailNumber">Tail Number</Label>
                <Input id="tailNumber" value={tailNumber} onChange={(e) => setTailNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="abbreviation">Abbreviation</Label>
                <Input id="abbreviation" value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} maxLength={5} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input id="type" value={type} onChange={(e) => setType(e.target.value)} />
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
                <Label htmlFor="hobbs">Hobbs</Label>
                <Input id="hobbs" type="number" value={hobbs} onChange={(e) => setHobbs(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="tacho">Tacho</Label>
                <Input id="tacho" type="number" value={tacho} onChange={(e) => setTacho(e.target.value)} />
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

    
    