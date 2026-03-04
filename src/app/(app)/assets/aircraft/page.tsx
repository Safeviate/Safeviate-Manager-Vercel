
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { useState } from 'react';
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
          <p className="text-muted-foreground">Monitor and manage all aircraft in your operation.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Aircraft
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)
        ) : aircrafts?.length ? (
          aircrafts.map(ac => (
            <Link key={ac.id} href={`/assets/aircraft/${ac.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Plane className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{ac.tailNumber}</CardTitle>
                    <CardDescription>{ac.make} {ac.model}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Hobbs</p>
                      <p className="font-semibold tabular-nums">{(ac.currentHobbs || 0).toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Tacho</p>
                      <p className="font-semibold tabular-nums">{(ac.currentTacho || 0).toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="col-span-full py-20 text-center text-muted-foreground border-dashed">
            No aircraft found in your fleet.
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
