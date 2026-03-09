
'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { Badge } from '@/components/ui/badge';

export default function FleetOverviewPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber', 'asc')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Overview</h1>
          <p className="text-muted-foreground">Manage and monitor your aircraft assets.</p>
        </div>
        <Button asChild>
          <Link href="/admin/database">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aircraft Registry</CardTitle>
          <CardDescription>All aircraft currently in the fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-destructive">Error: {error.message}</div>
          ) : aircraft && aircraft.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make/Model</TableHead>
                  <TableHead className="text-right">Current Tacho</TableHead>
                  <TableHead className="text-right">Next 50hr</TableHead>
                  <TableHead className="text-right">Next 100hr</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircraft.map(ac => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                    <TableCell>{ac.make} {ac.model}</TableCell>
                    <TableCell className="text-right font-mono">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right font-mono">{ac.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell className="text-right font-mono">{ac.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="default" size="sm">
                        <Link href={`/assets/aircraft/${ac.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">No aircraft found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
