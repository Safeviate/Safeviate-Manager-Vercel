'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Trash2, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { AircraftForm } from './aircraft-form';
import type { Aircraft } from '@/types/aircraft';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const canManage = hasPermission('assets-manage');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber', 'asc')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading } = useCollection<Aircraft>(aircraftQuery);

  const handleDelete = (id: string, tailNumber: string) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({ title: 'Aircraft Deleted', description: `${tailNumber} has been removed from the fleet.` });
  };

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and monitor technical status for all fleet assets.</p>
        </div>
        {canManage && <AircraftForm tenantId={tenantId} />}
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
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase font-bold">Tail Number</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Make/Model</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Type</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-right">Current Hobbs</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-right">Current Tacho</TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(aircraft || []).map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-bold text-sm tracking-tight">{ac.tailNumber}</TableCell>
                    <TableCell className="text-xs">{ac.make} {ac.model}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] py-0">{ac.type || 'Single-Engine'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{ac.currentHobbs?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                          <Link href={`/assets/aircraft/${ac.id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                          </Link>
                        </Button>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(ac.id, ac.tailNumber)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!aircraft || aircraft.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <Plane className="h-12 w-12 mb-2" />
                        <p className="text-sm font-medium">No aircraft registered.</p>
                      </div>
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
