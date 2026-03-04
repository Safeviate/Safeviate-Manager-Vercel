'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function FleetPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  const handleAddAircraft = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    const formData = new FormData(e.currentTarget);
    const newAircraft = {
      make: formData.get('make') as string,
      model: formData.get('model') as string,
      tailNumber: (formData.get('tailNumber') as string).toUpperCase(),
      type: formData.get('type') as any,
      currentHobbs: parseFloat(formData.get('hobbs') as string) || 0,
      currentTacho: parseFloat(formData.get('tacho') as string) || 0,
      tachoAtNext50Inspection: (parseFloat(formData.get('tacho') as string) || 0) + 50,
      tachoAtNext100Inspection: (parseFloat(formData.get('tacho') as string) || 0) + 100,
      frameHours: parseFloat(formData.get('frameHours') as string) || 0,
      engineHours: parseFloat(formData.get('engineHours') as string) || 0,
      documents: [],
      components: [],
    };

    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts`);
    addDocumentNonBlocking(colRef, newAircraft);
    toast({ title: 'Aircraft Added', description: `${newAircraft.tailNumber} added to fleet.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground">Monitor and manage your academy's aircraft assets.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add New Aircraft</DialogTitle>
              <DialogDescription>Enter the initial details for the new aircraft.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAircraft} className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Make</Label><Input name="make" placeholder="e.g., Cessna" required /></div>
              <div className="space-y-2"><Label>Model</Label><Input name="model" placeholder="e.g., 172S" required /></div>
              <div className="space-y-2"><Label>Tail Number</Label><Input name="tailNumber" placeholder="e.g., ZS-ABC" required /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select name="type" defaultValue="Single-Engine">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Single-Engine">Single-Engine</SelectItem><SelectItem value="Multi-Engine">Multi-Engine</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Initial Hobbs</Label><Input name="hobbs" type="number" step="0.1" /></div>
              <div className="space-y-2"><Label>Initial Tacho</Label><Input name="tacho" type="number" step="0.1" /></div>
              <div className="space-y-2"><Label>Total Frame Hours</Label><Input name="frameHours" type="number" step="0.1" /></div>
              <div className="space-y-2"><Label>Total Engine Hours</Label><Input name="engineHours" type="number" step="0.1" /></div>
              <DialogFooter className="col-span-2 pt-4">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Add to Fleet</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(aircraft || []).map(ac => (
            <Link key={ac.id} href={`/assets/aircraft/${ac.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="font-mono text-xl group-hover:text-primary transition-colors">{ac.tailNumber}</CardTitle>
                    <CardDescription>{ac.make} {ac.model}</CardDescription>
                  </div>
                  <Plane className="h-8 w-8 text-muted-foreground/50" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mt-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Total Time</p>
                      <p className="text-2xl font-mono">{(ac.currentHobbs || 0).toFixed(1)}</p>
                    </div>
                    <Badge variant="outline" className="font-mono">{ac.type}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(aircraft || []).length === 0 && (
            <Card className="col-span-full py-12 flex flex-col items-center justify-center border-dashed">
              <Plane className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No aircraft in fleet. Add one to get started.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
