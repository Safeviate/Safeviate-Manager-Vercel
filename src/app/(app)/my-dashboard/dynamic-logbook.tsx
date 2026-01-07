'use client';

import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { TableData } from '@/app/(app)/development/table-builder/page';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { differenceInMinutes, format } from 'date-fns';

type UserProfile = PilotProfile | Personnel;

type EnrichedBooking = Booking & {
  aircraft?: Aircraft;
  picName?: string;
  studentName?: string;
  instructorName?: string;
  flightTimeHours?: string;
};

interface DynamicLogbookProps {
  templateData: TableData;
  bookings: EnrichedBooking[];
}

const getCellDataForBooking = (header: string, booking: EnrichedBooking): string => {
    const normalizedHeader = header.toLowerCase().trim();

    switch (normalizedHeader) {
        case 'date':
            return booking.date ? format(new Date(booking.date), 'dd/MM/yyyy') : 'N/A';
        case 'booking number':
            return booking.bookingNumber?.toString() || 'N/A';
        case 'type':
            return booking.aircraft?.type || 'N/A';
        case 'registration':
            return booking.aircraft?.tailNumber || 'N/A';
        case 'pic':
        case 'pilot in command':
            return booking.picName || 'N/A';
        case 'student':
            return booking.studentName || 'N/A';
        case 'instructor':
             return booking.instructorName || 'N/A';
        case 'flight details':
            return booking.flightDetails || '';
        case 'flight time':
            return booking.flightTimeHours || '0.0';
        case 'from':
             // Placeholder, assuming flight plan is not integrated yet
            return 'TBD';
        case 'to':
            // Placeholder
            return 'TBD';
        default:
            return ''; // Return empty for headers that don't match
    }
}


export function DynamicLogbook({ templateData, bookings }: DynamicLogbookProps) {
    const { cells, rows, cols, colWidths, rowHeights } = templateData;

    const getCell = (r: number, c: number) => cells.find(cell => cell.r === r && cell.c === c);

    // Find the first row that isn't part of a merged cell starting from row 0
    let dataStartRow = 0;
    for (let r = 0; r < rows; r++) {
        const cell = getCell(r, 0);
        if (cell && !cell.hidden) {
            dataStartRow = r + cell.rowSpan;
            break;
        }
         if (r > 0 && getCell(r-1, 0)?.rowSpan > 1) {
            continue;
        }
        dataStartRow = r + 1;
        break;
    }
    
    const headers = [];
    if (dataStartRow > 0) {
        for(let c = 0; c < cols; c++) {
            const headerCell = getCell(dataStartRow - 1, c);
            if (headerCell && !headerCell.hidden) {
                headers.push(headerCell.content);
            } else {
                // Find the cell that spans over this column
                for(let r = 0; r < dataStartRow; r++) {
                    const spanningCell = cells.find(cell => cell.r === r && cell.c <= c && (cell.c + cell.colSpan) > c);
                    if(spanningCell) {
                         headers.push(spanningCell.content);
                         break;
                    }
                }
            }
        }
    }


  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <thead
          style={{
            display: 'grid',
            gridTemplateColumns: colWidths.map(w => `${w}px`).join(' '),
          }}
        >
          {Array.from({ length: dataStartRow }).map((_, rIndex) => (
            <tr key={`header-row-${rIndex}`} className="flex contents">
              {Array.from({ length: cols }).map((_, cIndex) => {
                const cell = getCell(rIndex, cIndex);
                if (!cell || cell.hidden) return null;
                return (
                  <th
                    key={`header-cell-${rIndex}-${cIndex}`}
                    className="p-2 border font-semibold text-sm"
                    style={{
                      gridRowStart: rIndex + 1,
                      gridRowEnd: rIndex + cell.rowSpan + 1,
                      gridColumnStart: cIndex + 1,
                      gridColumnEnd: cIndex + cell.colSpan + 1,
                      height: rowHeights.slice(rIndex, rIndex + cell.rowSpan).reduce((a, b) => a + b, 0),
                    }}
                  >
                    {cell.content}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <TableBody>
            {bookings.map((booking) => (
                <TableRow key={booking.id}>
                    {headers.map((header, index) => (
                        <TableCell key={index} style={{minWidth: `${colWidths[index]}px`}}>
                            {getCellDataForBooking(header, booking)}
                        </TableCell>
                    ))}
                </TableRow>
            ))}
            {bookings.length === 0 && (
                <TableRow>
                    <TableCell colSpan={cols} className="h-24 text-center">
                        No bookings to display.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
      </Table>
    </div>
  );
}
