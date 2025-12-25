
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PlusCircle, Trash2, GripVertical, Save } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// --- Types ---
type CellData = string;
type RowData = CellData[];
type GridData = RowData[];
type TableTemplate = {
    id: string;
    name: string;
    grid: Record<string, RowData>;
    colWidths: number[];
};

// --- Child Components for Inputs ---
const ColumnWidthInput = ({ width, onChange }: { width: number; onChange: (newWidth: number) => void }) => {
    const [value, setValue] = useState(width);
    const debouncedValue = useDebounce(value, 500);

    useEffect(() => {
        onChange(debouncedValue);
    }, [debouncedValue, onChange]);
    
    useEffect(() => {
        setValue(width);
    }, [width]);

    return (
        <Input 
          type="number" 
          value={value} 
          onChange={(e) => setValue(Number(e.target.value))} 
          className="w-20 h-8 text-xs p-1"
        />
    );
};

const RowHeightInput = ({ height, onChange }: { height: number, onChange: (newHeight: number) => void }) => {
    const [value, setValue] = useState(height);
    const debouncedValue = useDebounce(value, 500);
    
    useEffect(() => {
        onChange(debouncedValue);
    }, [debouncedValue, onChange]);

    useEffect(() => {
        setValue(height);
    }, [height]);

    return (
        <Input 
          type="number" 
          value={value} 
          onChange={(e) => setValue(Number(e.target.value))} 
          className="w-16 h-8 text-xs p-1"
        />
    );
};

// --- Save Button Components ---
const SaveAsNewTemplateDialog = ({ onSave, children }: { onSave: (name: string) => void, children: React.ReactNode }) => {
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
                        Give your new table template a name.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder="e.g., Weekly Report"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const SaveButton = ({ isTemplateLoaded, onSave, onSaveAs, onUpdate }: { isTemplateLoaded: boolean, onSave: (name: string) => void, onSaveAs: (name: string) => void, onUpdate: () => void }) => {
    if (isTemplateLoaded) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button>
                        <Save className="mr-2" />
                        Update Template
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={onUpdate}>Update Current Template</DropdownMenuItem>
                    <SaveAsNewTemplateDialog onSave={onSaveAs}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Save as New Template...</DropdownMenuItem>
                    </SaveAsNewTemplateDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <SaveAsNewTemplateDialog onSave={onSave}>
             <Button>
                <Save className="mr-2" />
                Save Template
            </Button>
        </SaveAsNewTemplateDialog>
    );
};

// --- Hook for debouncing state updates ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debouncedValue;
}

// --- Main Page Component ---
const TableBuilderPage = () => {
  const [cols, setCols] = useState<string[]>(['Header 1', 'Header 2']);
  const [rows, setRows] = useState<GridData>([['Cell 1', 'Cell 2']]);
  const [colWidths, setColWidths] = useState<number[]>([150, 150]);
  const [rowHeights, setRowHeights] = useState<number[]>([35]);
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  
  const templatesQuery = useMemoFirebase(
      () => (firestore ? collection(firestore, `tenants/${tenantId}/table-templates`) : null),
      [firestore, tenantId]
  );
  const { data: savedTemplates, isLoading: isLoadingTemplates } = useCollection<TableTemplate>(templatesQuery);

  const addColumn = () => {
    setCols([...cols, `Header ${cols.length + 1}`]);
    setRows(rows.map(row => [...row, '']));
    setColWidths([...colWidths, 150]);
  };

  const addRow = () => {
    setRows([...rows, Array(cols.length).fill('')]);
    setRowHeights([...rowHeights, 35]);
  };

  const deleteColumn = (colIndex: number) => {
    if (cols.length <= 1) return;
    setCols(cols.filter((_, i) => i !== colIndex));
    setRows(rows.map(row => row.filter((_, i) => i !== colIndex)));
    setColWidths(colWidths.filter((_, i) => i !== colIndex));
  };

  const deleteRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== rowIndex));
    setRowHeights(rowHeights.filter((_, i) => i !== rowIndex));
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][colIndex] = value;
    setRows(updatedRows);
  };
  
  const updateHeader = (colIndex: number, value: string) => {
    const newCols = [...cols];
    newCols[colIndex] = value;
    setCols(newCols);
  };

  const updateColWidth = useCallback((colIndex: number, width: number) => {
    setColWidths(prev => {
        const newWidths = [...prev];
        newWidths[colIndex] = width;
        return newWidths;
    });
  }, []);

  const updateRowHeight = useCallback((rowIndex: number, height: number) => {
    setRowHeights(prev => {
        const newHeights = [...prev];
        newHeights[rowIndex] = height;
        return newHeights;
    });
  }, []);

  const handleSaveTemplate = (name: string, idToUpdate?: string) => {
    if (!firestore) return;
    
    // Convert array to object for Firestore compatibility
    const gridObject = rows.reduce((acc, row, index) => {
      acc[index] = row;
      return acc;
    }, {} as Record<string, RowData>);

    const templateData = { name, grid: gridObject, colWidths, rowHeights };

    if (idToUpdate) {
        // Update existing template
        const templateRef = doc(firestore, `tenants/${tenantId}/table-templates`, idToUpdate);
        updateDocumentNonBlocking(templateRef, templateData);
        toast({ title: "Template Updated", description: `Template "${name}" has been updated.` });
    } else {
        // Add new template
        const templatesCollection = collection(firestore, `tenants/${tenantId}/table-templates`);
        addDocumentNonBlocking(templatesCollection, templateData);
        toast({ title: "Template Saved", description: `Template "${name}" has been saved.` });
    }
  };
  
  const handleUpdateCurrentTemplate = () => {
    if (loadedTemplateId && savedTemplates) {
        const currentTemplate = savedTemplates.find(t => t.id === loadedTemplateId);
        if (currentTemplate) {
            handleSaveTemplate(currentTemplate.name, loadedTemplateId);
        }
    }
  }

  const handleDeleteTemplate = (templateId: string) => {
      if (!firestore) return;
      const templateRef = doc(firestore, `tenants/${tenantId}/table-templates`, templateId);
      deleteDocumentNonBlocking(templateRef);
      toast({ title: "Template Deleted" });
  };
  
  const handleLoadTemplate = (template: TableTemplate) => {
    const gridArray = Object.keys(template.grid).sort((a,b) => Number(a) - Number(b)).map(key => template.grid[key]);
    setCols(gridArray[0]?.map((_, i) => template.grid[0]?.[i] || `Header ${i+1}`));
    setRows(gridArray);
    setColWidths(template.colWidths);
    setRowHeights(template.rowHeights || Array(gridArray.length).fill(35));
    setLoadedTemplateId(template.id);
    toast({ title: "Template Loaded", description: `Template "${template.name}" has been loaded.` });
  };

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === 'COLUMN') {
      const newHeaders = Array.from(cols);
      const [removedHeader] = newHeaders.splice(source.index, 1);
      newHeaders.splice(destination.index, 0, removedHeader);
      
      const newRows = rows.map(row => {
        const newRow = Array.from(row);
        const [removedCell] = newRow.splice(source.index, 1);
        newRow.splice(destination.index, 0, removedCell);
        return newRow;
      });

      const newColWidths = Array.from(colWidths);
      const [removedWidth] = newColWidths.splice(source.index, 1);
      newColWidths.splice(destination.index, 0, removedWidth);
      
      setCols(newHeaders);
      setRows(newRows);
      setColWidths(newColWidths);
    } else { // ROW
      const newRows = Array.from(rows);
      const [removed] = newRows.splice(source.index, 1);
      newRows.splice(destination.index, 0, removed);

      const newRowHeights = Array.from(rowHeights);
      const [removedHeight] = newRowHeights.splice(source.index, 1);
      newRowHeights.splice(destination.index, 0, removedHeight);

      setRows(newRows);
      setRowHeights(newRowHeights);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
              <CardTitle>Dynamic Table Builder</CardTitle>
              <CardDescription>
                  Add or remove rows and columns, resize them, and drag to reorder. Save your designs as templates.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
              <div className="flex gap-2">
                  <Button onClick={addRow}><PlusCircle className="mr-2" /> Add Row</Button>
                  <Button onClick={addColumn}><PlusCircle className="mr-2" /> Add Column</Button>
              </div>
              <SaveButton
                isTemplateLoaded={!!loadedTemplateId}
                onSave={(name) => handleSaveTemplate(name)}
                onSaveAs={(name) => handleSaveTemplate(name)}
                onUpdate={handleUpdateCurrentTemplate}
              />
          </CardContent>
      </Card>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="w-full overflow-x-auto rounded-lg border shadow-sm">
          <table className="border-collapse bg-white" style={{ tableLayout: 'fixed' }}>
            <thead>
                <Droppable droppableId="headers" direction="horizontal" type="COLUMN">
                    {(provided) => (
                        <tr ref={provided.innerRef} {...provided.droppableProps}>
                            <th className="sticky left-0 z-20 w-[40px] bg-gray-100 border border-gray-300">
                                <div className="flex items-center justify-center">
                                    <RowHeightInput height={35} onChange={() => {}} />
                                </div>
                            </th>
                            {cols.map((_, colIndex) => (
                                <Draggable key={`col-${colIndex}`} draggableId={`col-draggable-${colIndex}`} index={colIndex}>
                                {(provided, snapshot) => (
                                    <th 
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        style={{ ...provided.draggableProps.style, width: `${colWidths[colIndex]}px` }}
                                        className="border border-gray-300 bg-gray-50 h-[35px] p-0 relative group"
                                    >
                                        <div className="flex items-center h-full">
                                            <div {...provided.dragHandleProps} className="w-6 h-full flex items-center justify-center cursor-grab active:cursor-grabbing">
                                                <GripVertical className='h-4 w-4 text-gray-400' />
                                            </div>
                                            <Input 
                                                value={cols[colIndex]} 
                                                onChange={(e) => updateHeader(colIndex, e.target.value)} 
                                                className="w-full h-full border-none p-2 bg-transparent focus:bg-blue-100/50 focus:shadow-[inset_0_0_0_2px_#1a73e8]"
                                            />
                                            <button onClick={() => deleteColumn(colIndex)} className="px-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className='h-4 w-4' />
                                            </button>
                                        </div>
                                    </th>
                                )}
                                </Draggable>
                            ))}
                             {provided.placeholder}
                        </tr>
                    )}
                </Droppable>
            </thead>
            <Droppable droppableId="rows" type="ROW">
                {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                        {rows.map((row, rowIndex) => (
                             <Draggable key={`row-${rowIndex}`} draggableId={`row-draggable-${rowIndex}`} index={rowIndex}>
                                {(provided, snapshot) => (
                                     <tr 
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        style={{...provided.draggableProps.style, height: `${rowHeights[rowIndex]}px`}}
                                        className="group"
                                    >
                                        <td className="sticky left-0 z-10 text-center text-xs text-gray-500 bg-gray-100 border border-gray-300 relative">
                                          <div className="flex items-center h-full justify-center">
                                              <div {...provided.dragHandleProps} className="absolute left-0 top-0 h-full w-4 flex items-center justify-center cursor-grab active:cursor-grabbing">
                                                 <GripVertical className='h-4 w-4 text-gray-400 -rotate-90' />
                                              </div>
                                              <span>{rowIndex + 1}</span>
                                              <button onClick={() => deleteRow(rowIndex)} className="absolute right-0 top-1/2 -translate-y-1/2 px-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <Trash2 className='h-4 w-4' />
                                              </button>
                                          </div>
                                        </td>
                                        {row.map((cell, colIndex) => (
                                        <td key={colIndex} className="border border-gray-300 h-full p-0">
                                            <Input 
                                            value={cell} 
                                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)} 
                                            className="w-full h-full border-none p-2 bg-transparent focus:bg-blue-100/50 focus:shadow-[inset_0_0_0_2px_#1a73e8]"
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
      <Card>
        <CardHeader>
            <CardTitle>Saved Templates</CardTitle>
            <CardDescription>Load or delete previously saved table designs.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingTemplates ? <Skeleton className="h-20 w-full" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(savedTemplates || []).map(template => (
                        <Card key={template.id}>
                            <CardHeader className="p-4">
                                <CardTitle className='text-base'>{template.name}</CardTitle>
                            </CardHeader>
                            <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                                <Button variant="outline" size="sm" onClick={() => handleLoadTemplate(template)}>Load</Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteTemplate(template.id)}>Delete</Button>
                            </CardFooter>
                        </Card>
                    ))}
                    {(savedTemplates || []).length === 0 && (
                        <p className="col-span-full text-center text-muted-foreground py-4">
                            No templates saved yet.
                        </p>
                    )}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TableBuilderPage;
