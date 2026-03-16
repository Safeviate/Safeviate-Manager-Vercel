'use client';

import { useMemo, useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Trash2, Plane } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { deleteDocumentNonBlocking } from '@/firebase';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  const canManage = hasPermission('assets-manage');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  const handleDelete = (id: string, tail: string) => {
    if (!firestore || !window.confirm(`Are you sure you want to delete ${tail}?`)) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({ title: 'Aircraft Removed', description: `${tail} has been deleted from the fleet.` });
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-10 w-[300px] rounded-full" />
        <Card><CardContent className="p-8"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and monitor technical status across all assets.</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/assets/aircraft/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
            </Link>
          </Button>
        )}
      </div>

      <Card className="flex-1 min-h-0 shadow-none border overflow-hidden">
        <CardContent className="p-0 h-full overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-xs uppercase font-bold">Tail Number</TableHead>
                <TableHead className="text-xs uppercase font-bold">Make/Model</TableHead>
                <TableHead className="text-xs uppercase font-bold text-right">Airframe Hours</TableHead>
                <TableHead className="text-xs uppercase font-bold text-right">Tacho</TableHead>
                <TableHead className="text-xs uppercase font-bold text-right">Next 50h</TableHead>
                <TableHead className="text-xs uppercase font-bold text-right">Next 100h</TableHead>
                <TableHead className="text-right text-xs uppercase font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(fleet || []).map((ac) => (
                <TableRow key={ac.id}>
                  <TableCell className="font-black text-sm text-primary">{ac.tailNumber}</TableCell>
                  <TableCell className="text-xs">{ac.make} {ac.model}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{ac.frameHours?.toFixed(1) || '0.0'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{ac.currentTacho?.toFixed(1) || '0.0'}</TableCell>
                  <TableCell className="text-right text-xs">
                    <Badge variant="outline" className="font-mono text-[10px]">{ac.tachoAtNext50Inspection?.toFixed(1) || '-'}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <Badge variant="outline" className="font-mono text-[10px]">{ac.tachoAtNext100Inspection?.toFixed(1) || '-'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="default" size="icon" className="h-8 w-8">
                        <Link href={`/assets/aircraft/${ac.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {canManage && (
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(ac.id, ac.tailNumber)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!fleet || fleet.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                      <Plane className="h-12 w-12" />
                      <p>No aircraft found in the fleet.</p>
                    </div>
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
