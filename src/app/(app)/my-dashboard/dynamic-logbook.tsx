'use client';

import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { TableData } from '@/app/(app)/development/table-builder/page';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { differenceInMinutes, format } from 'date-fns';
import { cn } from '@/lib/utils';

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
    
    const headers: { text: string, colSpan: number }[] = [];
    if (dataStartRow > 0) {
        // We only care about the last row of the headers for data mapping
        const lastHeaderRowIndex = dataStartRow - 1;
        for(let c = 0; c < cols; c++) {
            const cell = getCell(lastHeaderRowIndex, c);
            if (cell && !cell.hidden) {
                headers.push({ text: cell.content, colSpan: cell.colSpan });
            }
        }
    }


  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="grid" style={{ gridTemplateColumns: colWidths.map(w => `${w}px`).join(' ') }}>
          {/* Header */}
          <div className="contents" role="rowgroup">
            {Array.from({ length: dataStartRow }).map((_, rIndex) => (
                <div className="contents" key={`header-row-${rIndex}`} role="row">
                {Array.from({ length: cols }).map((_, cIndex) => {
                    const cell = getCell(rIndex, cIndex);
                    if (!cell || cell.hidden) return null;
                    return (
                    <div
                        key={`header-cell-${rIndex}-${cIndex}`}
                        className="p-2 border-b border-r bg-muted/20 font-semibold text-sm flex items-center justify-center text-center"
                        style={{
                            gridRow: `${rIndex + 1} / span ${cell.rowSpan}`,
                            gridColumn: `${cIndex + 1} / span ${cell.colSpan}`,
                            minHeight: rowHeights.slice(rIndex, rIndex + cell.rowSpan).reduce((a, b) => a + b, 0),
                        }}
                        role="columnheader"
                    >
                        {cell.content}
                    </div>
                    );
                })}
                </div>
            ))}
          </div>

          {/* Body */}
           <div className="contents" role="rowgroup">
              {bookings.map((booking, bookingIndex) => (
                  <div className="contents" key={booking.id} role="row">
                      {headers.map((header, headerIndex) => {
                          const data = getCellDataForBooking(header.text, booking);
                          return (
                              <div
                                key={`${booking.id}-${headerIndex}`}
                                className="p-2 border-b border-r text-sm flex items-center"
                                style={{
                                    gridRow: dataStartRow + bookingIndex + 1,
                                    gridColumn: `${headers.slice(0, headerIndex).reduce((acc, h) => acc + h.colSpan, 0) + 1} / span ${header.colSpan}`,
                                }}
                                role="cell"
                              >
                                  {data}
                              </div>
                          );
                      })}
                  </div>
              ))}
          </div>
      </div>
      {bookings.length === 0 && (
          <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
              No bookings to display.
          </div>
      )}
    </div>
  );
}
