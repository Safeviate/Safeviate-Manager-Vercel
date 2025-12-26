
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { format, differenceInMinutes, parse } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { Booking } from '@/types/booking';
import type { TableData, Cell } from '@/app/(app)/development/table-builder/page';

interface DynamicLogbookProps {
  tableData: TableData;
  userProfile: PilotProfile | Personnel;
}

// --- Data Fetching and Processing ---
const useLogbookData = (userProfile: PilotProfile | Personnel) => {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const bookingsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
        [firestore, tenantId]
    );
    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );
     const personnelQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
        [firestore, tenantId]
    );
    const instructorsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null),
        [firestore, tenantId]
    );
    const studentsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null),
        [firestore, tenantId]
    );
     const privatePilotsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null),
        [firestore, tenantId]
    );

    const { data: allBookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);
    const { data: privatePilots, isLoading: isLoadingPrivatePilots } = useCollection<PilotProfile>(privatePilotsQuery);
    
    const isLoading = isLoadingBookings || isLoadingAircrafts || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents || isLoadingPrivatePilots;

    const allUsers = useMemo(() => {
        const userMap = new Map<string, PilotProfile | Personnel>();
        [...(personnel || []), ...(instructors || []), ...(students || []), ...(privatePilots || [])].forEach(p => {
            if (p) userMap.set(p.id, p);
        });
        return userMap;
    }, [personnel, instructors, students, privatePilots]);

    const aircraftMap = useMemo(() => {
        if (!aircrafts) return new Map();
        return new Map(aircrafts.map(ac => [ac.id, ac]));
    }, [aircrafts]);

    const userBookings = useMemo(() => {
        if (!allBookings || !userProfile?.id) return [];
        
        return allBookings
            .filter(booking => 
                booking.pilotId === userProfile.id ||
                booking.instructorId === userProfile.id ||
                booking.studentId === userProfile.id
            )
            .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
    }, [allBookings, userProfile]);

    return { userBookings, aircraftMap, allUsers, isLoading };
};

// --- Template Analysis ---
const useTemplateAnalysis = (tableData: TableData) => {
    return useMemo(() => {
        const { cells, rows, cols } = tableData;
        const headerCells = cells.filter(cell => cell.content.trim() !== '');
        let headerRowCount = 0;
        if (headerCells.length > 0) {
            headerRowCount = Math.max(...headerCells.map(c => c.r)) + 1;
        }

        // Find the "leaf" columns - these are the columns we map data to.
        const leafColumns: { header: string; colIndex: number }[] = [];
        for (let c = 0; c < cols; c++) {
            let isLeaf = true;
            for (let r = 0; r < headerRowCount; r++) {
                const cell = cells.find(cl => cl.r === r && cl.c === c);
                if (cell && cell.colSpan > 1) {
                    isLeaf = false;
                    break;
                }
            }
            if (isLeaf) {
                // Find the most descriptive header for this column.
                let headerText = '';
                for (let r = headerRowCount - 1; r >= 0; r--) {
                    const cell = cells.find(cl => cl.r === r && c >= cl.c && c < cl.c + cl.colSpan);
                    if (cell && cell.content.trim()) {
                        headerText = cell.content.trim().toLowerCase();
                        break;
                    }
                }
                leafColumns.push({ header: headerText, colIndex: c });
            }
        }

        return { headerRowCount, leafColumns };
    }, [tableData]);
};


export function DynamicLogbook({ tableData, userProfile }: DynamicLogbookProps) {
    const { userBookings, aircraftMap, allUsers, isLoading } = useLogbookData(userProfile);
    const { headerRowCount, leafColumns } = useTemplateAnalysis(tableData);

    const getCellDataForBooking = (booking: Booking, header: string): string => {
        const aircraft = aircraftMap.get(booking.aircraftId);
        
        // Flight time calculation
        const flightMinutes = (booking.status === 'Completed' && booking.startTime && booking.endTime) ? differenceInMinutes(
            parse(`${booking.bookingDate} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
            parse(`${booking.bookingDate} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
        ) : 0;
        const flightHours = (flightMinutes / 60).toFixed(1);

        const student = booking.studentId ? allUsers.get(booking.studentId) : null;
        const instructor = booking.instructorId ? allUsers.get(booking.instructorId) : null;
        const pilot = booking.pilotId ? allUsers.get(booking.pilotId) : null;
        
        let picName = '';
        if (booking.type === 'Training Flight') {
            picName = instructor ? `${instructor.firstName} ${instructor.lastName}` : '';
        } else {
            picName = pilot ? `${pilot.firstName} ${pilot.lastName}` : '';
        }
        
        // Map data based on common header names
        switch(header) {
            case 'date': return format(new Date(booking.bookingDate), 'yyyy-MM-dd');
            case 'type': return aircraft?.model || 'N/A';
            case 'registration': return aircraft?.tailNumber || 'N/A';
            case 'student': return student ? `${student.firstName} ${student.lastName}` : 'N/A';
            case 'instructor': return instructor ? `${instructor.firstName} ${instructor.lastName}` : 'N/A';
            case 'pic': return picName;
            case 'flight time': return `${flightHours} hrs`;
            default: return '';
        }
    };

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    {Array.from({ length: headerRowCount }).map((_, rIndex) => (
                        <TableRow key={`header-row-${rIndex}`}>
                            {tableData.cells.filter(cell => cell.r === rIndex && !cell.hidden).map(cell => (
                                <TableCell 
                                    key={`header-${cell.r}-${cell.c}`}
                                    colSpan={cell.colSpan}
                                    rowSpan={cell.rowSpan}
                                    className="font-semibold border text-center align-middle bg-muted/50"
                                >
                                    {cell.content}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {userBookings.length > 0 ? (
                        userBookings.map(booking => (
                            <TableRow key={booking.id}>
                                {leafColumns.map(({ header, colIndex }) => (
                                    <TableCell key={`${booking.id}-${colIndex}`} className="text-center border">
                                        {getCellDataForBooking(booking, header)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={leafColumns.length || 1} className="h-24 text-center">
                                No flights found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
