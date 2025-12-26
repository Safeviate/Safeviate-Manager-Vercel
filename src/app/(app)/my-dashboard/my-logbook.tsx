
'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { Booking } from '@/types/booking';
import type { TableTemplate } from '@/types/table-template';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInMinutes, parse } from 'date-fns';

interface MyLogbookProps {
  userProfile: PilotProfile;
}

const renderHeaderRows = (tableData: TableTemplate['tableData']) => {
    const { rows, cols, cells } = tableData;
    const headerCells: (JSX.Element | null)[] = [];
  
    // Assuming headers are the first few rows, let's find the max row index of non-empty cells
    // This is a heuristic; a more robust solution might involve a "header row count" property
    const headerRowCount = cells.reduce((max, cell) => {
        if (cell.content?.trim()) {
            return Math.max(max, cell.r + cell.rowSpan);
        }
        return max;
    }, 0);


    for (let r = 0; r < headerRowCount; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = cells.find(cell => cell.r === r && cell.c === c);
            if (cell && !cell.hidden) {
                 headerCells.push(
                    <TableHead
                        key={`${r}-${c}`}
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                        className="text-center border"
                        style={{
                            gridColumn: `${cell.c + 1} / span ${cell.colSpan}`,
                            gridRow: `${cell.r + 1} / span ${cell.rowSpan}`,
                        }}
                    >
                        {cell.content}
                    </TableHead>
                 );
            }
        }
    }
    
    // Group cells by row for rendering
    const headerRowsJsx: JSX.Element[] = [];
    const processedCells = new Set<string>();

    for(let r = 0; r < headerRowCount; r++) {
        const rowCells: JSX.Element[] = [];
        for (let c = 0; c < cols; c++) {
            const key = `${r}-${c}`;
            if(processedCells.has(key)) continue;

            const cellData = cells.find(cell => cell.r === r && cell.c === c);
            if (cellData && !cellData.hidden) {
                rowCells.push(
                    <TableHead
                        key={key}
                        colSpan={cellData.colSpan}
                        rowSpan={cellData.rowSpan}
                        className="text-center border"
                    >
                        {cellData.content}
                    </TableHead>
                );

                // Mark all cells covered by this rowspan/colspan as processed
                for (let rs = 0; rs < cellData.rowSpan; rs++) {
                    for (let cs = 0; cs < cellData.colSpan; cs++) {
                        processedCells.add(`${r + rs}-${c + cs}`);
                    }
                }
            }
        }
        if(rowCells.length > 0) {
            headerRowsJsx.push(<TableRow key={`header-row-${r}`}>{rowCells}</TableRow>);
        }
    }


    return headerRowsJsx;
};


const getLeafColumnIds = (tableData: TableTemplate['tableData']): string[] => {
    if (!tableData || !tableData.cells) return [];
    
    const headerRowCount = tableData.cells.reduce((max, cell) => {
        if (cell.content?.trim()) {
            return Math.max(max, cell.r + cell.rowSpan);
        }
        return max;
    }, 0);

    const leafCells = tableData.cells.filter(cell => {
        const isBottomHeader = (cell.r + cell.rowSpan) === headerRowCount;
        return isBottomHeader && cell.content.trim() !== '';
    });
    
    // Sort them by their column index to ensure order
    leafCells.sort((a,b) => a.c - b.c);

    // Return the content of the cell as its ID
    return leafCells.map(cell => cell.content);
};

export function MyLogbook({ userProfile }: MyLogbookProps) {
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const logbookTemplateRef = useMemoFirebase(
    () => (firestore && userProfile.logbookTemplateId)
      ? doc(firestore, `tenants/${tenantId}/table-templates`, userProfile.logbookTemplateId)
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

  const { data: template, isLoading: isLoadingTemplate } = useDoc<TableTemplate>(logbookTemplateRef);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(completedBookingsQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection(aircraftsQuery);

  const aircraftMap = useMemo(() => {
    if (!aircrafts) return new Map();
    return new Map(aircrafts.map(ac => [ac.id, ac.tailNumber]));
  }, [aircrafts]);

  const { headerRows, leafColumnIds } = useMemo(() => {
    if (!template?.tableData) return { headerRows: [], leafColumnIds: [] };
    return { 
        headerRows: renderHeaderRows(template.tableData),
        leafColumnIds: getLeafColumnIds(template.tableData)
    };
  }, [template]);
  
  const getCellData = (booking: Booking, columnId: string): string => {
    const flightMinutes = differenceInMinutes(
      parse(`${booking.bookingDate} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
      parse(`${booking.bookingDate} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
    );
    const flightHours = (flightMinutes / 60).toFixed(1);

    // Match based on column header text (the 'columnId' here)
    switch (columnId.toUpperCase()) {
      case 'DATE': return format(new Date(booking.bookingDate), 'yyyy-MM-dd');
      case 'AIRCRAFT': return aircraftMap.get(booking.aircraftId) || booking.aircraftId;
      case 'SINGLE ENGINE': return booking.type === 'Training Flight' || booking.type === 'Private Flight' ? flightHours : '';
      case 'TOTAL TIME': return flightHours;
      default: return '';
    }
  };


  const isLoading = isLoadingTemplate || isLoadingBookings || isLoadingAircrafts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Logbook</CardTitle>
        <CardDescription>A summary of your completed flights, based on your assigned logbook template.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : (
          !userProfile.logbookTemplateId ? (
            <p className="text-muted-foreground text-center">No logbook template assigned. Please contact an administrator.</p>
          ) : !template ? (
            <p className="text-muted-foreground text-center">Could not load logbook template. Check console for errors.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {headerRows}
                </TableHeader>
                <TableBody>
                  {bookings && bookings.length > 0 ? (
                    bookings.map(booking => (
                      <TableRow key={booking.id}>
                        {leafColumnIds.map((id, index) => (
                          <TableCell key={`${booking.id}-${index}`} className="text-center">{getCellData(booking, id)}</TableCell>
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
