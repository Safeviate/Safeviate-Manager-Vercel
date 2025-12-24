
'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Merge, Split, Text, GripVertical, PlusSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- Types ---
interface CellData {
    id: string;
    rowSpan: number;
    colSpan: number;
    fontSize: number; // in pixels
    isMerged: boolean;
    content: string;
}

// --- Components ---

const ResizableTable = ({
  grid,
  setGrid,
  selectedCells,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  colWidths,
  setColWidths
}: {
  grid: CellData[][];
  setGrid: (grid: CellData[][]) => void;
  selectedCells: { row: number, col: number }[];
  onCellMouseDown: (row: number, col: number) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  onCellMouseUp: () => void;
  colWidths: number[];
  setColWidths: (widths: number[]) => void;
}) => {
    const tableRef = useRef<HTMLTableElement>(null);
    const [resizingCol, setResizingCol] = useState<number | null>(null);

    const handleResizeMouseDown = (e: React.MouseEvent, colIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingCol(colIndex);
    };

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (resizingCol === null || !tableRef.current) return;
        
        const tableWidth = tableRef.current.offsetWidth;
        
        const newWidths = [...colWidths];
        
        // Calculate the change in mouse position
        const dx = e.movementX;
        
        // Calculate new widths in percentage
        const widthChangePercent = (dx / tableWidth) * 100;
        
        // Prevent making columns too small
        const minWidthPercent = 5;
        
        if (newWidths[resizingCol] + widthChangePercent < minWidthPercent || newWidths[resizingCol + 1] - widthChangePercent < minWidthPercent) {
            return;
        }

        newWidths[resizingCol] += widthChangePercent;
        newWidths[resizingCol + 1] -= widthChangePercent;
        
        setColWidths(newWidths);

    }, [resizingCol, colWidths, setColWidths]);

    const handleResizeMouseUp = useCallback(() => {
        setResizingCol(null);
    }, []);

    useEffect(() => {
        if (resizingCol !== null) {
            document.addEventListener('mousemove', handleResizeMouseMove);
            document.addEventListener('mouseup', handleResizeMouseUp);
        } else {
            document.removeEventListener('mousemove', handleResizeMouseMove);
            document.removeEventListener('mouseup', handleResizeMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleResizeMouseMove);
            document.removeEventListener('mouseup', handleResizeMouseUp);
        };
    }, [resizingCol, handleResizeMouseMove, handleResizeMouseUp]);


  if (grid.length === 0) return null;

  const rows = grid.length;
  const cols = grid[0].length;

  const handleContentChange = (row: number, col: number, content: string) => {
    const newGrid = grid.map(r => r.map(c => ({...c})));
    newGrid[row][col].content = content;
    setGrid(newGrid);
  };
  
  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some(cell => cell.row === row && cell.col === col);
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table
        ref={tableRef}
        className="w-full border-collapse"
        style={{ tableLayout: 'fixed' }}
        onMouseUp={onCellMouseUp}
        onMouseLeave={onCellMouseUp} // Stop selection if mouse leaves table
      >
        <colgroup>
            {colWidths.map((width, i) => (
                <col key={i} style={{ width: `${width}%` }} />
            ))}
        </colgroup>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => {
                const cell = grid[rowIndex][colIndex];
                if (cell.isMerged) return null; // Don't render merged cells

                return (
                  <td
                    key={colIndex}
                    rowSpan={cell.rowSpan}
                    colSpan={cell.colSpan}
                    onMouseDown={() => onCellMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
                    className={cn(
                        "border border-muted p-0 h-12 relative select-none",
                        isCellSelected(rowIndex, colIndex) && 'bg-primary/20 outline-2 outline-primary outline'
                    )}
                  >
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleContentChange(rowIndex, colIndex, e.currentTarget.textContent || '')}
                      style={{ fontSize: `${cell.fontSize}px` }}
                      className="w-full h-full p-2 focus:outline-none"
                    >
                      {cell.content}
                    </div>

                    {colIndex < cols - 1 && cell.rowSpan === 1 && (
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, colIndex)}
                        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/50"
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


const TableSelector = ({ onSelect }: { onSelect: (dims: { rows: number; cols: number }) => void }) => {
    const [hovered, setHovered] = useState({ rows: 0, cols: 0 });

    const gridSize = 10;

    return (
        <Card className="w-fit">
            <CardHeader className='pb-2'>
                <CardTitle>Table Dimensions</CardTitle>
                <CardDescription>Hover and click to select table size.</CardDescription>
            </CardHeader>
            <CardContent>
                <div 
                    className="grid gap-1 bg-muted/20 p-2" 
                    style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                    onMouseLeave={() => setHovered({ rows: 0, cols: 0 })}
                >
                    {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                        const row = Math.floor(index / gridSize) + 1;
                        const col = (index % gridSize) + 1;
                        const isHighlighted = row <= hovered.rows && col <= hovered.cols;
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "h-6 w-6 border border-border transition-colors cursor-pointer",
                                    isHighlighted ? 'bg-primary' : 'bg-background hover:bg-accent'
                                )}
                                onMouseEnter={() => setHovered({ rows: row, cols: col })}
                                onClick={() => onSelect(hovered)}
                            />
                        );
                    })}
                </div>
                <p className="mt-2 text-center font-medium text-sm">
                    {hovered.rows > 0 ? `${hovered.cols} x ${hovered.rows}` : 'Select Dimensions'}
                </p>
            </CardContent>
        </Card>
    );
}

// --- Main Page Component ---
export default function TableBuilderPage() {
    const [grid, setGrid] = useState<CellData[][]>([]);
    const [colWidths, setColWidths] = useState<number[]>([]);
    const [selectedCells, setSelectedCells] = useState<{ row: number, col: number }[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [fontSize, setFontSize] = useState(14);
    
    const createGrid = (rows: number, cols: number) => {
        const newGrid: CellData[][] = Array.from({ length: rows }, (_, rowIndex) => 
            Array.from({ length: cols }, (_, colIndex) => ({
                id: `${rowIndex}-${colIndex}`,
                rowSpan: 1,
                colSpan: 1,
                fontSize: 14,
                isMerged: false,
                content: ''
            }))
        );
        setGrid(newGrid);
        setColWidths(Array(cols).fill(100 / cols));
        setSelectedCells([]);
    };

    const handleSelectionStart = (row: number, col: number) => {
        setIsSelecting(true);
        setSelectedCells([{ row, col }]);
    };

    const handleSelectionEnter = (row: number, col: number) => {
        if (!isSelecting) return;
        
        const startCell = selectedCells[0];
        if (!startCell) return;

        const rowStart = Math.min(startCell.row, row);
        const rowEnd = Math.max(startCell.row, row);
        const colStart = Math.min(startCell.col, col);
        const colEnd = Math.max(startCell.col, col);

        const newSelectedCells: { row: number, col: number }[] = [];
        for (let i = rowStart; i <= rowEnd; i++) {
            for (let j = colStart; j <= colEnd; j++) {
                newSelectedCells.push({ row: i, col: j });
            }
        }
        setSelectedCells(newSelectedCells);
    };

    const handleSelectionEnd = () => {
        setIsSelecting(false);
    };
    
    const handleFontSizeChange = (newSize: number) => {
        setFontSize(newSize);
        if (selectedCells.length === 0) return;
        
        const newGrid = [...grid];
        selectedCells.forEach(({ row, col }) => {
            newGrid[row][col] = { ...newGrid[row][col], fontSize: newSize };
        });
        setGrid(newGrid);
    };
    
    const handleMergeCells = () => {
        if (selectedCells.length <= 1) return;

        const newGrid = grid.map(r => r.map(c => ({...c})));
        const { minRow, maxRow, minCol, maxCol } = selectedCells.reduce(
            (acc, cell) => ({
                minRow: Math.min(acc.minRow, cell.row),
                maxRow: Math.max(acc.maxRow, cell.row),
                minCol: Math.min(acc.minCol, cell.col),
                maxCol: Math.max(acc.maxCol, cell.col)
            }), { minRow: Infinity, maxRow: -1, minCol: Infinity, maxCol: -1 }
        );

        const newRowSpan = maxRow - minRow + 1;
        const newColSpan = maxCol - minCol + 1;

        // Apply span to the top-left cell
        newGrid[minRow][minCol].rowSpan = newRowSpan;
        newGrid[minRow][minCol].colSpan = newColSpan;
        newGrid[minRow][minCol].isMerged = false;


        // Mark other cells as merged
        for (let i = minRow; i <= maxRow; i++) {
            for (let j = minCol; j <= maxCol; j++) {
                if (i === minRow && j === minCol) continue;
                newGrid[i][j].isMerged = true;
                newGrid[i][j].rowSpan = 1;
                newGrid[i][j].colSpan = 1;
            }
        }

        setGrid(newGrid);
        setSelectedCells([]);
    };
    
    const handleUnmergeCells = () => {
        if (selectedCells.length === 0) return;
        const newGrid = grid.map(r => r.map(c => ({...c})));

        selectedCells.forEach(({ row, col }) => {
            const cell = newGrid[row][col];
            // Find the top-left cell of a potential merged block
            let parentRow = row;
            let parentCol = col;
            
            // This loop correctly finds the origin cell of a merged block
            if(cell.isMerged) {
                let found = false;
                for(let r=0; r <= row; r++) {
                    for(let c=0; c <= col; c++) {
                        if (r + newGrid[r][c].rowSpan > row && c + newGrid[r][c].colSpan > col) {
                            parentRow = r;
                            parentCol = c;
                            found = true;
                            break;
                        }
                    }
                    if(found) break;
                }
            }


            const parentCell = newGrid[parentRow][parentCol];

            // Unmerge all cells within that block
            for (let i = parentRow; i < parentRow + parentCell.rowSpan; i++) {
                for (let j = parentCol; j < parentCol + parentCell.colSpan; j++) {
                    newGrid[i][j].isMerged = false;
                    newGrid[i][j].rowSpan = 1;
                    newGrid[i][j].colSpan = 1;
                }
            }
        });

        setGrid(newGrid);
        setSelectedCells([]);
    };

    const handleAddRow = () => {
        if (grid.length === 0) return;
        const cols = grid[0].length;
        const newRow: CellData[] = Array.from({ length: cols }, (_, colIndex) => ({
            id: `${grid.length}-${colIndex}`,
            rowSpan: 1,
            colSpan: 1,
            fontSize: 14,
            isMerged: false,
            content: ''
        }));
        setGrid([...grid, newRow]);
    };

    const handleAddColumn = () => {
        if (grid.length === 0) return;
        const newGrid = grid.map((row, rowIndex) => [
            ...row,
            {
                id: `${rowIndex}-${row.length}`,
                rowSpan: 1,
                colSpan: 1,
                fontSize: 14,
                isMerged: false,
                content: ''
            }
        ]);
        setGrid(newGrid);

        const newColCount = newGrid[0].length;
        setColWidths(Array(newColCount).fill(100 / newColCount));
    };

    return (
        <TooltipProvider>
        <div className="space-y-6">
             <h1 className="text-3xl font-bold tracking-tight">Interactive Table Builder</h1>
             <div className="flex flex-col md:flex-row gap-8 items-start">
                <TableSelector onSelect={({rows, cols}) => createGrid(rows, cols)} />
                <div className="flex-1 w-full space-y-4">
                     <Card>
                        <CardHeader className="pb-4">
                            <CardTitle>Toolbar</CardTitle>
                        </CardHeader>
                        <CardContent className='flex flex-wrap items-center gap-4'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={handleMergeCells} disabled={selectedCells.length <= 1}>
                                        <Merge />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Merge Cells</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={handleUnmergeCells} disabled={selectedCells.length === 0}>
                                        <Split />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Unmerge Cells</p></TooltipContent>
                            </Tooltip>
                            <Separator orientation='vertical' className='h-8' />
                             <div className="flex items-center gap-2">
                                <Label htmlFor="font-size"><Text className="h-5 w-5" /></Label>
                                <Input 
                                    id="font-size" 
                                    type="number"
                                    value={fontSize}
                                    onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
                                    className="w-20"
                                />
                             </div>
                             <Separator orientation='vertical' className='h-8' />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={handleAddRow} disabled={grid.length === 0}>
                                        <PlusSquare className="transform rotate-90" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Add Row</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={handleAddColumn} disabled={grid.length === 0}>
                                        <PlusSquare />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Add Column</p></TooltipContent>
                            </Tooltip>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Table Preview</CardTitle>
                            <CardDescription>Click in cells to edit text. Click and drag to select multiple cells. Drag column borders to resize.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {grid.length > 0 ? (
                                <ResizableTable 
                                    grid={grid} 
                                    setGrid={setGrid}
                                    selectedCells={selectedCells}
                                    onCellMouseDown={handleSelectionStart}
                                    onCellMouseEnter={handleSelectionEnter}
                                    onCellMouseUp={handleSelectionEnd}
                                    colWidths={colWidths}
                                    setColWidths={setColWidths}
                                />
                            ) : (
                                <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                                    <p>Select table dimensions to see a preview.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
             </div>
        </div>
        </TooltipProvider>
    );
}

