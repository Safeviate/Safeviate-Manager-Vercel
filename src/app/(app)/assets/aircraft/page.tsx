'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AircraftForm } from './aircraft-form';

export default function AircraftPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track your academy's aircraft resources.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Register New Aircraft</DialogTitle></DialogHeader>
            <AircraftForm tenantId={tenantId} onCancel={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : aircraft?.map((ac) => (
          <Link key={ac.id} href={`/assets/aircraft/${ac.id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer group h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                  <CardDescription>{ac.make} {ac.model}</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Plane className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Hobbs</p><p className="font-mono font-bold">{ac.currentHobbs?.toFixed(1) || '0.0'}</p></div>
                  <div><p className="text-muted-foreground">Tacho</p><p className="font-mono font-bold">{ac.currentTacho?.toFixed(1) || '0.0'}</p></div>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-primary">
                  View Details <ChevronRight className="ml-1 h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!isLoading && aircraft?.length === 0 && (
          <Card className="col-span-full py-12 flex flex-col items-center justify-center text-center border-dashed">
            <Plane className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <CardTitle>No aircraft registered</CardTitle>
            <CardDescription>Get started by adding your first aircraft to the fleet.</CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
