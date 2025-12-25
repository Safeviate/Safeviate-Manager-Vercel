
'use client';

import { useState, useMemo, MouseEvent, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { addDocumentNonBlocking, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useDebounce } from '@/hooks/use-debounce';

type Cell = {
  r: number;
  c: number;
  content: string;
  rowSpan: number;
  colSpan: number;
  hidden: boolean;
};

type TableData = {
  rows: number;
  cols: number;
  cells: Cell[];
  colWidths: number[];
  rowHeights: number[];
};

const createInitialTable = (rows: number, cols: number): TableData => {
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ r, c, rowSpan: 1, colSpan: 1, hidden: false, content: '' });
    }
  }
  return { 
    rows, 
    cols, 
    cells,
    colWidths: Array(cols).fill(120), // Default width
    rowHeights: Array(rows).fill(48), // Default height
  };
};

export default function TableBuilderPage() {
  const { toast } = useToast();
  const [tableData, setTableData] = useState<TableData>(() => createInitialTable(5, 5));
  const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(true);

  const debouncedTableData = useDebounce(tableData, 300);

  const resizeHandleRef = useRef<{ type: 'col' | 'row', index: number, initialPos: number, initialSize: number } | null>(null);

  const { rows, cols, cells, colWidths, rowHeights } = tableData;

  const getCell = (r: number, c: number) => cells.find(cell => cell.r === r && cell.c === c);

  const updateGridSize = (newRows: number, newCols: number) => {
    if (newRows > 0 && newRows <= 50 && newCols > 0 && newCols <= 50) {
      setTableData(createInitialTable(newRows, newCols));
      setSelectedCells({});
    }
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
    
    // Verify that the selection is a perfect rectangle
    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            const cellInBox = newCells.find(cell => r >= cell.r && r < cell.r + cell.rowSpan && c >= cell.c && c < cell.c + cell.colSpan && !cell.hidden);
            if (!cellInBox || !selectedCells[`${cellInBox.r}-${cellInBox.c}`]) {
                toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Selected cells do not form a solid rectangle.' });
                return;
            }
        }
    }

    const topLeftCell = newCells.find(cell => cell.r === minR && cell.c === minC);
    if (!topLeftCell) {
        toast({ variant: 'destructive', title: 'Merge Error', description: 'Could not find a top-left cell for the merge.' });
        return;
    }
    
    // Perform the merge
    newCells.forEach(cell => {
      if (cell.r >= minR && cell.r <= maxR && cell.c >= minC && cell.c <= maxC) {
        if (cell.r === minR && cell.c === minC) {
          cell.rowSpan = newRowSpan;
          cell.colSpan = newColSpan;
          cell.hidden = false;
        } else {
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
        const { r: startR, c: startC, rowSpan, colSpan } = cellToUnmerge;

        for (let i = startR; i < startR + rowSpan; i++) {
          for (let j = startC; j < startC + colSpan; j++) {
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

  const handleMouseDown = (e: React.MouseEvent, type: 'col' | 'row', index: number) => {
    e.preventDefault();
    if (!isEditing) return;
    resizeHandleRef.current = {
      type,
      index,
      initialPos: type === 'col' ? e.clientX : e.clientY,
      initialSize: type === 'col' ? colWidths[index] : rowHeights[index],
    };
    document.body.style.cursor = type === 'col' ? 'col-resize' : 'row-resize';
  };

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!resizeHandleRef.current) return;

    const { type, index, initialPos, initialSize } = resizeHandleRef.current;
    const delta = type === 'col' ? e.clientX - initialPos : e.clientY - initialPos;
    const newSize = Math.max(initialSize + delta, 20); // Minimum size

    if (type === 'col') {
      const newColWidths = [...colWidths];
      newColWidths[index] = newSize;
      setTableData(prev => ({ ...prev, colWidths: newColWidths }));
    } else {
      const newRowHeights = [...rowHeights];
      newRowHeights[index] = newSize;
      setTableData(prev => ({ ...prev, rowHeights: newRowHeights }));
    }
  }, [colWidths, rowHeights]);

  const handleMouseUp = useCallback(() => {
    resizeHandleRef.current = null;
    document.body.style.cursor = 'default';
  }, []);

  const handleCellContentChange = (r: number, c: number, content: string) => {
    setTableData(prev => {
        const newCells = prev.cells.map(cell => {
            if (cell.r === r && cell.c === c) {
                return { ...cell, content };
            }
            return cell;
        });
        return { ...prev, cells: newCells };
    });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Table Builder</CardTitle>
          <CardDescription>
            Create and manipulate table structures. Click to select, drag handles to resize, and type to edit content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
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
                <Button onClick={handleMerge} disabled={Object.keys(selectedCells).length < 2 || !isEditing}>Merge Selected</Button>
                <Button onClick={handleUnmerge} disabled={Object.keys(selectedCells).length === 0 || !isEditing} variant="outline">Unmerge</Button>
            </div>
        </CardContent>
      </Card>
      
      <div className="overflow-auto rounded-lg border">
        <div
          className="grid gap-0 relative"
          style={{
            gridTemplateColumns: colWidths.map(w => `${w}px`).join(' '),
            gridTemplateRows: rowHeights.map(h => `${h}px`).join(' '),
          }}
        >
          {cells.map((cell) => {
            const key = `${cell.r}-${cell.c}`;
            const isSelected = selectedCells[key];

            if (cell.hidden) return null;

            return (
              <div
                key={key}
                onClick={isEditing ? () => handleCellClick(cell.r, cell.c) : undefined}
                className={cn(
                  'flex items-center justify-center border text-sm text-muted-foreground transition-colors p-0.5',
                  isEditing && 'cursor-pointer hover:bg-accent/50',
                  isSelected && 'ring-2 ring-primary ring-inset bg-blue-100'
                )}
                style={{
                  gridRowStart: cell.r + 1,
                  gridRowEnd: cell.r + 1 + cell.rowSpan,
                  gridColumnStart: cell.c + 1,
                  gridColumnEnd: cell.c + 1 + cell.colSpan,
                }}
              >
                <Input
                    value={cell.content}
                    onChange={(e) => handleCellContentChange(cell.r, cell.c, e.target.value)}
                    disabled={!isEditing}
                    className="w-full h-full bg-transparent border-none text-center focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder={isEditing ? '...' : ''}
                />
              </div>
            );
          })}
          {isEditing && Array.from({ length: cols }).map((_, index) => (
             <div 
                key={`col-handle-${index}`}
                className="absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50"
                style={{ left: `${colWidths.slice(0, index + 1).reduce((a, b) => a + b, 0) - 3}px`}}
                onMouseDown={(e) => handleMouseDown(e, 'col', index)}
            />
          ))}
          {isEditing && Array.from({ length: rows }).map((_, index) => (
             <div 
                key={`row-handle-${index}`}
                className="absolute left-0 right-0 h-1.5 cursor-row-resize hover:bg-primary/50"
                style={{ top: `${rowHeights.slice(0, index + 1).reduce((a, b) => a + b, 0) - 3}px`}}
                onMouseDown={(e) => handleMouseDown(e, 'row', index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

    