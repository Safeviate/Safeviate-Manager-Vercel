
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

        const selected = Array.from(selectedCells).map(key => {
            const [r, c] = key.split('-').map(Number);
            return { r, c };
        });

        const minR = Math.min(...selected.map(cell => cell.r));
        const maxR = Math.max(...selected.map(cell => cell.r));
        const minC = Math.min(...selected.map(cell => cell.c));
        const maxC = Math.max(...selected.map(cell => cell.c));

        const spanR = maxR - minR + 1;
        const spanC = maxC - minC + 1;

        if (selected.length !== spanR * spanC) {
            toast({
                variant: "destructive",
                title: "Invalid Selection",
                description: "You can only merge a solid rectangular block of cells.",
            });
            return;
        }

        setTableData(prev => {
            const newCells = prev.cells.map(cell => ({ ...cell }));
            
            // Find the top-left cell of the merge area and update its span
            const masterCellIndex = newCells.findIndex(cell => cell.r === minR && cell.c === minC);
            if (masterCellIndex !== -1) {
                newCells[masterCellIndex].colSpan = spanC;
                newCells[masterCellIndex].rowSpan = spanR;
                newCells[masterCellIndex].hidden = false;
            }

            // Hide all other cells in the merge area
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    if (r === minR && c === minC) continue; // Skip the master cell
                    const cellIndexToHide = newCells.findIndex(cell => cell.r === r && cell.c === c);
                    if (cellIndexToHide !== -1) {
                        newCells[cellIndexToHide].hidden = true;
                    }
                }
            }

            return { ...prev, cells: newCells };
        });

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
