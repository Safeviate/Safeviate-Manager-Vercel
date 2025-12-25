'use client';

import { useState, useMemo } from 'react';
import { produce } from 'immer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// --- Types ---
interface Cell {
  r: number;
  c: number;
  content?: string;
}

interface TableData {
  rows: number;
  cols: number;
  cells: Cell[];
  rowHeights: number[];
  colWidths: number[];
}

const createInitialTableData = (rows: number, cols: number): TableData => {
    const cells: Cell[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push({ r, c });
        }
    }
    return {
        rows,
        cols,
        cells,
        rowHeights: Array(rows).fill(40),
        colWidths: Array(cols).fill(120),
    };
};


export default function TableBuilderPage() {
    const [tableData, setTableData] = useState<TableData>(() => createInitialTableData(5, 5));

    const totalWidth = useMemo(() => {
        if (!tableData) return 0;
        return tableData.colWidths.reduce((acc, width) => acc + width, 0);
    }, [tableData]);

    const gridTemplateColumns = useMemo(() => {
        if (!tableData) return '';
        return tableData.colWidths.map(w => `${w}px`).join(' ');
    }, [tableData]);

    const gridTemplateRows = useMemo(() => {
        if (!tableData) return '';
        const headerHeight = 40; // Height for the column controls
        const rowHeights = tableData.rowHeights.map(h => `${h}px`).join(' ');
        return `${headerHeight}px ${rowHeights}`;
    }, [tableData]);

  if (!tableData) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Table Builder</CardTitle>
            <CardDescription>A visual tool for creating and configuring complex table layouts.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="w-full overflow-auto border rounded-lg">
                <div 
                    className="grid"
                    style={{ 
                        width: `${totalWidth}px`,
                        gridTemplateColumns,
                        gridTemplateRows,
                     }}
                >
                    {/* Column Headers */}
                    <div 
                        className="col-span-full grid sticky top-0 z-10 bg-muted/50" 
                        style={{ gridTemplateColumns: 'subgrid', gridColumn: `1 / span ${tableData.cols}` }}
                    >
                         {Array.from({ length: tableData.cols }).map((_, c) => (
                            <div key={`header-${c}`} className="border-b border-r p-1">
                                <Input
                                    type="number"
                                    value={tableData.colWidths[c]}
                                    onChange={() => {}}
                                    className="h-8 w-full text-center"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Table Body Cells */}
                    {tableData.cells.map(cell => {
                        const style = {
                            gridRow: `${cell.r + 2}`,
                            gridColumn: `${cell.c + 1}`,
                            height: `${tableData.rowHeights[cell.r]}px`,
                        };
                        return (
                        <div
                            key={`${cell.r}-${cell.c}`}
                            style={style}
                            className={cn(
                                'border-b border-r flex items-center justify-center p-1',
                                'transition-colors'
                            )}
                        >
                            <span className="text-xs text-muted-foreground">{cell.r},{cell.c}</span>
                        </div>
                        );
                    })}
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
