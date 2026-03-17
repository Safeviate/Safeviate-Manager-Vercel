'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage technical status and lifecycle for all organization assets.</p>
        </div>
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs uppercase font-bold">Tail Number</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Make/Model</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Type</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Current Hobbs</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Current Tacho</TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold">Next 100h</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleet && fleet.length > 0 ? (
                  fleet.map((ac) => (
                    <TableRow key={ac.id}>
                      <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                      <TableCell className="text-sm">{ac.make} {ac.model}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{ac.type || 'Single-Engine'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{(ac.currentHobbs || 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(ac.currentTacho || 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-center font-mono text-xs">{(ac.tachoAtNext100Inspection || 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                      No aircraft found in the organization fleet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
