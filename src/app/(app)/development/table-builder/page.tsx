
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// --- Types ---
interface Cell {
  r: number;
  c: number;
  content?: string;
  rowSpan: number;
  colSpan: number;
  hidden: boolean;
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
            cells.push({ r, c, rowSpan: 1, colSpan: 1, hidden: false });
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
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const handleUpdateGrid = () => {
        const rows = Math.max(1, numRows);
        const cols = Math.max(1, numCols);
        setTableData(createTableData(rows, cols));
        setSelectedCells(new Set()); // Clear selection on grid update
    };
    
    const toggleSelect = (r: number, c: number) => {
        const key = `${r}-${c}`;
        setSelectedCells(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(key)) {
                newSelection.delete(key);
            } else {
                newSelection.add(key);
            }
            return newSelection;
        });
    };

    const handleMerge = () => {
        if (selectedCells.size < 2) {
            toast({ title: "Select at least two cells to merge." });
            return;
        }
    
        const newCells = [...tableData.cells];
        const selectedCellObjects = Array.from(selectedCells).map(key => {
            const [r, c] = key.split('-').map(Number);
            return newCells.find(cell => cell.r === r && cell.c === c);
        }).filter(Boolean) as Cell[];
    
        // 1. Determine the bounding box of the merge area, considering spans.
        let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
        selectedCellObjects.forEach(cell => {
            minR = Math.min(minR, cell.r);
            maxR = Math.max(maxR, cell.r + cell.rowSpan - 1);
            minC = Math.min(minC, cell.c);
            maxC = Math.max(maxC, cell.c + cell.colSpan - 1);
        });
    
        const finalRowSpan = maxR - minR + 1;
        const finalColSpan = maxC - minC + 1;
    
        // 2. Verify that the selection forms a solid rectangle.
        let totalAreaInSelection = 0;
        selectedCellObjects.forEach(cell => {
            totalAreaInSelection += cell.rowSpan * cell.colSpan;
        });
    
        if (totalAreaInSelection !== finalRowSpan * finalColSpan) {
            toast({
                variant: "destructive",
                title: "Invalid Selection",
                description: "You can only merge a solid rectangular block of cells.",
            });
            return;
        }

        // 3. Find the master cell (top-left) and hide all others within the bounding box.
        const masterCell = newCells.find(cell => cell.r === minR && cell.c === minC);
        if (!masterCell) {
            toast({ variant: "destructive", title: "Merge Error", description: "Could not find master cell." });
            return;
        }

        masterCell.rowSpan = finalRowSpan;
        masterCell.colSpan = finalColSpan;
        masterCell.hidden = false;

        newCells.forEach(cell => {
            // Hide any cell that is not the master cell but falls within the new merged area.
            if (!(cell.r === minR && cell.c === minC) &&
                cell.r >= minR && cell.r <= maxR &&
                cell.c >= minC && cell.c <= maxC) {
                cell.hidden = true;
            }
        });
    
        setTableData(prev => ({ ...prev, cells: newCells }));
        setSelectedCells(new Set());
        toast({ title: "Cells Merged", description: "The selected cells have been merged." });
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
                    <Button onClick={handleMerge} disabled={selectedCells.size < 2}>Merge Selected</Button>
                </div>
                 <div className="w-full overflow-auto border rounded-lg">
                    <div 
                        className="grid"
                        style={{ gridTemplateColumns: `repeat(${tableData.cols}, minmax(120px, 1fr))` }}
                    >
                        {tableData.cells.map(cell => {
                            if (cell.hidden) return null;

                            const isSelected = selectedCells.has(`${cell.r}-${cell.c}`);
                            
                            return (
                                <div
                                    key={`${cell.r}-${cell.c}`}
                                    onClick={() => toggleSelect(cell.r, cell.c)}
                                    className={cn(
                                        'border p-1 h-14 flex items-center justify-center cursor-pointer',
                                        'transition-colors',
                                        isSelected ? 'ring-2 ring-blue-500 ring-inset' : 'hover:bg-muted/50'
                                    )}
                                    style={{
                                        gridRow: `span ${cell.rowSpan}`,
                                        gridColumn: `span ${cell.colSpan}`
                                    }}
                                >
                                    <span className="text-xs text-muted-foreground">{cell.r},{cell.c}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
