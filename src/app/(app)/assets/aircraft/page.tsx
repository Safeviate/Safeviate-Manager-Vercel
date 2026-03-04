
'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AircraftForm } from './aircraft-form';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const [isAddOpen, setIsAddOpen] = useState(false);

  const canCreate = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track your organization's flight assets.</p>
        </div>
        {canCreate && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Aircraft
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Aircraft</DialogTitle>
                <DialogDescription>Register a new aircraft into the fleet.</DialogDescription>
              </DialogHeader>
              <AircraftForm tenantId={tenantId} onSuccess={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-destructive">Error: {error.message}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aircraft?.map((ac) => (
            <Card key={ac.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-xl font-bold">{ac.tailNumber}</CardTitle>
                  <CardDescription>{ac.make} {ac.model}</CardDescription>
                </div>
                <Badge variant="secondary">{ac.type}</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground uppercase font-bold tracking-wider">Current Hobbs</p>
                    <p className="text-lg font-mono font-bold">{ac.currentHobbs?.toFixed(1) || '0.0'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase font-bold tracking-wider">Current Tacho</p>
                    <p className="text-lg font-mono font-bold">{ac.currentTacho?.toFixed(1) || '0.0'}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/assets/aircraft/${ac.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          {(!aircraft || aircraft.length === 0) && (
            <div className="col-span-full border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
              <Plane className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>No aircraft found in the fleet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
