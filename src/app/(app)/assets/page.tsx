'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft'; // Import from types

export default function AssetsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">
            Manage all aircraft in your organization's fleet.
          </p>
        </div>
        <Button asChild>
          <Link href="/assets/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aircraft
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Aircraft</CardTitle>
          <CardDescription>
            A list of all registered aircraft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : error ? (
            <div className="text-destructive text-center p-4">
              Failed to load aircraft: {error.message}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tail Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(aircraft || []).map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell>{ac.tailNumber}</TableCell>
                    <TableCell>{ac.model}</TableCell>
                    <TableCell>{ac.type}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/assets/${ac.id}`}>
                          <Eye className="mr-2" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {aircraft?.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground">
              No aircraft found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
