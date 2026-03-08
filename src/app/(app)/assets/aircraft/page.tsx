'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plane, Eye, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftListPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts'), orderBy('tailNumber')) : null),
    [firestore]
  );

  const { data: aircrafts, isLoading } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground">Monitor and maintain your organization's aircraft assets.</p>
        </div>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8"><Skeleton className="h-48 w-full" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Make / Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Current Tacho</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aircrafts?.map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-bold">{ac.tailNumber}</TableCell>
                    <TableCell>{ac.make} {ac.model}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ac.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/assets/aircraft/${ac.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View Tech Log
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!aircrafts || aircrafts.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No aircraft found in the fleet.
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
