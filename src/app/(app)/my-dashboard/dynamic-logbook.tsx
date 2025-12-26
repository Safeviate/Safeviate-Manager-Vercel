
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format, differenceInMinutes, parse } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { Booking } from '@/types/booking';
import type { TableTemplate } from '@/types/table-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';


interface DynamicLogbookProps {
  template: TableTemplate;
  userProfile: PilotProfile | Personnel;
}

const useLogbookData = (userProfile: PilotProfile | Personnel) => {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const bookingsQuery = useMemoFirebase(
      () => (firestore ? query(
        collection(firestore, `tenants/${tenantId}/bookings`),
        where('status', '==', 'Completed')
      ) : null),
      [firestore, tenantId]
    );

    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );
    
    const personnelQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null), [firestore, tenantId]);
    const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
    const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);
    const privatePilotsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/private-pilots`)) : null), [firestore, tenantId]);


    const { data: allBookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsQuery);
    const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
    const { data: instructors, isLoading: isLoadingInstructors } = useCollection<PilotProfile>(instructorsQuery);
    const { data: students, isLoading: isLoadingStudents } = useCollection<PilotProfile>(studentsQuery);
    const { data: privatePilots, isLoading: isLoadingPrivatePilots } = useCollection<PilotProfile>(privatePilotsQuery);

    
    const isLoading = isLoadingBookings || isLoadingAircrafts || isLoadingPersonnel || isLoadingInstructors || isLoadingStudents || isLoadingPrivatePilots;
    
    const allUsersMap = useMemo(() => {
        const userMap = new Map<string, PilotProfile | Personnel>();
        const allUserLists = [personnel, instructors, students, privatePilots];
        allUserLists.forEach(list => {
            if (list) {
                list.forEach(p => userMap.set(p.id, p));
            }
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
                booking.instructorId === userProfile.id ||
                (booking.studentId && booking.studentId === userProfile.id) ||
                booking.createdById === userProfile.id
            )
            .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
    }, [allBookings, userProfile]);

    return { userBookings, aircraftMap, allUsersMap, isLoading };
};

export function DynamicLogbook({ template, userProfile }: DynamicLogbookProps) {
    const { userBookings, aircraftMap, allUsersMap, isLoading } = useLogbookData(userProfile);
    const { tableData } = template;

    const getCellDataForBooking = (booking: Booking, columnId: string): string => {
        const aircraft = aircraftMap.get(booking.aircraftId);
        
        const flightMinutes = (booking.status === 'Completed' && booking.startTime && booking.endTime) ? differenceInMinutes(
            parse(`${booking.bookingDate} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
            parse(`${booking.bookingDate} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
        ) : 0;
        const flightHours = (flightMinutes / 60).toFixed(1);

        const student = booking.studentId ? allUsersMap.get(booking.studentId) : null;
        const instructor = booking.instructorId ? allUsersMap.get(booking.instructorId) : null;
        
        const creator = booking.createdById ? allUsersMap.get(booking.createdById) : null;
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'N/A';

        switch(columnId.toLowerCase()) {
            case 'date': return format(new Date(booking.bookingDate), 'yyyy-MM-dd');
            case 'booking no': return booking.bookingNumber.toString();
            case 'type': return aircraft?.model || 'N/A';
            case 'registration': return aircraft?.tailNumber || 'N/A';
            case 'pilot in command': return creatorName;
            case 'student': return student ? `${student.firstName} ${student.lastName}` : '---';
            case 'instructor': return instructor ? `${instructor.firstName} ${instructor.lastName}` : '---';
            case 'flight time': return `${flightHours}h`;
            default: return '';
        }
    };


    const headerRowsCount = tableData.cells.reduce((max, cell) => (cell.rowSpan > 1) ? Math.max(max, cell.r + cell.rowSpan) : max, 1);
    
    const headerCells = tableData.cells.filter(cell => cell.r < headerRowsCount);
    
    const dataColumns = headerCells.filter(cell => {
        const hasChildren = headerCells.some(otherCell => 
            otherCell.r > cell.r && 
            otherCell.c >= cell.c && 
            otherCell.c < cell.c + cell.colSpan
        );
        return !hasChildren;
    }).sort((a,b) => a.c - b.c);
    
    const bodyRows = userBookings.length > 0 ? userBookings : [null]; 

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Logbook</CardTitle>
                <CardDescription>A record of your completed flights.</CardDescription>
            </CardHeader>
            <CardContent>
                <div 
                    className="overflow-x-auto rounded-lg border"
                    style={{ 
                      gridTemplateColumns: tableData.colWidths.map(w => `${w}px`).join(' '),
                    }}
                >
                    <Table>
                        <TableHeader>
                            {Array.from({ length: headerRowsCount }).map((_, rowIndex) => (
                                <TableRow key={`header-row-${rowIndex}`}>
                                    {tableData.cells
                                        .filter(cell => cell.r === rowIndex && !cell.hidden)
                                        .map(cell => (
                                            <TableHead
                                                key={`header-${cell.r}-${cell.c}`}
                                                colSpan={cell.colSpan}
                                                rowSpan={cell.rowSpan}
                                                className={cn(
                                                    "border text-center align-middle font-semibold",
                                                    cell.content === '' && "border-transparent"
                                                )}
                                                style={{
                                                  width: tableData.colWidths.slice(cell.c, cell.c + cell.colSpan).reduce((a,b) => a + b, 0),
                                                }}
                                            >
                                                {cell.content}
                                            </TableHead>
                                        ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                         <TableBody>
                            {bodyRows.map((booking, index) => (
                                <TableRow key={booking ? booking.id : 'empty-row'}>
                                    {dataColumns.map(col => (
                                        <TableCell key={`cell-${index}-${col.c}`} className="text-center border">
                                            {booking ? getCellDataForBooking(booking, col.content) : ''}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                            {userBookings.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={dataColumns.length} className="h-24 text-center">
                                        No completed flights found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

