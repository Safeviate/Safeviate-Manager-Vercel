'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plane, PlusCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canCreate = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-[400px] rounded-full" />
        <Card><CardContent className="p-8 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
      <div className="px-1 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and track utilization for all organization assets.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/assets/aircraft/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
            </Link>
          </Button>
        )}
      </div>

      <Card className="shadow-none border overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs uppercase font-bold">Tail Number</TableHead>
                <TableHead className="text-xs uppercase font-bold">Make/Model</TableHead>
                <TableHead className="text-xs uppercase font-bold">Type</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold">Hobbs</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold">Tacho</TableHead>
                <TableHead className="text-xs uppercase font-bold">Inspection Status</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(fleet || []).length > 0 ? (
                fleet!.map(ac => {
                  const hoursTo50 = (ac.tachoAtNext50Inspection || 0) - (ac.currentTacho || 0);
                  const hoursTo100 = (ac.tachoAtNext100Inspection || 0) - (ac.currentTacho || 0);
                  const nextDue = Math.min(hoursTo50 > 0 ? hoursTo50 : Infinity, hoursTo100 > 0 ? hoursTo100 : Infinity);

                  return (
                    <TableRow key={ac.id}>
                      <TableCell className="font-black text-sm">{ac.tailNumber}</TableCell>
                      <TableCell className="text-xs">{ac.make} {ac.model}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{ac.type}</Badge></TableCell>
                      <TableCell className="text-right font-mono font-bold">{(ac.currentHobbs || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{(ac.currentTacho || 0).toFixed(1)}</TableCell>
                      <TableCell>
                        {nextDue < 10 ? (
                          <Badge className="bg-red-500 hover:bg-red-600 gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> Due in {nextDue.toFixed(1)}h
                          </Badge>
                        ) : nextDue < 25 ? (
                          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> {nextDue.toFixed(1)}h remaining
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="h-3.5 w-3.5" /> Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
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
