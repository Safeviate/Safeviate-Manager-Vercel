
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
import type { Aircraft } from '@/app/(app)/assets/page';

interface MyLogbookProps {
  userProfile: PilotProfile;
}

const renderHeaderRows = (tableData: TableTemplate['tableData']) => {
    if (!tableData) return [];
    
    const { rows, cols, cells } = tableData;
    
    const headerRowCount = cells.reduce((max, cell) => {
        if (cell.content?.trim()) {
            return Math.max(max, cell.r + cell.rowSpan);
        }
        return max;
    }, 0);

    if (headerRowCount === 0) return [];
    
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
    
    leafCells.sort((a,b) => a.c - b.c);

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

  const allPilotsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, `tenants/${tenantId}/pilots`)) : null,
      [firestore, tenantId]
  );
  const allInstructorsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null,
      [firestore, tenantId]
  );


  const { data: template, isLoading: isLoadingTemplate } = useDoc<TableTemplate>(logbookTemplateRef);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(completedBookingsQuery);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
  const { data: pilots, isLoading: isLoadingPilots } = useCollection<PilotProfile>(allPilotsQuery);
  const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(allInstructorsQuery);

  const aircraftMap = useMemo(() => {
    if (!aircrafts) return new Map();
    return new Map(aircrafts.map(ac => [ac.id, ac]));
  }, [aircrafts]);

  const usersMap = useMemo(() => {
      const map = new Map<string, string>();
      (pilots || []).forEach(p => map.set(p.id, `${p.firstName} ${p.lastName}`));
      (instructors || []).forEach(p => map.set(p.id, `${p.firstName} ${p.lastName}`));
      return map;
  }, [pilots, instructors]);

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
    const aircraft = aircraftMap.get(booking.aircraftId);
    const pilotName = usersMap.get(booking.pilotId) || booking.pilotId;
    const instructorName = booking.instructorId ? (usersMap.get(booking.instructorId) || booking.instructorId) : '';

    const normalizedColumnId = columnId.toUpperCase().replace(/\s+/g, '');
    
    switch (normalizedColumnId) {
      case 'DATE': return format(new Date(booking.bookingDate), 'yyyy-MM-dd');
      case 'AIRCRAFT':
      case 'AIRCRAFTTYPE&REG':
          return aircraft ? `${aircraft.model} (${aircraft.tailNumber})` : booking.aircraftId;
      case 'SINGLEENGINE':
      case 'SINGLE-ENGINE':
        return booking.type === 'Training Flight' || booking.type === 'Private Flight' ? flightHours : '';
      case 'TOTALTIME':
      case 'TOTALFLIGHTTIME':
        return flightHours;
      case 'PILOTINCOMMAND':
      case 'PIC':
          return pilotName;
      case 'INSTRUCTOR':
          return instructorName;
      default: return '';
    }
  };


  const isLoading = isLoadingTemplate || isLoadingBookings || isLoadingAircrafts || isLoadingPilots || isLoadingInstructors;

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
