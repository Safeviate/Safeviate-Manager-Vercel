
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type Cell = {
  r: number;
  c: number;
  content: string;
  rowSpan: number;
  colSpan: number;
  align: 'left' | 'center' | 'right';
  hidden: boolean;
};

type TableData = {
  rows: number;
  cols: number;
  cells: Cell[];
  colWidths: number[];
  rowHeights: number[];
};

type TableTemplate = {
  id: string;
  name: string;
  tableData: TableData;
};

const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 40;

// A controlled input for resizing to prevent re-render loops
const SizeInput = ({ value, onSave }: { value: number, onSave: (newSize: number) => void }) => {
    const [localValue, setLocalValue] = useState(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleBlur = () => {
        const newSize = parseInt(localValue, 10);
        if (!isNaN(newSize) && newSize > 0) {
            onSave(newSize);
        } else {
            setLocalValue(value.toString()); // Revert if invalid
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur();
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <Input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="h-6 w-16 text-center text-xs bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
    );
};


const SaveAsNewTemplateDialog = ({ children, onSave }: { children: React.ReactNode, onSave: (name: string) => void }) => {
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
                    <DialogDescription>
                        Enter a name for this new table template.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        placeholder="Template name..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const TableBuilderPage = () => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  
  const [tableData, setTableData] = useState<TableData>({
    rows: 3,
    cols: 4,
    cells: [],
    colWidths: Array(4).fill(DEFAULT_COL_WIDTH),
    rowHeights: Array(3).fill(DEFAULT_ROW_HEIGHT),
  });
  
  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/table-templates`)) : null),
    [firestore, tenantId]
  );
  const { data: savedTemplates } = useCollection<TableTemplate>(templatesQuery);

  const initializeCells = useCallback((rows: number, cols: number) => {
    const newCells: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newCells.push({ r, c, content: '', rowSpan: 1, colSpan: 1, align: 'left', hidden: false });
      }
    }
    setTableData({
      rows,
      cols,
      cells: newCells,
      colWidths: Array(cols).fill(DEFAULT_COL_WIDTH),
      rowHeights: Array(rows).fill(DEFAULT_ROW_HEIGHT),
    });
  }, []);

  useEffect(() => {
    initializeCells(3, 4);
  }, [initializeCells]);

  const updateCellContent = (r: number, c: number, content: string) => {
    setTableData(prev => ({
      ...prev,
      cells: prev.cells.map(cell =>
        cell.r === r && cell.c === c ? { ...cell, content } : cell
      ),
    }));
  };
  
  const addColumn = () => {
    setTableData(prev => {
        const newCols = prev.cols + 1;
        const newCells = [...prev.cells];
        for(let r = 0; r < prev.rows; r++) {
            newCells.push({ r, c: prev.cols, content: '', rowSpan: 1, colSpan: 1, align: 'left', hidden: false });
        }
        return {
            ...prev,
            cols: newCols,
            cells: newCells,
            colWidths: [...prev.colWidths, DEFAULT_COL_WIDTH],
        };
    });
  };

  const addRow = () => {
      setTableData(prev => {
          const newRows = prev.rows + 1;
          const newCells = [...prev.cells];
          for(let c = 0; c < prev.cols; c++) {
              newCells.push({ r: prev.rows, c, content: '', rowSpan: 1, colSpan: 1, align: 'left', hidden: false });
          }
          return {
              ...prev,
              rows: newRows,
              cells: newCells,
              rowHeights: [...prev.rowHeights, DEFAULT_ROW_HEIGHT],
          };
      });
  };
  
  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    
    if (type === 'COLUMN') {
        const newColWidths = Array.from(tableData.colWidths);
        const [removedWidth] = newColWidths.splice(source.index, 1);
        newColWidths.splice(destination.index, 0, removedWidth);

        // This is complex. We need to remap all cell `c` coordinates
        const newCells = tableData.cells.map(cell => ({ ...cell }));
        // TODO: Implement column drag reordering for cells
        
        toast({ title: "Note", description: "Column data reordering is not yet implemented."});

        setTableData(prev => ({ ...prev, colWidths: newColWidths }));

    } else if (type === 'ROW') {
        const newRowHeights = Array.from(tableData.rowHeights);
        const [removedHeight] = newRowHeights.splice(source.index, 1);
        newRowHeights.splice(destination.index, 0, removedHeight);

        // This is complex. We need to remap all cell `r` coordinates
        const newCells = tableData.cells.map(cell => ({ ...cell }));
        // TODO: Implement row drag reordering for cells
        
        toast({ title: "Note", description: "Row data reordering is not yet implemented."});

        setTableData(prev => ({ ...prev, rowHeights: newRowHeights }));
    }
  };
  
  const handleSaveTemplate = (name: string) => {
    if (!firestore || !name.trim()) return;
    addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/table-templates`), {
        name,
        tableData,
    });
    toast({ title: "Template Saved", description: `"${name}" has been saved.` });
  };
  
  const updateColWidth = (index: number, newWidth: number) => {
    setTableData(prev => {
        const newColWidths = [...prev.colWidths];
        newColWidths[index] = newWidth;
        return { ...prev, colWidths: newColWidths };
    });
  };

  const updateRowHeight = (index: number, newHeight: number) => {
    setTableData(prev => {
        const newRowHeights = [...prev.rowHeights];
        newRowHeights[index] = newHeight;
        return { ...prev, rowHeights: newRowHeights };
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dynamic Table Builder</CardTitle>
          <CardDescription>
            A visual table editor. Add rows/columns, edit content, and save your designs as templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={addRow}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
          <Button onClick={addColumn}><PlusCircle className="mr-2 h-4 w-4" /> Add Column</Button>
           <SaveAsNewTemplateDialog onSave={handleSaveTemplate}>
             <Button>
               <Save className="mr-2" />
               Save as New Template
             </Button>
           </SaveAsNewTemplateDialog>
        </CardContent>
      </Card>

        <DragDropContext onDragEnd={onDragEnd}>
            <div className="w-full overflow-x-auto rounded-lg border shadow-sm bg-card p-4">
                <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <Droppable droppableId="headers" direction="horizontal" type="COLUMN">
                        {(provided) => (
                            <thead ref={provided.innerRef} {...provided.droppableProps}>
                                <tr>
                                    <th style={{ width: '60px' }} className="p-0 border border-border bg-muted/50"></th>
                                    {Array.from({ length: tableData.cols }).map((_, colIndex) => (
                                        <Draggable key={colIndex} draggableId={`col-${colIndex}`} index={colIndex}>
                                            {(provided) => (
                                                <th
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{ width: `${tableData.colWidths[colIndex]}px` }}
                                                    className="p-0 border border-border bg-muted/50 relative"
                                                >
                                                    <div {...provided.dragHandleProps} className="h-full flex items-center justify-center p-1 cursor-grab">
                                                        <div className="flex items-center gap-1">
                                                           <span>{String.fromCharCode(65 + colIndex)}</span>
                                                            <SizeInput value={tableData.colWidths[colIndex]} onSave={(newWidth) => updateColWidth(colIndex, newWidth)} />
                                                        </div>
                                                    </div>
                                                </th>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </tr>
                            </thead>
                        )}
                    </Droppable>
                    <Droppable droppableId="rows" type="ROW">
                        {(provided) => (
                            <tbody ref={provided.innerRef} {...provided.droppableProps}>
                                {Array.from({ length: tableData.rows }).map((_, rowIndex) => (
                                    <Draggable key={rowIndex} draggableId={`row-${rowIndex}`} index={rowIndex}>
                                        {(provided) => (
                                            <tr ref={provided.innerRef} {...provided.draggableProps} style={{ height: `${tableData.rowHeights[rowIndex]}px` }}>
                                                <td {...provided.dragHandleProps} className="p-0 border border-border bg-muted/50 text-center cursor-grab">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span>{rowIndex + 1}</span>
                                                        <SizeInput value={tableData.rowHeights[rowIndex]} onSave={(newHeight) => updateRowHeight(rowIndex, newHeight)} />
                                                    </div>
                                                </td>
                                                {tableData.cells
                                                    .filter(cell => cell.r === rowIndex)
                                                    .sort((a, b) => a.c - b.c)
                                                    .map(cell => (
                                                        <td
                                                            key={cell.c}
                                                            className="p-0 border border-border"
                                                        >
                                                            <Input
                                                                value={cell.content}
                                                                onChange={(e) => updateCellContent(cell.r, cell.c, e.target.value)}
                                                                className="h-full w-full border-0 bg-transparent focus-visible:bg-blue-100/20 focus-visible:shadow-[inset_0_0_0_2px_theme(colors.blue.500)] focus-visible:ring-0"
                                                            />
                                                        </td>
                                                    ))}
                                            </tr>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </tbody>
                        )}
                    </Droppable>
                </table>
            </div>
        </DragDropContext>
    </div>
  );
};

export default TableBuilderPage;

        
