'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Gauge, Settings2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftListPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const [isFormOpen, setIsFormOpen] = useState(false);

  const canCreate = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'), orderBy('tailNumber', 'asc')) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground">Monitor and manage all aircraft assets.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : (fleet || []).map((ac) => (
          <Card key={ac.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                <CardDescription>{ac.make} {ac.model}</CardDescription>
              </div>
              <Plane className="h-8 w-8 text-primary/40" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 py-2 border-y my-4">
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Hobbs</p>
                  <p className="text-lg font-mono font-bold">{ac.currentHobbs?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Tacho</p>
                  <p className="text-lg font-mono font-bold">{ac.currentTacho?.toFixed(1) || '0.0'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant="secondary">{ac.type}</Badge>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/assets/aircraft/${ac.id}`}>Details <Settings2 className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {fleet?.length === 0 && !isLoading && (
          <div className="col-span-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
            <Plane className="h-12 w-12 mb-2 opacity-20" />
            <p>No aircraft in the fleet. Click "Add Aircraft" to start.</p>
          </div>
        )}
      </div>

      <AircraftForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} tenantId={tenantId} />
    </div>
  );
}
