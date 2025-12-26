'use client';

import { cn } from '@/lib/utils';
import type { TableTemplate } from '@/app/(app)/development/table-builder/page';

type TableData = TableTemplate['tableData'];

interface TableViewerProps {
    tableData: TableData;
}

export function TableViewer({ tableData }: TableViewerProps) {
    if (!tableData) return null;

    const { cells, colWidths, rowHeights } = tableData;

    return (
        <div className="overflow-auto rounded-lg border">
            <div
                className="grid gap-0 relative"
                style={{
                    gridTemplateColumns: colWidths.map(w => `${w}px`).join(' '),
                    gridTemplateRows: rowHeights.map(h => `${h}px`).join(' '),
                }}
            >
                {cells.map((cell) => {
                    if (cell.hidden) return null;
                    const key = `${cell.r}-${cell.c}`;

                    return (
                        <div
                            key={key}
                            className={cn(
                                'flex items-center justify-center border text-sm p-1'
                            )}
                            style={{
                                gridRowStart: cell.r + 1,
                                gridRowEnd: cell.r + 1 + cell.rowSpan,
                                gridColumnStart: cell.c + 1,
                                gridColumnEnd: cell.c + 1 + cell.colSpan,
                            }}
                        >
                            <span className="truncate">{cell.content}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
