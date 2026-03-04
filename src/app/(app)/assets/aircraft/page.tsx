'use client';

import { useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AircraftForm } from './aircraft-form';

export default function AircraftListPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [isAddOpen, setIsAddOpen] = useState(false);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage your academy's aircraft and track maintenance status.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Add New Aircraft</DialogTitle></DialogHeader>
                <AircraftForm tenantId={tenantId} onComplete={() => setIsAddOpen(false)} />
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aircraft?.length ? aircraft.map((ac) => (
          <Link key={ac.id} href={`/assets/aircraft/${ac.id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg"><Plane className="h-6 w-6 text-primary" /></div>
                    <div>
                        <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                        <CardDescription>{ac.make} {ac.model}</CardDescription>
                    </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Current Hobbs</p><p className="font-semibold">{ac.currentHobbs?.toFixed(1) || '0.0'}</p></div>
                    <div><p className="text-muted-foreground">Type</p><p className="font-semibold">{ac.type}</p></div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )) : (
          <Card className="col-span-full h-48 flex items-center justify-center text-muted-foreground border-dashed">
            <p>No aircraft in the fleet. Add one to get started.</p>
          </Card>
        )}
      </div>
    </div>
  );
}