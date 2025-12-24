
'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Merge, Split, Text, GripVertical, PlusSquare, Trash2, AlignLeft, AlignCenter, AlignRight, SplitSquareHorizontal, SplitSquareVertical, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Bold } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// --- Types ---
interface CellData {
    id: string;
    rowSpan: number;
    colSpan: number;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    isMerged: boolean;
    content: string;
    textAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
    nestedGrid?: CellData[][];
}

type CellPath = (string | number)[];

// --- Components ---

const EditableCell = ({
  initialContent,
  fontSize,
  fontWeight,
  onContentSave,
}: {
  initialContent: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  onContentSave: (newContent: string) => void;
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (cellRef.current && cellRef.current.textContent !== initialContent) {
        cellRef.current.textContent = initialContent;
    }
  }, [initialContent]);

  const handleBlur = () => {
    if (cellRef.current) {
        onContentSave(cellRef.current.textContent || '');
    }
  };
  
  return (
    <div
      ref={cellRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      style={{ fontSize: `${fontSize}px`, fontWeight: fontWeight }}
      className="w-full h-full p-2 focus:outline-none"
      dangerouslySetInnerHTML={{ __html: initialContent }}
    />
  );
};


const HorizontalRuler = ({ colWidths }: { colWidths: number[] }) => {
    return (
        <div className="sticky top-0 z-10 flex h-6 bg-muted/50 border-b border-r">
            {colWidths.map((width, index) => (
                <div
                    key={index}
                    style={{ width: `${width}px` }}
                    className="flex-shrink-0 border-l p-1 text-xs text-muted-foreground flex items-center justify-center"
                >
                    {width}px
                </div>
            ))}
        </div>
    );
};

const VerticalRuler = ({ rowCount, rowHeight }: { rowCount: number, rowHeight: number }) => {
    return (
        <div className="sticky left-0 z-10 w-10 bg-muted/50 border-r">
            {Array.from({ length: rowCount }).map((_, index) => (
                <div
                    key={index}
                    style={{ height: `${rowHeight}px` }}
                    className="flex items-center justify-center border-t"
                >
                    <span className="text-xs text-muted-foreground">{rowHeight}px</span>
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
  handleContentChange,
  pathPrefix = []
}: {
  grid: CellData[][];
  setGrid: (grid: CellData[][]) => void;
  selectedCells: CellPath[];
  onCellMouseDown: (path: CellPath) => void;
  onCellMouseEnter: (path: CellPath) => void;
  onCellMouseUp: () => void;
  colWidths: number[];
  setColWidths: (widths: number[]) => void;
  rowHeight: number;
  handleContentChange: (path: CellPath, content: string) => void;
  pathPrefix?: CellPath;
}) => {
    const tableRef = useRef<HTMLTableElement>(null);
    const isNested = pathPrefix.length > 0;

  if (grid.length === 0) return null;

  const rows = grid.length;
  const cols = grid[0].length;
  
  const isCellSelected = (currentPath: CellPath) => {
    return selectedCells.some(path => JSON.stringify(path) === JSON.stringify(currentPath));
  };

  const getVerticalAlignClass = (alignment: 'top' | 'middle' | 'bottom') => {
    switch (alignment) {
        case 'top': return 'align-top';
        case 'middle': return 'align-middle';
        case 'bottom': return 'align-bottom';
        default: return 'align-top';
    }
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
                    <col key={i} style={{ width: `${width}px` }} />
                ))}
            </colgroup>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => {
                const cell = grid[rowIndex][colIndex];
                const currentPath = [...pathPrefix, rowIndex, colIndex];
                if (cell.isMerged) return null; // Don't render merged cells

                return (
                  <td
                    key={colIndex}
                    rowSpan={cell.rowSpan}
                    colSpan={cell.colSpan}
                    onMouseDown={() => onCellMouseDown(currentPath)}
                    onMouseEnter={() => onCellMouseEnter(currentPath)}
                    style={{ textAlign: cell.textAlign, height: isNested ? 'auto' : `${rowHeight * cell.rowSpan}px` }}
                    className={cn(
                        "border border-muted p-0 relative select-none",
                        getVerticalAlignClass(cell.verticalAlign),
                        isCellSelected(currentPath) && 'bg-primary/20 outline-2 outline-primary outline'
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
                            selectedCells={selectedCells}
                            onCellMouseDown={onCellMouseDown}
                            onCellMouseEnter={onCellMouseEnter}
                            onCellMouseUp={onCellMouseUp}
                            colWidths={[]} // Nested tables don't control main widths
                            setColWidths={() => {}}
                            rowHeight={rowHeight}
                            handleContentChange={handleContentChange}
                            pathPrefix={[...currentPath, 'nestedGrid']}
                        />
                    ) : (
                        <EditableCell
                            initialContent={cell.content}
                            fontSize={cell.fontSize}
                            fontWeight={cell.fontWeight}
                            onContentSave={(newContent) => handleContentChange(currentPath, newContent)}
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
    const [selectedCells, setSelectedCells] = useState<CellPath[]>([]);
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
                fontWeight: 'normal',
                isMerged: false,
                content: '',
                textAlign: 'left',
                verticalAlign: 'top',
            }))
        );
        setGrid(newGrid);
        setColWidths(Array(cols).fill(150)); // Set a fixed initial width for each column
        setSelectedCells([]);
    };

    const handleContentChange = useCallback((path: CellPath, newContent: string) => {
        setGrid(currentGrid => {
            const newGrid = JSON.parse(JSON.stringify(currentGrid));
            
            // Function to recursively find and update the cell
            const updateCell = (grid: CellData[][], currentPath: CellPath): CellData[][] => {
                if (currentPath.length < 2) return grid;
    
                const [row, col] = currentPath as [number, number];
                
                if (!grid[row] || !grid[row][col]) return grid;

                if (currentPath.length === 2) {
                    if (grid[row][col].content !== newContent) {
                        grid[row][col].content = newContent;
                    }
                } else if (currentPath[2] === 'nestedGrid' && grid[row][col].nestedGrid) {
                    grid[row][col].nestedGrid = updateCell(grid[row][col].nestedGrid!, currentPath.slice(3));
                }
                return grid;
            };
    
            return updateCell(newGrid, path);
        });
    }, []);

    const handleSelectionStart = (path: CellPath) => {
        setIsSelecting(true);
        setSelectedCells([path]);
    };

    const handleSelectionEnter = (path: CellPath) => {
        if (!isSelecting) return;
        // Simple selection for now, doesn't support multi-cell selection across nested levels easily
        setSelectedCells(prev => [...prev.filter(p => JSON.stringify(p) !== JSON.stringify(path)), path]);
    };

    const handleSelectionEnd = () => {
        setIsSelecting(false);
    };
    
    const handleFontSizeChange = (newSize: number) => {
        setFontSize(newSize);
        if (selectedCells.length === 0) return;
        
        const newGrid = [...grid];
        selectedCells.forEach((path) => {
            // This needs to be recursive to handle nested cells
            let cell: any = newGrid;
             for (let i = 0; i < path.length; i += 2) {
                if(cell[path[i]] && cell[path[i]][path[i+1]]) {
                    if (i + 2 < path.length) {
                        cell = cell[path[i]][path[i+1]].nestedGrid;
                    } else {
                        cell[path[i]][path[i+1]].fontSize = newSize;
                    }
                }
             }
        });
        setGrid(newGrid);
    };
    
    const handleToggleBold = () => {
      if (selectedCells.length === 0) return;
      const newGrid = JSON.parse(JSON.stringify(grid));

      const applyBoldRecursively = (currentGrid: CellData[][], path: CellPath) => {
          let target = currentGrid;
          for (let i = 0; i < path.length - 2; i += 2) {
              if (target?.[path[i] as number]?.[path[i+1] as number]?.nestedGrid) {
                  target = target[path[i] as number][path[i+1] as number].nestedGrid!;
              } else {
                  return; // Path is invalid
              }
          }
          
          const cell = target[path[path.length - 2] as number]?.[path[path.length - 1] as number];
          if (cell) {
              cell.fontWeight = cell.fontWeight === 'bold' ? 'normal' : 'bold';
          }
      };

      selectedCells.forEach((path) => {
          applyBoldRecursively(newGrid, path);
      });
      setGrid(newGrid);
    };

    const handleTextAlignChange = (alignment: 'left' | 'center' | 'right') => {
        if (selectedCells.length === 0) return;
        const newGrid = JSON.parse(JSON.stringify(grid));
        
        const applyAlignmentRecursively = (currentGrid: CellData[][], path: CellPath) => {
            let target = currentGrid;
             for(let i=0; i<path.length - 2; i+=2) {
                if (target?.[path[i] as number]?.[path[i+1] as number]?.nestedGrid) {
                    target = target[path[i] as number][path[i+1] as number].nestedGrid!;
                } else {
                    return; // Path is invalid
                }
            }
            
            const cell = target[path[path.length - 2] as number]?.[path[path.length - 1] as number];
            if (cell) {
                cell.textAlign = alignment;
                if (cell.nestedGrid) {
                    cell.nestedGrid.forEach(row => row.forEach(nestedCell => nestedCell.textAlign = alignment));
                }
            }
        }

        selectedCells.forEach((path) => {
            applyAlignmentRecursively(newGrid, path);
        });
        setGrid(newGrid);
    };

    const handleVerticalAlignChange = (alignment: 'top' | 'middle' | 'bottom') => {
        if (selectedCells.length === 0) return;
        const newGrid = JSON.parse(JSON.stringify(grid));
        
        const applyAlignmentRecursively = (currentGrid: CellData[][], path: CellPath) => {
             let target = currentGrid;
             for(let i=0; i<path.length - 2; i+=2) {
                if (target?.[path[i] as number]?.[path[i+1] as number]?.nestedGrid) {
                    target = target[path[i] as number][path[i+1] as number].nestedGrid!;
                } else {
                    return; // Path is invalid
                }
            }
            
            const cell = target[path[path.length - 2] as number]?.[path[path.length - 1] as number];
            if (cell) {
                cell.verticalAlign = alignment;
                if (cell.nestedGrid) {
                    cell.nestedGrid.forEach(row => row.forEach(nestedCell => nestedCell.verticalAlign = alignment));
                }
            }
        }

        selectedCells.forEach((path) => {
            applyAlignmentRecursively(newGrid, path);
        });
        setGrid(newGrid);
    };

    const handleMergeCells = () => {
        if (selectedCells.length <= 1) return;

        // Basic merge, doesn't support merging across nested boundaries
        const topLevelCells = selectedCells.filter(p => p.length === 2);
        if(topLevelCells.length !== selectedCells.length) {
            alert("Cannot merge cells across different nesting levels.");
            return;
        }

        const newGrid = grid.map(r => r.map(c => ({...c})));
        const { minRow, maxRow, minCol, maxCol } = topLevelCells.reduce(
            (acc, cellPath) => ({
                minRow: Math.min(acc.minRow, cellPath[0] as number),
                maxRow: Math.max(acc.maxRow, cellPath[0] as number),
                minCol: Math.min(acc.minCol, cellPath[1] as number),
                maxCol: Math.max(acc.maxCol, cellPath[1] as number)
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
      const topLevelCells = selectedCells.filter(p => p.length === 2);

      const newGrid = grid.map(r => r.map(c => ({...c})));
    
      const processedParents = new Set<string>();
    
      topLevelCells.forEach((path) => {
        const [row, col] = path as [number, number];
        let parentRow = row;
        let parentCol = col;
        let parentKey = `${parentRow}-${parentCol}`;
    
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
    
        if (processedParents.has(parentKey)) {
          return;
        }
        processedParents.add(parentKey);
    
        const parentCell = newGrid[parentRow][parentCol];
        const { rowSpan, colSpan } = parentCell;
    
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
        const newGrid = JSON.parse(JSON.stringify(grid));
        const path = selectedCells[0];
        
        let parentGrid = newGrid;
        let cellToUpdate: CellData | null = null;
        
        for (let i = 0; i < path.length; i += 2) {
            if (i + 2 < path.length) {
                parentGrid = parentGrid[path[i] as number][path[i+1] as number].nestedGrid!;
            } else {
                cellToUpdate = parentGrid[path[i] as number][path[i+1] as number];
            }
        }

        if (!cellToUpdate || cellToUpdate.isMerged || cellToUpdate.nestedGrid) return;
        
        let newNestedGrid: CellData[][];
        const baseCellProps = { ...cellToUpdate, colSpan: 1, rowSpan: 1 };
        
        if (direction === 'vertical') {
            newNestedGrid = [[
                {...baseCellProps, id: 'nested-0-0', content: cellToUpdate.content},
                {...baseCellProps, id: 'nested-0-1', content: ''}
            ]];
        } else { // horizontal
            newNestedGrid = [
                [{...baseCellProps, id: 'nested-0-0', content: cellToUpdate.content}],
                [{...baseCellProps, id: 'nested-1-0', content: ''}]
            ];
        }

        cellToUpdate.nestedGrid = newNestedGrid;
        cellToUpdate.content = ''; 
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
            fontWeight: 'normal',
            isMerged: false,
            content: '',
            textAlign: 'left',
            verticalAlign: 'top',
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
                fontWeight: 'normal',
                isMerged: false,
                content: '',
                textAlign: 'left',
                verticalAlign: 'top',
            }
        ]);
        setGrid(newGrid);

        const newColCount = newGrid[0].length;
        setColWidths(Array(newColCount).fill(150));
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
            setColWidths(Array(newColCount).fill(150));
            setSelectedCells([]);
        }
    };

    const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);

    return (
        <TooltipProvider>
        <div className="space-y-6">
             <h1 className="text-3xl font-bold tracking-tight">Interactive Table Builder</h1>
             <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <TableSelector onSelect={({rows, cols}) => createGrid(rows, cols)} />
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle>Toolbar</CardTitle>
                        </CardHeader>
                        <CardContent className='flex flex-wrap items-center gap-2'>
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
                            <div className="flex items-center gap-1">
                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={handleToggleBold}><Bold /></Button></TooltipTrigger><TooltipContent><p>Bold</p></TooltipContent></Tooltip>
                            </div>
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
                            <div className="flex items-center gap-1">
                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleVerticalAlignChange('top')}><AlignStartVertical /></Button></TooltipTrigger><TooltipContent><p>Align Top</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleVerticalAlignChange('middle')}><AlignCenterVertical /></Button></TooltipTrigger><TooltipContent><p>Align Middle</p></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleVerticalAlignChange('bottom')}><AlignEndVertical /></Button></TooltipTrigger><TooltipContent><p>Align Bottom</p></TooltipContent></Tooltip>
                            </div>
                        </CardContent>
                        <CardContent className='flex flex-wrap items-center gap-2'>
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
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Table Preview</CardTitle>
                        <CardDescription>Click in cells to edit text. Click and drag to select multiple cells.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                            <div className="relative p-4">
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
                                        rowHeight={rowHeight}
                                        handleContentChange={handleContentChange}
                                    />
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                                        <p>Select table dimensions to see a preview.</p>
                                    </div>
                                )}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>
             </div>
        </div>
        </TooltipProvider>
    );
}
