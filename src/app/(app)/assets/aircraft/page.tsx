'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, PlusCircle, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { deleteDocumentNonBlocking } from '@/firebase';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading } = useCollection<Aircraft>(aircraftQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [tailNumber, setTailNumber] = useState('');
  const [type, setType] = useState<'Single-Engine' | 'Multi-Engine'>('Single-Engine');

  const handleAddAircraft = async () => {
    if (!make || !model || !tailNumber) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'All fields are required.' });
      return;
    }

    if (!firestore) return;

    const aircraftData: Omit<Aircraft, 'id'> = {
      make,
      model,
      tailNumber: tailNumber.toUpperCase(),
      type,
      currentHobbs: 0,
      currentTacho: 0,
      frameHours: 0,
      engineHours: 0,
      maintenanceLogs: [],
      documents: [],
      components: [],
    };

    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
    await addDocumentNonBlocking(colRef, aircraftData);
    
    toast({ title: 'Aircraft Added', description: `${tailNumber} has been added to the fleet.` });
    setIsFormOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setMake('');
    setModel('');
    setTailNumber('');
    setType('Single-Engine');
  };

  const handleDelete = (id: string, tail: string) => {
      if (!firestore) return;
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, id);
      deleteDocumentNonBlocking(aircraftRef);
      toast({ title: 'Aircraft Removed', description: `${tail} has been removed from the fleet.` });
  }

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-[400px] rounded-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage organizational assets and tracking.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Aircraft</DialogTitle>
              <DialogDescription>Enter the registration and details for the new fleet asset.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Make</Label><Input value={make} onChange={e => setMake(e.target.value)} placeholder="e.g., Piper" /></div>
                <div className="space-y-2"><Label>Model</Label><Input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g., Archer II" /></div>
              </div>
              <div className="space-y-2"><Label>Tail Number</Label><Input value={tailNumber} onChange={e => setTailNumber(e.target.value)} placeholder="e.g., G-ABCD" /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select onValueChange={(v: any) => setType(v)} value={type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                    <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAddAircraft}>Save Aircraft</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tail Number</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Hobbs</TableHead>
                <TableHead className="text-right">Tacho</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft || []).map(ac => (
                <TableRow key={ac.id}>
                  <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                  <TableCell>{ac.make} {ac.model}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{ac.type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
                  <TableCell className="text-right font-mono">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm"><Link href={`/assets/aircraft/${ac.id}`}><Eye className="h-4 w-4 mr-1" /> View</Link></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(ac.id, ac.tailNumber)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!aircraft || aircraft.length === 0) && (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">No aircraft registered.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
