
'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { PilotProfile } from '../users/personnel/page';
import type { Booking } from '@/types/booking';
import type { LogbookTemplate, LogbookColumn } from '@/app/(app)/development/logbook-parser/page';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInMinutes, parse } from 'date-fns';

interface MyLogbookProps {
  userProfile: PilotProfile;
}

// Recursive helper to render table headers
const renderHeaderRows = (headerRows: any[][]) => {
  return headerRows.map((row, rowIndex) => (
    <TableRow key={`header-row-${rowIndex}`}>
      {row.map((cell) => (
        <TableHead
          key={cell.id}
          colSpan={cell.colSpan}
          rowSpan={cell.rowSpan}
          className="text-center border"
        >
          {cell.label}
        </TableHead>
      ))}
    </TableRow>
  ));
};

// Recursive helper to get all bottom-level column IDs
const getLeafColumnIds = (columns: LogbookColumn[]): string[] => {
  let ids: string[] = [];
  for (const col of columns) {
    if (col.subColumns && col.subColumns.length > 0) {
      ids = [...ids, ...getLeafColumnIds(col.subColumns)];
    } else {
      ids.push(col.id);
    }
  }
  return ids;
};


export function MyLogbook({ userProfile }: MyLogbookProps) {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const logbookTemplateRef = useMemoFirebase(
    () => (firestore && userProfile.logbookTemplateId)
      ? doc(firestore, `tenants/${tenantId}/logbook-templates`, userProfile.logbookTemplateId)
      : null,
    [firestore, tenantId, userProfile.logbookTemplateId]
  );

  const completedBookingsQuery = useMemoFirebase(
    () => (firestore && userProfile.id)
      ? query(
          collection(firestore, `tenants/${tenantId}/bookings`),
          where('pilotId', '==', userProfile.id),
          where('status', '==', 'Completed')
        )
      : null,
    [firestore, tenantId, userProfile.id]
  );
  
  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null),
    [firestore, tenantId]
  );

  const { data: template, isLoading: isLoadingTemplate } = useDoc<LogbookTemplate>(logbookTemplateRef);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(completedBookingsQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection(aircraftsQuery);

  const aircraftMap = useMemo(() => {
    if (!aircrafts) return new Map();
    return new Map(aircrafts.map(ac => [ac.id, ac.tailNumber]));
  }, [aircrafts]);

  const { headerRows, leafColumnIds } = useMemo(() => {
    if (!template?.columns) return { headerRows: [], leafColumnIds: [] };

    const rows: any[][] = [];
    const process = (columns: LogbookColumn[], level: number) => {
      if (!rows[level]) rows[level] = [];
      let maxLevel = level;
      let totalSubCols = 0;

      for (const col of columns) {
        const cell = { id: col.id, label: col.label, colSpan: 1, rowSpan: 1 };
        rows[level].push(cell);

        if (col.subColumns && col.subColumns.length > 0) {
          const subResult = process(col.subColumns, level + 1);
          cell.colSpan = subResult.totalSubCols;
          maxLevel = Math.max(maxLevel, subResult.maxLevel);
          totalSubCols += subResult.totalSubCols;
        } else {
          totalSubCols += 1;
        }
      }
      return { maxLevel, totalSubCols };
    };

    const { maxLevel } = process(template.columns, 0);

    for (let i = 0; i < rows.length; i++) {
      for (const cell of rows[i]) {
        const findCol = (cols: LogbookColumn[], id: string): LogbookColumn | undefined => {
          for (const c of cols) {
            if (c.id === id) return c;
            if (c.subColumns) {
              const found = findCol(c.subColumns, id);
              if (found) return found;
            }
          }
          return undefined;
        };
        const colData = findCol(template.columns, cell.id);
        if (colData && (!colData.subColumns || colData.subColumns.length === 0)) {
          cell.rowSpan = maxLevel - i + 1;
        }
      }
    }

    return { headerRows: rows, leafColumnIds: getLeafColumnIds(template.columns) };
  }, [template]);
  
  const getCellData = (booking: Booking, columnId: string): string => {
    const flightMinutes = differenceInMinutes(
      parse(`${booking.bookingDate} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
      parse(`${booking.bookingDate} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
    );
    const flightHours = (flightMinutes / 60).toFixed(1);

    switch (columnId) {
      case 'date': return format(new Date(booking.bookingDate), 'yyyy-MM-dd');
      case 'aircraft': return aircraftMap.get(booking.aircraftId) || booking.aircraftId;
      case 'singleEngineTime': return booking.type === 'Training Flight' || booking.type === 'Private Flight' ? flightHours : '';
      case 'totalTime': return flightHours;
      default: return '';
    }
  };


  const isLoading = isLoadingTemplate || isLoadingBookings || isLoadingAircrafts;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>My Logbook</CardTitle>
        <CardDescription>A summary of your completed flights.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : (
          !userProfile.logbookTemplateId ? (
            <p className="text-muted-foreground text-center">No logbook template assigned. Please contact an administrator.</p>
          ) : !template ? (
            <p className="text-muted-foreground text-center">Could not load logbook template.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {renderHeaderRows(headerRows)}
                </TableHeader>
                <TableBody>
                  {bookings && bookings.length > 0 ? (
                    bookings.map(booking => (
                      <TableRow key={booking.id}>
                        {leafColumnIds.map(id => (
                          <TableCell key={id} className="text-center">{getCellData(booking, id)}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={leafColumnIds.length || 1} className="h-24 text-center">
                        No completed flights found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
