'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Gauge, Settings } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canManageAssets = hasPermission('assets-manage');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage organizational assets, tracking hours and compliance status.</p>
        </div>
        {canManageAssets && (
          <Button asChild size="sm">
            <Link href="/assets/aircraft/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
            </Link>
          </Button>
        )}
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase font-bold">Tail Number</TableHead>
                <TableHead className="text-xs uppercase font-bold">Make/Model</TableHead>
                <TableHead className="text-xs uppercase font-bold text-right">Hobbs</TableHead>
                <TableHead className="text-xs uppercase font-bold text-right">Tacho</TableHead>
                <TableHead className="text-xs uppercase font-bold">Status</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft && aircraft.length > 0 ? (
                aircraft.map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-bold text-primary">{ac.tailNumber}</TableCell>
                    <TableCell className="text-xs">{ac.make} {ac.model}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] py-0">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="default" size="sm" className="h-8 px-3 text-xs">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                          </Link>
                        </Button>
                        {canManageAssets && (
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                    No aircraft recorded in the fleet.
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
