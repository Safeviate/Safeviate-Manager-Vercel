
'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Merge, Split, Text, GripVertical, PlusSquare, Trash2, AlignLeft, AlignCenter, AlignRight, SplitSquareHorizontal, SplitSquareVertical } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// --- Types ---
interface CellData {
    id: string;
    rowSpan: number;
    colSpan: number;
    fontSize: number;
    isMerged: boolean;
    content: string;
    textAlign: 'left' | 'center' | 'right';
    nestedGrid?: CellData[][];
}

// --- Components ---

const HorizontalRuler = ({ colWidths }: { colWidths: number[] }) => {
    return (
        <div className="sticky top-0 z-10 flex h-6 bg-muted/50 border-b border-r">
            {colWidths.map((width, index) => (
                <div
                    key={index}
                    style={{ width: `${width}%` }}
                    className="flex-shrink-0 border-l p-1 text-xs text-muted-foreground"
                >
                    {Math.round(width)}%
                </div>
            ))}
        </div>
    );
};

const VerticalRuler = ({ rowCount, rowHeight }: { rowCount: number, rowHeight: number }) => {
    return (
        <div className="sticky left-0 z-10 w-6 bg-muted/50 border-r">
            {Array.from({ length: rowCount }).map((_, index) => (
                <div
                    key={index}
                    style={{ height: `${rowHeight}px` }}
                    className="flex items-center justify-center border-t"
                >
                    <span className="text-xs text-muted-foreground -rotate-90">{rowHeight}px</span>
                </div>
            ))}
        </div>
    );
};

const ResizableTable = ({
  grid,
  setGrid,
  selectedCells,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  colWidths,
  setColWidths,
  rowHeight,
  isNested = false,
}: {
  grid: CellData[][];
  setGrid: (grid: CellData[][]) => void;
  selectedCells: { row: number, col: number }[];
  onCellMouseDown: (row: number, col: number, isNested?: boolean) => void;
  onCellMouseEnter: (row: number, col: number, isNested?: boolean) => void;
  onCellMouseUp: () => void;
  colWidths: number[];
  setColWidths: (widths: number[]) => void;
  rowHeight: number;
  isNested?: boolean;
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
        const dx = e.movementX;
        const widthChangePercent = (dx / tableWidth) * 100;
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

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>, row: number, col: number) => {
    const newGrid = grid.map(r => r.map(c => ({...c})));
    newGrid[row][col].content = e.currentTarget.textContent || '';
    setGrid(newGrid);
  };
  
  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some(cell => cell.row === row && cell.col === col);
  };

  return (
      <table
        ref={tableRef}
        className={cn("w-full h-full border-collapse", isNested && "bg-background/50")}
        style={{ tableLayout: 'fixed' }}
        onMouseUp={onCellMouseUp}
        onMouseLeave={onCellMouseUp} // Stop selection if mouse leaves table
      >
        {!isNested && (
            <colgroup>
                {colWidths.map((width, i) => (
                    <col key={i} style={{ width: `${width}%` }} />
                ))}
            </colgroup>
        )}
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
                    onMouseDown={() => onCellMouseDown(rowIndex, colIndex, isNested)}
                    onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex, isNested)}
                    style={{ textAlign: cell.textAlign, height: isNested ? 'auto' : `${rowHeight * cell.rowSpan}px` }}
                    className={cn(
                        "border border-muted p-0 relative select-none",
                        isCellSelected(rowIndex, colIndex) && 'bg-primary/20 outline-2 outline-primary outline'
                    )}
                  >
                    {cell.nestedGrid ? (
                        <ResizableTable
                            grid={cell.nestedGrid}
                            setGrid={(newNestedGrid) => {
                                const newGrid = [...grid];
                                newGrid[rowIndex][colIndex].nestedGrid = newNestedGrid;
                                setGrid(newGrid);
                            }}
                            selectedCells={[]}
                            onCellMouseDown={() => {}}
                            onCellMouseEnter={() => {}}
                            onCellMouseUp={() => {}}
                            colWidths={[]} // Not resizable for now
                            setColWidths={() => {}}
                            rowHeight={rowHeight}
                            isNested={true}
                        />
                    ) : (
                        <div
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => handleContentChange(e, rowIndex, colIndex)}
                        style={{ fontSize: `${cell.fontSize}px` }}
                        className="w-full h-full p-2 focus:outline-none"
                        >
                        {cell.content}
                        </div>
                    )}
                    

                    {!isNested && colIndex < cols - 1 && (
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
    const rowHeight = 48; // px
    
    const createGrid = (rows: number, cols: number) => {
        const newGrid: CellData[][] = Array.from({ length: rows }, (_, rowIndex) => 
            Array.from({ length: cols }, (_, colIndex) => ({
                id: `${rowIndex}-${colIndex}`,
                rowSpan: 1,
                colSpan: 1,
                fontSize: 14,
                isMerged: false,
                content: '',
                textAlign: 'left'
            }))
        );
        setGrid(newGrid);
        setColWidths(Array(cols).fill(100 / cols));
        setSelectedCells([]);
    };

    const handleSelectionStart = (row: number, col: number, isNested = false) => {
        if (isNested) return;
        setIsSelecting(true);
        setSelectedCells([{ row, col }]);
    };

    const handleSelectionEnter = (row: number, col: number, isNested = false) => {
        if (!isSelecting || isNested) return;
        
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
    
    const handleTextAlignChange = (alignment: 'left' | 'center' | 'right') => {
        if (selectedCells.length === 0) return;
        const newGrid = [...grid];
        selectedCells.forEach(({ row, col }) => {
            newGrid[row][col] = { ...newGrid[row][col], textAlign: alignment };
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
    
      const processedParents = new Set<string>();
    
      selectedCells.forEach(({ row, col }) => {
        let parentRow = row;
        let parentCol = col;
        let parentKey = `${parentRow}-${parentCol}`;
    
        // If the current cell is part of a merged block, find its top-left parent
        if (newGrid[row][col].isMerged) {
          let found = false;
          for (let r = 0; r <= row; r++) {
            for (let c = 0; c <= col; c++) {
              if (!newGrid[r][c].isMerged && r + newGrid[r][c].rowSpan > row && c + newGrid[r][c].colSpan > col) {
                parentRow = r;
                parentCol = c;
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
        
        parentKey = `${parentRow}-${parentCol}`;
    
        // Only process this parent block once
        if (processedParents.has(parentKey)) {
          return;
        }
        processedParents.add(parentKey);
    
        const parentCell = newGrid[parentRow][parentCol];
        const { rowSpan, colSpan } = parentCell;
    
        // Revert all cells within the merged block to their original state
        for (let i = parentRow; i < parentRow + rowSpan; i++) {
          for (let j = parentCol; j < parentCol + colSpan; j++) {
            newGrid[i][j].isMerged = false;
            newGrid[i][j].rowSpan = 1;
            newGrid[i][j].colSpan = 1;
          }
        }
      });
    
      setGrid(newGrid);
      setSelectedCells([]);
    };

    const handleSplitCell = (direction: 'vertical' | 'horizontal') => {
        if (selectedCells.length !== 1) return;
        const { row, col } = selectedCells[0];
        const newGrid = grid.map(r => r.map(c => ({...c})));
        const cellToSplit = newGrid[row][col];
        
        // Cannot split a merged cell or a cell that already contains a nested grid
        if (cellToSplit.isMerged || cellToSplit.nestedGrid) return;
        
        let newNestedGrid: CellData[][];
        if (direction === 'vertical') {
            newNestedGrid = [[
                {...cellToSplit, id: 'nested-0-0', colSpan: 1, rowSpan: 1, content: cellToSplit.content},
                {...cellToSplit, id: 'nested-0-1', colSpan: 1, rowSpan: 1, content: ''}
            ]];
        } else { // horizontal
            newNestedGrid = [
                [{...cellToSplit, id: 'nested-0-0', colSpan: 1, rowSpan: 1, content: cellToSplit.content}],
                [{...cellToSplit, id: 'nested-1-0', colSpan: 1, rowSpan: 1, content: ''}]
            ];
        }

        cellToSplit.nestedGrid = newNestedGrid;
        cellToSplit.content = ''; // Content moves into the nested grid
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
            content: '',
            textAlign: 'left',
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
                content: '',
                textAlign: 'left',
            }
        ]);
        setGrid(newGrid);

        const newColCount = newGrid[0].length;
        setColWidths(Array(newColCount).fill(100 / newColCount));
    };

    const handleDeleteRow = () => {
        if (grid.length > 1) {
            setGrid(grid.slice(0, -1));
            setSelectedCells([]);
        }
    };
    
    const handleDeleteColumn = () => {
        if (grid.length > 0 && grid[0].length > 1) {
            const newGrid = grid.map(row => row.slice(0, -1));
            setGrid(newGrid);

            const newColCount = newGrid[0].length;
            setColWidths(Array(newColCount).fill(100 / newColCount));
            setSelectedCells([]);
        }
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
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => handleSplitCell('vertical')} disabled={selectedCells.length !== 1}>
                                        <SplitSquareVertical />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Split Cell Vertically</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => handleSplitCell('horizontal')} disabled={selectedCells.length !== 1}>
                                        <SplitSquareHorizontal />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Split Cell Horizontally</p></TooltipContent>
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
                             <div className="flex items-center gap-1">
                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleTextAlignChange('left')}><AlignLeft /></Button></TooltipTrigger><TooltipContent><p>Align Left</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleTextAlignChange('center')}><AlignCenter /></Button></TooltipTrigger><TooltipContent><p>Align Center</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleTextAlignChange('right')}><AlignRight /></Button></TooltipTrigger><TooltipContent><p>Align Right</p></TooltipContent></Tooltip>
                             </div>
                             <Separator orientation='vertical' className='h-8' />
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" onClick={handleAddRow} disabled={grid.length === 0}>
                                        <PlusSquare className="transform rotate-90 mr-2"/>
                                        Add Row
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Add Row</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" onClick={handleAddColumn} disabled={grid.length === 0}>
                                        <PlusSquare className='mr-2' />
                                        Add Column
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Add Column</p></TooltipContent>
                            </Tooltip>
                            <Separator orientation='vertical' className='h-8' />
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="destructive" onClick={handleDeleteRow} disabled={grid.length <= 1}>
                                        <Trash2 className="transform rotate-90 mr-2"/>
                                        Delete Row
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Delete Last Row</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="destructive" onClick={handleDeleteColumn} disabled={grid.length === 0 || grid[0].length <= 1}>
                                        <Trash2 className='mr-2' />
                                        Delete Column
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Delete Last Column</p></TooltipContent>
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
                                <div className="relative overflow-auto rounded-lg border">
                                    <div className="grid" style={{ gridTemplateColumns: 'auto 1fr', gridTemplateRows: 'auto 1fr'}}>
                                        <div className="sticky top-0 left-0 z-20 bg-muted/50 w-6 h-6"/>
                                        <HorizontalRuler colWidths={colWidths} />
                                        <VerticalRuler rowCount={grid.length} rowHeight={rowHeight} />
                                        <ResizableTable 
                                            grid={grid} 
                                            setGrid={setGrid}
                                            selectedCells={selectedCells}
                                            onCellMouseDown={handleSelectionStart}
                                            onCellMouseEnter={handleSelectionEnter}
                                            onCellMouseUp={handleSelectionEnd}
                                            colWidths={colWidths}
                                            setColWidths={setColWidths}
                                            rowHeight={rowHeight}
                                        />
                                    </div>
                                </div>
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
