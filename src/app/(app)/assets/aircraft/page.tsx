
'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
    () => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null),
    [firestore]
  );

  const { data: aircrafts, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track your organization's flight assets.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aircraft
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : (aircrafts || []).map((ac) => (
          <Card key={ac.id} className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                <Badge variant="secondary">{ac.type}</Badge>
              </div>
              <CardDescription>{ac.make} {ac.model}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Current Hobbs</p>
                  <p className="font-mono text-lg">{ac.currentHobbs?.toFixed(1) || '0.0'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Current Tacho</p>
                  <p className="font-mono text-lg">{ac.currentTacho?.toFixed(1) || '0.0'}</p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/assets/aircraft/${ac.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AircraftForm isOpen={isFormOpen} setIsOpen={setIsFormOpen} tenantId={tenantId} />
    </div>
  );
}
