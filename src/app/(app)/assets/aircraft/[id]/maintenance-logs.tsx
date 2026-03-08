'use client';

import { collection, query, orderBy } from 'firebase/firestore';
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
import type { MaintenanceLog } from '@/types/maintenance';
import { Skeleton } from '@/components/ui/skeleton';

interface MaintenanceLogsProps {
  aircraftId: string;
  tenantId: string;
}

export function MaintenanceLogs({ aircraftId, tenantId }: MaintenanceLogsProps) {
  const firestore = useFirestore();

  const logsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`),
            orderBy('date', 'desc')
          )
        : null,
    [firestore, tenantId, aircraftId]
  );

  const { data: logs, isLoading } = useCollection<MaintenanceLog>(logsQuery);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Engineer/AMO</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs && logs.length > 0 ? (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.date), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="font-semibold">{log.maintenanceType}</TableCell>
                <TableCell className="max-w-md truncate">{log.details}</TableCell>
                <TableCell>
                  <p className="text-xs font-medium">{log.ameNo || 'N/A'}</p>
                  <p className="text-[10px] text-muted-foreground">{log.amoNo || ''}</p>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No maintenance records found for this aircraft.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
