'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { TableData } from '@/types/table-template';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parse, differenceInMinutes } from 'date-fns';
import type { Aircraft } from '@/app/(app)/assets/page';

type EnrichedBooking = Booking & {
    flightTimeHours: string;
    aircraft?: Aircraft;
    picName?: string;
};

// This helper function will contain the logic to get the correct data for each cell
const getCellDataForBooking = (
    booking: EnrichedBooking,
    columnLabel: string,
): string => {
    // Normalize label to a machine-readable key
    const key = columnLabel.toLowerCase().replace(/\s+/g, ' ').trim();

    switch (key) {
        case 'date':
            return format(new Date(booking.date), 'PPP');
        case 'booking number':
            return booking.bookingNumber.toString();
        case 'type':
            return booking.aircraft?.type || 'N/A';
        case 'registration':
            return booking.aircraft?.tailNumber || 'N/A';
        case 'pilot in command':
            return booking.picName || 'N/A';
        case 'flight details':
            return booking.flightDetails || 'N/A';
        case 'flight time':
             return `${booking.flightTimeHours}h`;
        default:
            return ''; // Return empty string for unhandled columns
    }
};


interface DynamicLogbookProps {
    template: TableData;
    userProfile: PilotProfile;
}

export function DynamicLogbook({ template, userProfile }: DynamicLogbookProps) {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        // Query for bookings created by the user, or where they are the student/instructor/pilot
        return query(
            collection(firestore, `tenants/${tenantId}/bookings`),
            where('createdById', '==', userProfile.id)
            // In a real scenario, you'd also add queries for:
            // where('studentId', '==', userProfile.id)
            // where('instructorId', '==', userProfile.id)
        );
    }, [firestore, tenantId, userProfile]);
    
    // Fetch all users to map IDs to names.
    const allUsersQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/pilots`) : null), [firestore, tenantId]);
    const { data: allUsers, isLoading: isLoadingUsers } = useCollection<PilotProfile>(allUsersQuery);
    const { data: allAircraft, isLoading: isLoadingAircraft } = useCollection<Aircraft>(useMemoFirebase(() => firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null, [firestore, tenantId]));


    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);

    const allUsersMap = useMemo(() => {
        if (!allUsers) return new Map();
        return new Map(allUsers.map(u => [u.id, u]));
    }, [allUsers]);
    
    const aircraftMap = useMemo(() => {
        if (!allAircraft) return new Map();
        return new Map(allAircraft.map(a => [a.id, a]));
    }, [allAircraft]);

    const enrichedBookings = useMemo((): EnrichedBooking[] => {
        if (!bookings) return [];
        return bookings.map(booking => {
            const flightMinutes = (booking.status === 'Completed' && booking.startTime && booking.endTime) ? differenceInMinutes(
                parse(`${booking.date} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
                parse(`${booking.date} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
            ) : 0;
            const flightTimeHours = (flightMinutes / 60).toFixed(1);

            const aircraft = aircraftMap.get(booking.aircraftId);
            
            let pic: PilotProfile | undefined;
            if (booking.type === 'Training Flight') {
                pic = allUsersMap.get(booking.instructorId || '');
            } else {
                pic = allUsersMap.get(booking.createdById || '');
            }
            const picName = pic ? `${pic.firstName} ${pic.lastName}` : 'N/A';

            return { ...booking, flightTimeHours, aircraft, picName };
        });
    }, [bookings, allUsersMap, aircraftMap]);

    const getCell = (r: number, c: number) => template.cells.find(cell => cell.r === r && cell.c === c);

    if (isLoadingBookings || isLoadingUsers || isLoadingAircraft) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>My Logbook</CardTitle>
                    <CardDescription>Your personal flight and duty records.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        );
    }

    const headerRows: JSX.Element[] = [];
    let headerRowCount = 0;
    while(true) {
        const rowCells = template.cells.filter(c => c.r === headerRowCount && !c.hidden);
        if (rowCells.length === 0 || rowCells.every(c => !c.content.trim())) {
            break;
        }
        headerRows.push(
             <tr key={`header-row-${headerRowCount}`}>
                {rowCells.map(cell => {
                    return (
                        <th
                            key={`${cell.r}-${cell.c}`}
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                            className="px-4 py-2 border text-left font-semibold"
                            style={{ minWidth: template.colWidths[cell.c] }}
                        >
                            {cell.content}
                        </th>
                    );
                })}
            </tr>
        );
        headerRowCount++;
    }


    return (
        <Card>
             <CardHeader>
                <CardTitle>My Logbook</CardTitle>
                <CardDescription>Your personal flight and duty records.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-muted/50">
                           {headerRows}
                        </thead>
                        <tbody>
                            {enrichedBookings.map(booking => {
                                const rowData: (string | React.ReactNode)[] = [];
                                for (let c = 0; c < template.cols; c++) {
                                    let headerCellLabel = '';
                                    // Iterate upwards from the last header row to find the most specific header
                                    for(let r = headerRowCount - 1; r >= 0; r--) {
                                        const cell = getCell(r, c);
                                        // If a cell exists and it's not a column-spanning header that we've passed
                                        if (cell && !cell.hidden) {
                                            headerCellLabel = cell.content;
                                            break; // Found the most specific header for this column
                                        }
                                    }
                                    rowData.push(getCellDataForBooking(booking, headerCellLabel));
                                }

                                return (
                                    <tr key={booking.id} className="border-b">
                                        {rowData.map((data, index) => (
                                            <td key={index} className="px-4 py-2 border-r">{data}</td>
                                        ))}
                                    </tr>
                                )
                            })}
                            {enrichedBookings.length === 0 && (
                                <tr>
                                    <td colSpan={template.cols} className="text-center p-8 text-muted-foreground">
                                        No logbook entries found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
