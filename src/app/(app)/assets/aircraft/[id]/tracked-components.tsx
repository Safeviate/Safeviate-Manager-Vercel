'use client';

import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import type { AircraftComponent } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface TrackedComponentsProps {
  aircraftId: string;
  tenantId: string;
}

export function TrackedComponents({ aircraftId, tenantId }: TrackedComponentsProps) {
  const firestore = useFirestore();

  const componentsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`))
        : null,
    [firestore, tenantId, aircraftId]
  );

  const { data: components, isLoading } = useCollection<AircraftComponent>(componentsQuery);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component Name</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>TSN (Hours)</TableHead>
            <TableHead>TSO (Hours)</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components && components.length > 0 ? (
            components.map((comp) => {
              const remaining = Math.max(0, comp.maxHours - comp.tsn);
              const status = remaining < 50 ? 'Critical' : remaining < 100 ? 'Warning' : 'Healthy';
              
              return (
                <TableRow key={comp.id}>
                  <TableCell className="font-semibold">
                    {comp.name}
                    <p className="text-[10px] text-muted-foreground font-normal">{comp.manufacturer} P/N: {comp.partNumber}</p>
                  </TableCell>
                  <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                  <TableCell>{comp.tsn.toFixed(1)}</TableCell>
                  <TableCell>{comp.tso.toFixed(1)}</TableCell>
                  <TableCell className="font-bold">{remaining.toFixed(1)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={status === 'Healthy' ? 'secondary' : status === 'Warning' ? 'outline' : 'destructive'}>
                      {status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No tracked components defined for this aircraft.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
