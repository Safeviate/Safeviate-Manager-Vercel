
'use client';

import { useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Gauge, Wrench, ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft/aircraft-form';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [isAddOpen, setIsAddOpen] = useState(false);

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
          <p className="text-muted-foreground">Manage and monitor your training and operational aircraft.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-destructive"><p>Error loading fleet: {error.message}</p></div>
      ) : aircraft && aircraft.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aircraft.map(ac => (
            <Link key={ac.id} href={`/assets/aircraft/${ac.id}`}>
              <Card className="hover:bg-muted/50 transition-colors group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                  </div>
                  <Badge variant="outline">{ac.type}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{ac.make} {ac.model}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1"><Gauge className="h-3 w-3" /> Hobbs</p>
                      <p className="font-mono text-lg">{ac.currentHobbs?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1"><Wrench className="h-3 w-3" /> Next Due</p>
                      <p className="font-mono text-lg">{ac.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-primary flex items-center">View Workspace <ArrowRight className="ml-1 h-3 w-3" /></span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="flex h-48 items-center justify-center border-dashed">
          <div className="text-center"><p className="text-muted-foreground">No aircraft registered.</p><Button variant="link" onClick={() => setIsAddOpen(true)}>Add your first aircraft</Button></div>
        </Card>
      )}

      <AircraftForm isOpen={isAddOpen} setIsOpen={setIsAddOpen} />
    </div>
  );
}
