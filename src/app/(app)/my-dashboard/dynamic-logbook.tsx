'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import type { TableData } from '@/types/table-template';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { parse, differenceInMinutes } from 'date-fns';

type EnrichedBooking = Booking & {
    flightTimeHours: string;
};

// This helper function will contain the logic to get the correct data for each cell
const getCellDataForBooking = (
    booking: EnrichedBooking,
    columnLabel: string,
    allUsersMap: Map<string, PilotProfile>,
): string => {
    // Normalize label to a machine-readable key
    const key = columnLabel.toLowerCase().replace(/\s+/g, ' ');

    const creator = booking.createdById ? allUsersMap.get(booking.createdById) : null;
    const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'N/A';

    switch (key) {
        case 'flight details':
            return booking.flightDetails || 'N/A';
        case 'flight time':
             return `${booking.flightTimeHours}h`;
        case 'pilot in command':
            return creatorName;
        // Add more cases here as new columns are needed
        // e.g., case 'date': return format(new Date(booking.date), 'PPP');
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
    const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/pilots`) : null), [firestore, tenantId]);
    const { data: allUsers, isLoading: isLoadingUsers } = useCollection<PilotProfile>(usersQuery);

    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);

    const allUsersMap = useMemo(() => {
        if (!allUsers) return new Map();
        return new Map(allUsers.map(u => [u.id, u]));
    }, [allUsers]);

    const enrichedBookings = useMemo((): EnrichedBooking[] => {
        if (!bookings) return [];
        return bookings.map(booking => {
            const flightMinutes = (booking.status === 'Completed' && booking.startTime && booking.endTime) ? differenceInMinutes(
                parse(`${booking.date} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
                parse(`${booking.date} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date())
            ) : 0;
            const flightTimeHours = (flightMinutes / 60).toFixed(1);

            return { ...booking, flightTimeHours };
        });
    }, [bookings]);

    const getCell = (r: number, c: number) => template.cells.find(cell => cell.r === r && cell.c === c);

    if (isLoadingBookings || isLoadingUsers) {
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
        const rowCells = template.cells.filter(c => c.r === headerRowCount);
        if (rowCells.every(c => !c.content)) { // Stop if we hit an empty row
            break;
        }
        headerRows.push(
             <tr key={`header-row-${headerRowCount}`}>
                {rowCells.map(cell => {
                    if (cell.hidden) return null;
                    return (
                        <th
                            key={cell.c}
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
                                     // Find the header cell for this column to get its label
                                    let headerCellLabel = '';
                                    for(let r = 0; r < headerRowCount; r++) {
                                        const cell = getCell(r, c);
                                        if (cell && cell.content) {
                                            // Find the most specific header
                                            if (cell.colSpan === 1) {
                                                headerCellLabel = cell.content;
                                                break;
                                            }
                                        }
                                    }
                                    rowData.push(getCellDataForBooking(booking, headerCellLabel, allUsersMap));
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
