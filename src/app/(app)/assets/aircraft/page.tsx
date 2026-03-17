'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Plane, AlertTriangle } from 'lucide-react';
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

  const { data: aircraft, isLoading } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-0">
            <Skeleton className="h-64 w-full" />
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
          <p className="text-muted-foreground">Manage and monitor your entire fleet of training assets.</p>
        </div>
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Tail Number</TableHead>
                <TableHead>Make & Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Current Hobbs</TableHead>
                <TableHead className="text-right">Current Tacho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft || []).map((ac) => {
                const hoursTo50 = (ac.tachoAtNext50Inspection || 0) - (ac.currentTacho || 0);
                const isUrgent = hoursTo50 < 5;
                const isWarning = hoursTo50 < 10;

                return (
                  <TableRow key={ac.id}>
                    <TableCell>
                      <Plane className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                    <TableCell>{ac.make} {ac.model}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{ac.type || 'Single-Engine'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{(ac.currentHobbs || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{(ac.currentTacho || 0).toFixed(1)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isWarning && (
                          <Badge variant={isUrgent ? "destructive" : "secondary"} className="h-5 gap-1 text-[9px] px-1.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Insp {hoursTo50.toFixed(1)}h
                          </Badge>
                        )}
                        {!isWarning && <Badge variant="secondary" className="h-5 text-[9px] bg-green-100 text-green-700 border-green-200">Ready</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm" className="h-8 gap-2">
                        <Link href={`/assets/aircraft/${ac.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!aircraft || aircraft.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground italic">
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
