'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, Eye, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { cn } from '@/lib/utils';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber', 'asc')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and monitor your academy's fleet status and maintenance.</p>
        </div>
      </div>

      <Card className="shadow-none border">
        <CardHeader className="bg-muted/5 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            Fleet Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase font-bold">Tail Number</TableHead>
                <TableHead className="text-xs uppercase font-bold">Model</TableHead>
                <TableHead className="text-xs uppercase font-bold">Type</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold">Current Hobbs</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold">Current Tacho</TableHead>
                <TableHead className="text-center text-xs uppercase font-bold">Status</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft && aircraft.length > 0 ? (
                aircraft.map((ac) => {
                  const timeTo50 = (ac.tachoAtNext50Inspection || 0) - (ac.currentTacho || 0);
                  const isUrgent = timeTo50 < 5;

                  return (
                    <TableRow key={ac.id}>
                      <TableCell className="font-bold text-primary">{ac.tailNumber}</TableCell>
                      <TableCell>{ac.make} {ac.model}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{ac.type}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{(ac.currentHobbs || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{(ac.currentTacho || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-center">
                        {isUrgent ? (
                          <Badge variant="destructive" className="gap-1.5 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> Due Soon
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Aircraft</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                    No aircraft found in the fleet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
