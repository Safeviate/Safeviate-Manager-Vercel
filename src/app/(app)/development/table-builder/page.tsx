
'use client';

import { useState, useMemo, MouseEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

type Cell = {
  r: number;
  c: number;
  rowSpan: number;
  colSpan: number;
  hidden: boolean;
};

type TableData = {
  rows: number;
  cols: number;
  cells: Cell[];
};

const createInitialTable = (rows: number, cols: number): TableData => {
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ r, c, rowSpan: 1, colSpan: 1, hidden: false });
    }
  }
  return { rows, cols, cells };
};

export default function TableBuilderPage() {
  const { toast } = useToast();
  const [tableData, setTableData] = useState<TableData>(() => createInitialTable(5, 5));
  const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(true);

  const { rows, cols, cells } = tableData;

  const getCell = (r: number, c: number) => cells.find(cell => cell.r === r && cell.c === c);

  const updateGridSize = (newRows: number, newCols: number) => {
    setTableData(createInitialTable(newRows, newCols));
    setSelectedCells({});
  };
  
  const handleCellClick = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const cell = getCell(r, c);
    if (!cell || cell.hidden) return;
  
    setSelectedCells(prev => {
      const newSelected = { ...prev };
      if (newSelected[key]) {
        delete newSelected[key];
      } else {
        newSelected[key] = true;
      }
      return newSelected;
    });
  };

  const handleMerge = () => {
    const selectionKeys = Object.keys(selectedCells);
    if (selectionKeys.length < 2) {
      toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Please select at least two cells to merge.' });
      return;
    }

    const newCells = JSON.parse(JSON.stringify(cells)) as Cell[];

    // 1. Find the Bounding Box of the selection
    let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;
    selectionKeys.forEach(key => {
        const [r, c] = key.split('-').map(Number);
        const cell = newCells.find(cell => cell.r === r && cell.c === c);
        if (cell) {
            minR = Math.min(minR, r);
            minC = Math.min(minC, c);
            maxR = Math.max(maxR, r + cell.rowSpan - 1);
            maxC = Math.max(maxC, c + cell.colSpan - 1);
        }
    });

    const newRowSpan = maxR - minR + 1;
    const newColSpan = maxC - minC + 1;

    // 2. Verify the selection is a solid rectangle
    let totalSelectedArea = 0;
    for (const key of selectionKeys) {
        const [r, c] = key.split('-').map(Number);
        const cell = newCells.find(cell => cell.r === r && cell.c === c);
        if (cell) {
            totalSelectedArea += cell.rowSpan * cell.colSpan;
        }
    }

    const boundingBoxArea = newRowSpan * newColSpan;
    if (totalSelectedArea !== boundingBoxArea) {
        toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Selected cells do not form a solid rectangle.' });
        return;
    }

    // 3. Perform the merge
    const topLeftCell = newCells.find(cell => cell.r === minR && cell.c === minC);
    if (!topLeftCell) {
        toast({ variant: 'destructive', title: 'Merge Error', description: 'Could not find a top-left cell for the merge.' });
        return;
    }
    
    // Hide all cells within the bounding box and update the top-left cell
    newCells.forEach(cell => {
      if (cell.r >= minR && cell.r <= maxR && cell.c >= minC && cell.c <= maxC) {
        if (cell.r === minR && cell.c === minC) {
          // This is the top-left cell, update its spans
          cell.rowSpan = newRowSpan;
          cell.colSpan = newColSpan;
          cell.hidden = false;
        } else {
          // This cell is being absorbed, hide it
          cell.hidden = true;
        }
      }
    });

    setTableData({ ...tableData, cells: newCells });
    setSelectedCells({});
    toast({ title: 'Cells Merged', description: 'The selected cells have been merged successfully.' });
  };
  
  const handleUnmerge = () => {
    const selectionKeys = Object.keys(selectedCells);
    if (selectionKeys.length === 0) {
      toast({ variant: 'destructive', title: 'No Selection', description: 'Please select a merged cell to unmerge.' });
      return;
    }

    const newCells = JSON.parse(JSON.stringify(cells)) as Cell[];
    let didUnmerge = false;

    selectionKeys.forEach(key => {
      const [r, c] = key.split('-').map(Number);
      const cellToUnmerge = newCells.find(cell => cell.r === r && cell.c === c);

      if (cellToUnmerge && (cellToUnmerge.rowSpan > 1 || cellToUnmerge.colSpan > 1)) {
        didUnmerge = true;
        const { r, c, rowSpan, colSpan } = cellToUnmerge;

        // Reset the main merged cell
        cellToUnmerge.rowSpan = 1;
        cellToUnmerge.colSpan = 1;

        // Unhide all the cells that were part of the merge
        for (let i = r; i < r + rowSpan; i++) {
          for (let j = c; j < c + colSpan; j++) {
            if (i === r && j === c) continue;
            const absorbedCell = newCells.find(cell => cell.r === i && cell.c === j);
            if (absorbedCell) {
              absorbedCell.hidden = false;
              absorbedCell.rowSpan = 1;
              absorbedCell.colSpan = 1;
            }
          }
        }
      }
    });
    
    if (didUnmerge) {
        setTableData({ ...tableData, cells: newCells });
        toast({ title: 'Unmerged Successfully' });
    } else {
        toast({ variant: 'destructive', title: 'Not a merged cell', description: 'Please select a merged cell to unmerge.' });
    }
    
    setSelectedCells({});
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Table Builder</CardTitle>
          <CardDescription>
            Create and manipulate table structures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Label htmlFor="rows">Rows</Label>
                    <Input id="rows" type="number" value={rows} onChange={(e) => updateGridSize(Number(e.target.value), cols)} className="w-20" />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="cols">Columns</Label>
                    <Input id="cols" type="number" value={cols} onChange={(e) => updateGridSize(rows, Number(e.target.value))} className="w-20" />
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="edit-mode" checked={isEditing} onCheckedChange={setIsEditing} />
                    <Label htmlFor="edit-mode">Edit Mode</Label>
                </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleMerge} disabled={Object.keys(selectedCells).length < 2}>Merge Selected</Button>
                <Button onClick={handleUnmerge} disabled={Object.keys(selectedCells).length === 0} variant="outline">Unmerge</Button>
            </div>
        </CardContent>
      </Card>
      
      <div className="overflow-auto rounded-lg border">
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(80px, 1fr))`,
          }}
        >
          {cells.map((cell, index) => {
            const key = `${cell.r}-${cell.c}`;
            const isSelected = selectedCells[key];

            if (cell.hidden) return null;

            return (
              <div
                key={key}
                onClick={isEditing ? () => handleCellClick(cell.r, cell.c) : undefined}
                className={cn(
                  'flex items-center justify-center border text-sm text-muted-foreground transition-colors',
                  isEditing && 'cursor-pointer hover:bg-accent/50',
                  isSelected && 'ring-2 ring-primary ring-inset bg-blue-100'
                )}
                style={{
                  gridRow: `${cell.r + 1} / span ${cell.rowSpan}`,
                  gridColumn: `${cell.c + 1} / span ${cell.colSpan}`,
                  minHeight: `${cell.rowSpan * 3}rem`,
                }}
              >
                ({cell.r}, {cell.c})
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
