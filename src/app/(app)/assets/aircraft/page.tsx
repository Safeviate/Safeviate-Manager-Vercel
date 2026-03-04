
'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Gauge, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';

export default function AircraftListPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [isAddOpen, setIsAddOpen] = useState(false);

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  const { data: aircrafts, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground">Monitor and manage all aircraft in your training fleet.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : aircrafts && aircrafts.length > 0 ? (
          aircrafts.map(ac => (
            <Link key={ac.id} href={`/assets/aircraft/${ac.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                    <CardDescription>{ac.make} {ac.model}</CardDescription>
                  </div>
                  <Plane className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span>{ac.currentHobbs?.toFixed(1) || '0.0'} hrs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span>Next: {ac.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="col-span-full py-12 flex flex-col items-center justify-center text-center">
            <Plane className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>No Aircraft Found</CardTitle>
            <CardDescription>Get started by adding your first aircraft to the fleet.</CardDescription>
            <Button onClick={() => setIsAddOpen(true)} variant="outline" className="mt-4">Add Aircraft</Button>
          </Card>
        )}
      </div>

      <AircraftForm 
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
        tenantId={tenantId}
      />
    </div>
  );
}
