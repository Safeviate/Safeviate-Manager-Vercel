
'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Merge, Split, Text, PlusSquare, Trash2, AlignLeft, AlignCenter, AlignRight, SplitSquareHorizontal, SplitSquareVertical, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Bold, Save, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


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

interface FirestoreTableTemplate {
    id: string;
    name: string;
    grid: { [key: string]: CellData[] }; // Changed to map for Firestore compatibility
    colWidths: number[];
    rowHeights: number[];
}

interface TableTemplate extends Omit<FirestoreTableTemplate, 'grid'> {
    grid: CellData[][];
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
      className="w-full h-full p-2 focus:outline-none break-words whitespace-normal"
      dangerouslySetInnerHTML={{ __html: initialContent }}
    />
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
  rowHeights,
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
  rowHeights: number[];
  handleContentChange: (path: CellPath, content: string) => void;
  pathPrefix?: CellPath;
}) => {
    const isNested = pathPrefix.length > 0;
    
  if (grid.length === 0) return null;

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  const isCellSelected = (currentPath: CellPath) => {
    return selectedCells.some(path => JSON.stringify(path) === JSON.stringify(currentPath));
  };

  const getVerticalAlignClass = (alignment: 'top' | 'middle' | 'bottom') => {
    switch (alignment) {
        case 'top': return 'justify-start';
        case 'middle': return 'justify-center';
        case 'bottom': return 'justify-end';
        default: return 'justify-start';
    }
  };

  return (
      <table
        className={cn("w-full border-collapse table-fixed", isNested && "bg-background/50 h-full")}
        onMouseUp={onCellMouseUp}
        onMouseLeave={onCellMouseUp} // Stop selection if mouse leaves table
      >
        <colgroup>
            {colWidths.map((width, i) => (
                <col key={i} style={{ width: `${width}px` }} />
            ))}
        </colgroup>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => {
                const cellHeight = rowHeights[rowIndex] || 48; // Default height if not specified
                let totalSpanHeight = cellHeight;
                const startingCell = grid[rowIndex].find(c => !c.isMerged);
                if (startingCell && startingCell.rowSpan > 1) {
                    totalSpanHeight = Array.from({ length: startingCell.rowSpan }).reduce((acc, _, i) => acc + (rowHeights[rowIndex + i] || 48), 0);
                }

                return (
                    <tr key={rowIndex} style={{ height: `${cellHeight}px` }}>
                    {Array.from({ length: cols }).map((_, colIndex) => {
                        const cell = grid[rowIndex][colIndex];
                        const currentPath = [...pathPrefix, rowIndex, colIndex];
                        if (cell.isMerged) return null; // Don't render merged cells

                        let cellStyle: React.CSSProperties = {
                            textAlign: cell.textAlign,
                        };
                        if (cell.rowSpan > 1) {
                           let calculatedHeight = 0;
                           for(let i=0; i<cell.rowSpan; i++) {
                               calculatedHeight += rowHeights[rowIndex+i] || 48;
                           }
                           cellStyle.height = `${calculatedHeight}px`;
                        } else {
                           cellStyle.height = isNested ? 'auto' : `${cellHeight}px`;
                        }

                        return (
                        <td
                            key={colIndex}
                            rowSpan={cell.rowSpan}
                            colSpan={cell.colSpan}
                            onMouseDown={() => onCellMouseDown(currentPath)}
                            onMouseEnter={() => onCellMouseEnter(currentPath)}
                            style={cellStyle}
                            className={cn(
                                "border border-muted p-0 relative select-none",
                                "flex flex-col", // Use flex for vertical alignment
                                getVerticalAlignClass(cell.verticalAlign),
                                isCellSelected(currentPath) && 'bg-primary/20 outline-2 outline-primary outline'
                            )}
                        >
                            <div className="w-full">
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
                                        rowHeights={[]}
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
                            </div>
                        </td>
                        );
                    })}
                    </tr>
                )
            })}
        </tbody>
      </table>
  );
};


const TableSelector = ({ onSelect }: { onSelect: (dims: { rows: number; cols: number }) => void }) => {
    const [hovered, setHovered] = useState({ rows: 0, cols: 0 });
    
    const gridSize = 10;
    
    const handleClick = (row: number, col: number) => {
        onSelect({ rows: row, cols: col });
    }

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
                                onClick={() => handleClick(row, col)}
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

const ColumnWidthInput = ({ index, width, onWidthChange }: { index: number, width: number, onWidthChange: (index: number, newWidth: number) => void }) => {
    const [inputValue, setInputValue] = useState(width.toString());
    const debouncedValue = useDebounce(inputValue, 500);

    useEffect(() => {
        setInputValue(width.toString());
    }, [width]);
    
    useEffect(() => {
        const numericValue = parseInt(debouncedValue, 10);
        if (!isNaN(numericValue) && numericValue !== width) {
            onWidthChange(index, Math.max(50, numericValue));
        }
    }, [debouncedValue]);

    return (
         <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full h-8 text-center"
            min={50}
        />
    );
}

const RowHeightInput = ({ index, height, onHeightChange }: { index: number, height: number, onHeightChange: (index: number, newHeight: number) => void }) => {
    const [inputValue, setInputValue] = useState(height.toString());
    const debouncedValue = useDebounce(inputValue, 500);

     useEffect(() => {
        setInputValue(height.toString());
     }, [height]);

     useEffect(() => {
        const numericValue = parseInt(debouncedValue, 10);
        if (!isNaN(numericValue) && numericValue !== height) {
            onHeightChange(index, Math.max(20, numericValue));
        }
    }, [debouncedValue]);

    return (
        <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full h-full text-center p-0 border-none bg-transparent focus-visible:ring-0"
            min={20}
        />
    );
}

const convertGridToMap = (grid: CellData[][]): { [key: string]: CellData[] } => {
    const gridMap: { [key: string]: CellData[] } = {};
    grid.forEach((row, rowIndex) => {
        gridMap[rowIndex] = row.map(cell => {
            if (cell.nestedGrid) {
                return {
                    ...cell,
                    nestedGrid: convertGridToMap(cell.nestedGrid) as any
                };
            }
            return cell;
        });
    });
    return gridMap;
};

const convertMapToGrid = (gridMap: { [key: string]: CellData[] }): CellData[][] => {
    if (!gridMap) return [];
    return Object.keys(gridMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => gridMap[parseInt(key)].map(cell => {
            if (cell.nestedGrid) {
                return {
                    ...cell,
                    nestedGrid: convertMapToGrid(cell.nestedGrid as any)
                };
            }
            return cell;
        }));
};

const SaveAsNewTemplateDialog = ({ onSave, children }: { onSave: (name: string) => void; children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');

    const handleSave = () => {
        onSave(name);
        setIsOpen(false);
        setName('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save as New Template</DialogTitle>
                    <DialogDescription>Give this new table design a name to save it.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        placeholder="e.g., Daily Inspection Report"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={!name.trim()}>Save as New</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Page Component ---
export default function TableBuilderPage() {
    const [grid, setGrid] = useState<CellData[][]>([]);
    const [colWidths, setColWidths] = useState<number[]>([]);
    const [rowHeights, setRowHeights] = useState<number[]>([]);
    const [selectedCells, setSelectedCells] = useState<CellPath[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [fontSize, setFontSize] = useState(14);
    const defaultRowHeight = 48; // px
    const { toast } = useToast();
    const firestore = useFirestore();
    const tenantId = 'safeviate'; // Hardcoded for now
    const [activeTemplate, setActiveTemplate] = useState<FirestoreTableTemplate | null>(null);


    const templatesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, `tenants/${tenantId}/table-templates`) : null),
        [firestore, tenantId]
    );
    const { data: savedTemplates, isLoading: isLoadingTemplates } = useCollection<FirestoreTableTemplate>(templatesQuery);

    const createGrid = (rows: number, cols: number) => {
        if (rows === 0 || cols === 0) return;
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
        setColWidths(Array(cols).fill(150));
        setRowHeights(Array(rows).fill(defaultRowHeight));
        setSelectedCells([]);
        setActiveTemplate(null);
    };

    const handleContentChange = useCallback((path: CellPath, newContent: string) => {
        setGrid(currentGrid => {
            const newGrid = JSON.parse(JSON.stringify(currentGrid));
            
            let targetGrid = newGrid;
            let finalCell: CellData | undefined;

            for (let i = 0; i < path.length; i += 2) {
                const row = path[i] as number;
                const col = path[i + 1] as number;
                
                if (!targetGrid[row]?.[col]) {
                    console.error("Invalid path in handleContentChange", path);
                    return currentGrid; // Return original grid if path is invalid
                }

                if (i + 2 < path.length) {
                    if (path[i + 2] === 'nestedGrid') {
                        targetGrid = targetGrid[row][col].nestedGrid!;
                    } else {
                        console.error("Invalid path segment in handleContentChange", path);
                        return currentGrid;
                    }
                } else {
                    finalCell = targetGrid[row][col];
                }
            }

            if (finalCell && finalCell.content !== newContent) {
                finalCell.content = newContent;
            }
    
            return newGrid;
        });
    }, []);

    const handleSelectionStart = (path: CellPath) => {
        setIsSelecting(true);
        setSelectedCells([path]);
    };

    const handleSelectionEnter = (path: CellPath) => {
        if (!isSelecting) return;
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
            let cell: any = newGrid;
             for (let i = 0; i < path.length; i += 2) {
                if(cell[path[i] as number] && cell[path[i as number] + 1]) {
                    if (i + 2 < path.length) {
                        cell = cell[path[i] as number][path[i+1] as number].nestedGrid;
                    } else {
                        cell[path[i] as number][path[i+1] as number].fontSize = newSize;
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
                  return; 
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
                    return; 
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
                    return; 
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

        newGrid[minRow][minCol].rowSpan = newRowSpan;
        newGrid[minRow][minCol].colSpan = newColSpan;
        newGrid[minRow][minCol].isMerged = false;


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
        setRowHeights(prev => [...prev, defaultRowHeight]);
    };

    const handleAddColumn = () => {
        if (grid.length === 0) return;
        const newColWidth = colWidths.length > 0 ? colWidths[0] : 150;
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
        setColWidths(prev => [...prev, newColWidth]);
    };

    const handleDeleteRow = () => {
        if (grid.length > 1) {
            setGrid(grid.slice(0, -1));
            setRowHeights(prev => prev.slice(0, -1));
            setSelectedCells([]);
        }
    };
    
    const handleDeleteColumn = () => {
        if (grid.length > 0 && grid[0].length > 1) {
            const newGrid = grid.map(row => row.slice(0, -1));
            setGrid(newGrid);
            setColWidths(prev => prev.slice(0,-1));
            setSelectedCells([]);
        }
    };
    
    const handleColWidthChange = (index: number, newWidth: number) => {
        setColWidths(prev => {
            const newColWidths = [...prev];
            newColWidths[index] = newWidth;
            return newColWidths;
        });
    };

    const handleRowHeightChange = (index: number, newHeight: number) => {
        setRowHeights(prev => {
            const newRowHeights = [...prev];
            newRowHeights[index] = newHeight;
            return newRowHeights;
        });
    };
    
    const handleSaveAsNew = (name: string) => {
        if (!firestore) return;
        if (!name.trim()) {
            toast({ variant: 'destructive', title: 'Name required', description: 'Please enter a name for the new template.' });
            return;
        }
        if (grid.length === 0) {
            toast({ variant: 'destructive', title: 'Empty Table', description: 'Cannot save an empty table.' });
            return;
        }

        const templatesCollection = collection(firestore, `tenants/${tenantId}/table-templates`);
        
        const gridAsMap = convertGridToMap(grid);

        const templateData = { name: name.trim(), grid: gridAsMap, colWidths, rowHeights };
        addDocumentNonBlocking(templatesCollection, templateData);
        
        toast({ title: 'Template Saved', description: `Template "${name.trim()}" has been saved.`});
    };

    const handleUpdateTemplate = () => {
        if (!firestore || !activeTemplate) return;
        if (grid.length === 0) {
            toast({ variant: 'destructive', title: 'Empty Table', description: 'Cannot save an empty table.' });
            return;
        }

        const templateRef = doc(firestore, `tenants/${tenantId}/table-templates`, activeTemplate.id);
        const gridAsMap = convertGridToMap(grid);
        const templateData = { name: activeTemplate.name, grid: gridAsMap, colWidths, rowHeights };

        updateDocumentNonBlocking(templateRef, templateData);
        toast({ title: 'Template Updated', description: `Template "${activeTemplate.name}" has been updated.`});
    }

    const handleLoadTemplate = (template: FirestoreTableTemplate) => {
        setActiveTemplate(template);
        setGrid(convertMapToGrid(template.grid));
        setColWidths(template.colWidths);
        setRowHeights(template.rowHeights || Array(Object.keys(template.grid).length).fill(defaultRowHeight));
        toast({ title: 'Template Loaded', description: `"${template.name}" has been loaded into the builder.` });
    };

    const handleDeleteTemplate = (templateId: string) => {
        if (!firestore) return;
        const templateRef = doc(firestore, `tenants/${tenantId}/table-templates`, templateId);
        deleteDocumentNonBlocking(templateRef);
        toast({ title: 'Template Deleted', description: 'The table template is being deleted.' });
        if (activeTemplate?.id === templateId) {
            setActiveTemplate(null);
        }
    };
    
    const SaveButton = () => {
        if (grid.length === 0) return null;

        if (activeTemplate) {
            return (
                <div className="flex rounded-md">
                    <Button onClick={handleUpdateTemplate} className="rounded-r-none">
                        <Save className="mr-2 h-4 w-4" /> Update &quot;{activeTemplate.name}&quot;
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" className="w-8 rounded-l-none border-l">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <SaveAsNewTemplateDialog onSave={handleSaveAsNew}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    Save as New Template...
                                </DropdownMenuItem>
                           </SaveAsNewTemplateDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        }

        return (
            <SaveAsNewTemplateDialog onSave={handleSaveAsNew}>
                 <Button disabled={grid.length === 0}><Save className="mr-2 h-4 w-4" /> Save as Template</Button>
            </SaveAsNewTemplateDialog>
        );
    }

    return (
        <TooltipProvider>
        <div className="space-y-6">
             <h1 className="text-3xl font-bold tracking-tight">Interactive Table Builder</h1>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TableSelector onSelect={({rows, cols}) => createGrid(rows, cols)} />
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle>Toolbar</CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-wrap items-center gap-x-4 gap-y-2'>
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
                        <Separator orientation='vertical' className='h-8' />
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
                         <Separator orientation='vertical' className='h-8' />
                        <SaveButton />
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Table Preview {activeTemplate && `- Editing "${activeTemplate.name}"`}</CardTitle>
                    <CardDescription>Click and drag to select cells. Adjust column widths below.</CardDescription>
                </CardHeader>
                <CardContent>
                    {grid.length > 0 ? (
                        <ScrollArea className="w-full whitespace-nowrap border rounded-lg" style={{ height: '600px' }}>
                          <div className='p-4' style={{ width: colWidths.reduce((a, b) => a + b, 0) + 64 }}>
                            {/* Column Width Inputs */}
                            <div className="flex" style={{ width: colWidths.reduce((a, b) => a + b, 0), marginLeft: '4rem' }}>
                                {colWidths.map((width, index) => (
                                    <div key={`width-input-${index}`} style={{ width: `${width}px` }} className="p-1">
                                        <ColumnWidthInput index={index} width={width} onWidthChange={handleColWidthChange} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex">
                                {/* Row Height Inputs */}
                                <div className="flex flex-col" style={{ width: '4rem' }}>
                                    {rowHeights.map((height, index) => (
                                        <div key={`height-input-${index}`} style={{ height: `${height}px` }} className="p-1 border-r border-b">
                                            <RowHeightInput index={index} height={height} onHeightChange={handleRowHeightChange} />
                                        </div>
                                    ))}
                                </div>
                                {/* Table */}
                                <ResizableTable 
                                    grid={grid} 
                                    setGrid={setGrid}
                                    selectedCells={selectedCells}
                                    onCellMouseDown={handleSelectionStart}
                                    onCellMouseEnter={handleSelectionEnter}
                                    onCellMouseUp={handleSelectionEnd}
                                    colWidths={colWidths}
                                    rowHeights={rowHeights}
                                    handleContentChange={handleContentChange}
                                />
                            </div>
                           </div>
                           <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>Select table dimensions to see a preview.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Saved Templates</CardTitle>
                    <CardDescription>Load a previously saved table design.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingTemplates ? <Skeleton className="h-24 w-full" /> : (
                        (savedTemplates || []).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(savedTemplates || []).map(template => (
                                    <Card key={template.id} className="flex flex-col">
                                        <CardHeader className="flex-1">
                                            <CardTitle className='text-base'>{template.name}</CardTitle>
                                        </CardHeader>
                                        <CardFooter className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleLoadTemplate(template)}>Load</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteTemplate(template.id)}>Delete</Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No saved templates yet.</p>
                        )
                    )}
                </CardContent>
            </Card>
         </div>
        </TooltipProvider>
    );
}

