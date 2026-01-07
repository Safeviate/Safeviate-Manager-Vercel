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

// This helper function contains the explicit mapping logic.
const getCellDataForBooking = (
    booking: EnrichedBooking,
    headerText: string,
): string => {
    // Normalize header to a machine-readable key (lowercase)
    const key = headerText.toLowerCase().trim();

    switch (key) {
        case 'date':
            return booking.date ? format(new Date(booking.date), 'PPP') : 'N/A';
        case 'booking number':
            return booking.bookingNumber?.toString() || 'N/A';
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
        // Add cases for 'From' and 'To' if flight plan data is integrated later
        case 'from':
             return booking.flightPlanId || 'N/A'; // Placeholder
        case 'to':
             return booking.flightPlanId || 'N/A'; // Placeholder
        default:
            // If the header doesn't match a known field, return an empty string.
            return ''; 
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
    const allPilotsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // This is simplified. In a real app, you'd query 'personnel', 'instructors', etc.
        return query(collection(firestore, `tenants/${tenantId}/pilots`));
    }, [firestore, tenantId]);
    
    const { data: allPilots, isLoading: isLoadingPilots } = useCollection<PilotProfile>(allPilotsQuery);
    
    const allAircraftQuery = useMemoFirebase(() => firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null, [firestore, tenantId]);
    const { data: allAircraft, isLoading: isLoadingAircraft } = useCollection<Aircraft>(allAircraftQuery);


    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);

    const allUsersMap = useMemo(() => {
        if (!allPilots) return new Map();
        return new Map(allPilots.map(u => [u.id, u]));
    }, [allPilots]);
    
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

    if (isLoadingBookings || isLoadingPilots || isLoadingAircraft) {
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

    const headerRows: {cell: NonNullable<ReturnType<typeof getCell>>, headerText: string}[][] = [];
    let headerRowCount = 0;
    while(true) {
        const rowCells = template.cells
            .filter(c => c.r === headerRowCount && !c.hidden)
            .map(cell => ({ cell, headerText: cell.content || ''}));

        if (rowCells.length === 0 || rowCells.every(c => !c.headerText.trim())) {
            break;
        }
        headerRows.push(rowCells);
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
                           {headerRows.map((row, rIndex) => (
                               <tr key={`header-row-${rIndex}`}>
                                   {row.map(({cell}) => (
                                       <th
                                           key={`${cell.r}-${cell.c}`}
                                           colSpan={cell.colSpan}
                                           rowSpan={cell.rowSpan}
                                           className="px-4 py-2 border text-left font-semibold"
                                           style={{ minWidth: template.colWidths[cell.c] }}
                                       >
                                           {cell.content}
                                       </th>
                                   ))}
                               </tr>
                           ))}
                        </thead>
                        <tbody>
                            {enrichedBookings.map(booking => {
                                const rowData: (string | React.ReactNode)[] = [];
                                for (let c = 0; c < template.cols; c++) {
                                    let headerCellLabel = '';
                                    // Iterate upwards from the last header row to find the most specific header
                                    for(let r = headerRowCount - 1; r >= 0; r--) {
                                        const cell = getCell(r, c);
                                        if (cell && !cell.hidden) {
                                            headerCellLabel = cell.content;
                                            break; 
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
