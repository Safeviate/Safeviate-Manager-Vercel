
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
}

const createTableData = (rows: number, cols: number): TableData => {
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
    };
};


export default function TableBuilderPage() {
    const [tableData, setTableData] = useState<TableData>(() => createTableData(5, 5));
    const [numRows, setNumRows] = useState(5);
    const [numCols, setNumCols] = useState(5);

    const handleUpdateGrid = () => {
        const rows = Math.max(1, numRows);
        const cols = Math.max(1, numCols);
        setTableData(createTableData(rows, cols));
    };

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
            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Label htmlFor="rows">Rows</Label>
                    <Input 
                        id="rows"
                        type="number" 
                        value={numRows} 
                        onChange={(e) => setNumRows(parseInt(e.target.value, 10))}
                        className="w-20"
                    />
                </div>
                 <div className="flex items-center gap-2">
                    <Label htmlFor="cols">Columns</Label>
                    <Input 
                        id="cols"
                        type="number" 
                        value={numCols} 
                        onChange={(e) => setNumCols(parseInt(e.target.value, 10))}
                        className="w-20"
                    />
                </div>
                <Button onClick={handleUpdateGrid}>Update Grid</Button>
            </div>
             <div className="w-full overflow-auto border rounded-lg">
                <div 
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${tableData.cols}, minmax(120px, 1fr))` }}
                >
                    {tableData.cells.map(cell => (
                        <div
                            key={`${cell.r}-${cell.c}`}
                            className={cn(
                                'border p-1 h-14 flex items-center justify-center',
                                'transition-colors'
                            )}
                        >
                            <span className="text-xs text-muted-foreground">{cell.r},{cell.c}</span>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
