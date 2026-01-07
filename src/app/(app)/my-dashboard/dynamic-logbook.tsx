'use client';

import type { TableData } from '@/app/(app)/development/table-builder/page';
import type { Aircraft } from '@/app/(app)/assets/page';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { format } from 'date-fns';

type EnrichedBooking = {
  id: string;
  date?: string;
  bookingNumber?: number;
  aircraft?: Aircraft;
  picName?: string;
  studentName?: string;
  instructorName?: string;
  flightTimeHours?: string;
  flightDetails?: string;
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
        case 'model':
            return booking.aircraft?.model || 'N/A';
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
            return 'TBD';
        case 'to':
            return 'TBD';
        case 'aircraft': // This is a parent header, should not contain data directly
            return '';
        default:
            return ''; 
    }
}


export function DynamicLogbook({ templateData, bookings }: DynamicLogbookProps) {
    const { cells, rows, cols, colWidths, rowHeights } = templateData;

    const getCell = (r: number, c: number) => cells.find(cell => cell.r === r && cell.c === c);

    let headerRowCount = 0;
    let maxRowSpan = 0;
    for (let c = 0; c < cols; c++) {
        const cell = getCell(0, c);
        if (cell && !cell.hidden) {
            maxRowSpan = Math.max(maxRowSpan, cell.rowSpan);
        }
    }
    
    let tempHeaderRowCount = 0;
    let visitedRows = new Set();
    for (let c = 0; c < cols; c++) {
        const cell = getCell(0, c);
        if (cell && !cell.hidden) {
            if (!visitedRows.has(cell.r)) {
                visitedRows.add(cell.r);
                tempHeaderRowCount += cell.rowSpan > 1 ? 1 : 0;
            }
        }
    }

    let minRowSpanOfFirstRow = Infinity;
    for(let c=0; c<cols; c++){
      const cell = getCell(0,c);
      if(cell && !cell.hidden){
        minRowSpanOfFirstRow = Math.min(minRowSpanOfFirstRow, cell.rowSpan);
      }
    }
    headerRowCount = minRowSpanOfFirstRow > 1 ? 1 : maxRowSpan;

    const dataStartRow = headerRowCount > 0 ? headerRowCount : 1;

    const getLeafHeaders = () => {
        const leafHeaders: { text: string; colIndex: number }[] = [];
        const maxRow = dataStartRow -1;

        for (let c = 0; c < cols; c++) {
            let foundHeader = false;
            for (let r = maxRow; r >= 0; r--) {
                const cell = getCell(r, c);
                if (cell && !cell.hidden) {
                     // Check if this cell is the one that actually occupies this column `c`
                    const isCorrectCell = c >= cell.c && c < cell.c + cell.colSpan;
                    if(isCorrectCell){
                      // Check if it's a leaf node in its hierarchy
                      const isLeaf = !cells.some(other => other.r > r && other.c >= cell.c && other.c < cell.c + cell.colSpan && !other.hidden);
                      if (isLeaf) {
                          leafHeaders.push({ text: cell.content, colIndex: c });
                          foundHeader = true;
                          break; 
                      }
                    }
                }
            }
            if(!foundHeader) {
                // If no header is found for a column (which shouldn't happen in a well-formed table)
                leafHeaders.push({ text: '', colIndex: c });
            }
        }
        return leafHeaders;
    };
    
    const leafHeaders = getLeafHeaders();

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
                      {leafHeaders.map((header, headerIndex) => {
                          const data = getCellDataForBooking(header.text, booking);
                          return (
                              <div
                                key={`${booking.id}-${headerIndex}`}
                                className="p-2 border-b border-r text-sm flex items-center"
                                style={{
                                    gridRow: dataStartRow + bookingIndex + 1,
                                    gridColumn: `${header.colIndex + 1} / span 1`,
                                    minHeight: rowHeights[dataStartRow + bookingIndex] || '48px',
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
