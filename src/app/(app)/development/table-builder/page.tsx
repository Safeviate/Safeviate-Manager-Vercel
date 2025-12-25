
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Save, Trash2, AlignLeft, AlignCenter, AlignRight, ChevronsUpDown, Bold, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, setDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Cell = {
  r: number;
  c: number;
  content: string;
  rowSpan: number;
  colSpan: number;
  align: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  fontSize: number;
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
const DEFAULT_FONT_SIZE = 14;

const TablePreview = ({ tableData }: { tableData: TableData }) => {
    if (!tableData) return null;
  
    return (
      <div className="w-full overflow-auto rounded-lg border my-2">
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
          <tbody>
            {Array.from({ length: tableData.rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {tableData.cells
                  .filter(cell => cell.r === rowIndex)
                  .sort((a, b) => a.c - b.c)
                  .map(cell => {
                    if (cell.hidden) return null;
                    return (
                      <td
                        key={`${cell.r}-${cell.c}`}
                        rowSpan={cell.rowSpan}
                        colSpan={cell.colSpan}
                        className="p-1 border border-border align-top"
                        style={{
                          textAlign: cell.align,
                          fontWeight: cell.fontWeight,
                          fontSize: `${cell.fontSize || DEFAULT_FONT_SIZE}px`,
                          width: `${100 / tableData.cols}%`,
                        }}
                      >
                        {cell.content}
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
            setLocalValue(value.toString());
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
            className="h-6 w-16 text-center text-xs bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-primary px-0"
        />
    );
};


const SaveAsNewTemplateDialog = ({ children, onSave, isUpdate, currentName }: { children: React.ReactNode, onSave: (name: string) => void, isUpdate: boolean, currentName?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');

    useEffect(() => {
        if (isUpdate && currentName) {
            setName(currentName);
        }
    }, [isUpdate, currentName, isOpen])

    const handleSave = () => {
        onSave(name);
        setIsOpen(false);
        if (!isUpdate) {
            setName('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isUpdate ? 'Rename Template' : 'Save as New Template'}</DialogTitle>
                    <DialogDescription>
                        Enter a name for this table template.
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
  
  const [tableData, setTableData] = useState<TableData | null>(null);
  
  const [selectedCells, setSelectedCells] = useState<{r: number, c: number}[]>([]);
  const [isEditMode, setIsEditMode] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<TableTemplate | null>(null);

  const tableTemplateRef = useMemoFirebase(() => {
    if (!firestore) return null;
    const templateId = activeTemplate ? activeTemplate.id : 'main-table';
    return doc(firestore, 'tenants', tenantId, 'table-templates', templateId);
  }, [firestore, tenantId, activeTemplate]);

  const { data: remoteTableData, isLoading } = useDoc<TableTemplate>(tableTemplateRef);

  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/table-templates`)) : null),
    [firestore, tenantId]
  );
  const { data: savedTemplates } = useCollection<TableTemplate>(templatesQuery);

  const initializeTable = useCallback(async (rows: number, cols: number) => {
    const newCells: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newCells.push({ r, c, content: '', rowSpan: 1, colSpan: 1, align: 'left', fontWeight: 'normal', fontSize: DEFAULT_FONT_SIZE, hidden: false });
      }
    }
    const initialData: TableData = {
      rows,
      cols,
      cells: newCells,
      colWidths: Array(cols).fill(DEFAULT_COL_WIDTH),
      rowHeights: Array(rows).fill(DEFAULT_ROW_HEIGHT),
    };

    if (tableTemplateRef) {
        await setDoc(tableTemplateRef, { name: 'Main Table', tableData: initialData }, { merge: true });
    }
    
    setTableData(initialData);

  }, [firestore, tenantId, tableTemplateRef]);

  useEffect(() => {
    if (!isLoading && remoteTableData?.tableData) {
        setTableData(remoteTableData.tableData);
        if (!activeTemplate) {
            setActiveTemplate(remoteTableData);
        }
    } else if (!isLoading && !remoteTableData && !activeTemplate) {
        // No data on remote, initialize a default one if we are not loading a specific template
        initializeTable(3, 4);
    }
  }, [remoteTableData, isLoading, activeTemplate, initializeTable]);
  
  const updateRemoteTable = useCallback((newTableData: Partial<TableData>) => {
    if (tableTemplateRef) {
        updateDocumentNonBlocking(tableTemplateRef, { tableData: newTableData });
    }
  }, [tableTemplateRef]);

  const updateCellContent = (r: number, c: number, content: string) => {
    if (!tableData) return;
    const newCells = tableData.cells.map(cell =>
        cell.r === r && cell.c === c ? { ...cell, content } : cell
      );
    const newTableData = { ...tableData, cells: newCells };
    setTableData(newTableData);
    // Debounced update in parent component or a save button would be better here for performance
  };

  const onBlurContent = () => {
    if (tableData) {
      updateRemoteTable(tableData);
    }
  };
  
  const addColumn = (index: number) => {
    if (!tableData) return;
    setTableData(prev => {
        if (!prev) return null;
        const newCols = prev.cols + 1;
        const newCells = [...prev.cells];
        // Shift existing cells
        for (const cell of newCells) {
            if (cell.c >= index) {
                cell.c += 1;
            }
        }
        // Add new cells for the new column
        for(let r = 0; r < prev.rows; r++) {
            newCells.push({ r, c: index, content: '', rowSpan: 1, colSpan: 1, align: 'left', fontWeight: 'normal', fontSize: DEFAULT_FONT_SIZE, hidden: false });
        }
        const newColWidths = [...prev.colWidths];
        newColWidths.splice(index, 0, DEFAULT_COL_WIDTH);
        const newTableData = { ...prev, cols: newCols, cells: newCells.sort((a,b) => a.r - b.r || a.c - b.c), colWidths: newColWidths };
        updateRemoteTable(newTableData);
        return newTableData;
    });
  };

  const addRow = (index: number) => {
    if (!tableData) return;
      setTableData(prev => {
          if (!prev) return null;
          const newRows = prev.rows + 1;
          const newCells = [...prev.cells];
           // Shift existing cells
          for (const cell of newCells) {
            if (cell.r >= index) {
                cell.r += 1;
            }
          }
          // Add new cells for the new row
          for(let c = 0; c < prev.cols; c++) {
              newCells.push({ r: index, c, content: '', rowSpan: 1, colSpan: 1, align: 'left', fontWeight: 'normal', fontSize: DEFAULT_FONT_SIZE, hidden: false });
          }
          const newRowHeights = [...prev.rowHeights];
          newRowHeights.splice(index, 0, DEFAULT_ROW_HEIGHT);
          const newTableData = { ...prev, rows: newRows, cells: newCells.sort((a,b) => a.r - b.r || a.c - b.c), rowHeights: newRowHeights };
          updateRemoteTable(newTableData);
          return newTableData;
      });
  };
  
  const deleteColumn = (index: number) => {
    if (!tableData) return;
      setTableData(prev => {
          if (!prev || prev.cols <= 1) return prev;
          const newCols = prev.cols - 1;
          let newCells = prev.cells.filter(cell => cell.c !== index).map(cell => {
              if (cell.c > index) {
                  return { ...cell, c: cell.c - 1 };
              }
              return cell;
          });
           // Handle merged cells that might be affected
          newCells = newCells.map(cell => {
             if (cell.c >= index) {
                 // No complex un-merging, just shrink if it spans over the deleted col
                 if (cell.c + cell.colSpan > index) {
                     return { ...cell, colSpan: Math.max(1, cell.colSpan - 1) };
                 }
             }
             return cell;
          });
          const newColWidths = prev.colWidths.filter((_, i) => i !== index);
          const newTableData = { ...prev, cols: newCols, cells: newCells, colWidths: newColWidths };
          updateRemoteTable(newTableData);
          return newTableData;
      });
  };

  const deleteRow = (index: number) => {
    if (!tableData) return;
      setTableData(prev => {
          if (!prev || prev.rows <= 1) return prev;
          const newRows = prev.rows - 1;
          let newCells = prev.cells.filter(cell => cell.r !== index).map(cell => {
              if (cell.r > index) {
                  return { ...cell, r: cell.r - 1 };
              }
              return cell;
          });
           // Handle merged cells that might be affected
            newCells = newCells.map(cell => {
                if (cell.r >= index) {
                    if (cell.r + cell.rowSpan > index) {
                        return { ...cell, rowSpan: Math.max(1, cell.rowSpan - 1) };
                    }
                }
                return cell;
            });
          const newRowHeights = prev.rowHeights.filter((_, i) => i !== index);
          const newTableData = { ...prev, rows: newRows, cells: newCells, rowHeights: newRowHeights };
          updateRemoteTable(newTableData);
          return newTableData;
      });
  };
  
  const toggleSelect = (r: number, c: number) => {
    if (!isEditMode) return;
    const cellKey = `${r}-${c}`;
    const isSelected = selectedCells.some(cell => `${cell.r}-${cell.c}` === cellKey);
    if (isSelected) {
      setSelectedCells(selectedCells.filter(cell => `${cell.r}-${cell.c}` !== cellKey));
    } else {
      setSelectedCells([...selectedCells, { r, c }]);
    }
  };

  const handleMerge = () => {
    if (!tableData || selectedCells.length < 2) return;

    const rows = selectedCells.map(cell => cell.r);
    const cols = selectedCells.map(cell => cell.c);
    const minR = Math.min(...rows);
    const maxR = Math.max(...rows);
    const minC = Math.min(...cols);
    const maxC = Math.max(...cols);

    const newCells = tableData.cells.map(cell => {
      if (cell.r === minR && cell.c === minC) {
        return { ...cell, rowSpan: maxR - minR + 1, colSpan: maxC - minC + 1, hidden: false };
      }
      if (cell.r >= minR && cell.r <= maxR && cell.c >= minC && cell.c <= maxC) {
        return { ...cell, hidden: true };
      }
      return cell;
    });

    const newTableData = { ...tableData, cells: newCells };
    setTableData(newTableData);
    updateRemoteTable(newTableData);
    setSelectedCells([]);
  };

  const handleUnmerge = () => {
    if (!tableData) return;
    let newCells = [...tableData.cells];
    selectedCells.forEach(selCell => {
        const masterCell = newCells.find(c => c.r === selCell.r && c.c === selCell.c);
        if (masterCell && (masterCell.rowSpan > 1 || masterCell.colSpan > 1)) {
            for (let r = masterCell.r; r < masterCell.r + masterCell.rowSpan; r++) {
                for (let c = masterCell.c; c < masterCell.c + masterCell.colSpan; c++) {
                    const cellToUnhide = newCells.find(cell => cell.r === r && cell.c === c);
                    if (cellToUnhide) {
                        cellToUnhide.hidden = false;
                        cellToUnhide.rowSpan = 1;
                        cellToUnhide.colSpan = 1;
                    }
                }
            }
        }
    });

    const newTableData = { ...tableData, cells: newCells };
    setTableData(newTableData);
    updateRemoteTable(newTableData);
    setSelectedCells([]);
  };

  const updateAlignment = (align: 'left' | 'center' | 'right') => {
    if (!tableData) return;
    const newCells = tableData.cells.map(cell => {
      const isSelected = selectedCells.some(s => s.r === cell.r && s.c === cell.c);
      return isSelected ? { ...cell, align } : cell;
    });
    const newTableData = { ...tableData, cells: newCells };
    setTableData(newTableData);
    updateRemoteTable(newTableData);
  };
  
  const toggleBold = () => {
    if (!tableData) return;
    const newCells = tableData.cells.map(cell => {
      const isSelected = selectedCells.some(s => s.r === cell.r && s.c === cell.c);
      return isSelected ? { ...cell, fontWeight: cell.fontWeight === 'bold' ? 'normal' : 'bold' } : cell;
    });
    const newTableData = { ...tableData, cells: newCells };
    setTableData(newTableData);
    updateRemoteTable(newTableData);
  };
  
  const updateFontSize = (newSize: number) => {
    if (!tableData || newSize <= 0) return;
    const newCells = tableData.cells.map(cell => {
      const isSelected = selectedCells.some(s => s.r === cell.r && s.c === cell.c);
      return isSelected ? { ...cell, fontSize: newSize } : cell;
    });
    const newTableData = { ...tableData, cells: newCells };
    setTableData(newTableData);
    updateRemoteTable(newTableData);
  };

  const handleSaveTemplate = (name: string) => {
    if (!firestore || !name.trim() || !tableData) return;
    
    if (activeTemplate && activeTemplate.id !== 'main-table') {
        // Update existing
        updateDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/table-templates`, activeTemplate.id), {
            name: name,
            tableData,
        });
        toast({ title: "Template Updated", description: `"${name}" has been updated.` });
        setActiveTemplate(prev => prev ? {...prev, name, tableData} : null);
    } else {
        // Create new
        addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/table-templates`), {
            name,
            tableData,
        });
        toast({ title: "Template Saved", description: `"${name}" has been saved.` });
    }
  };
  
  const updateColWidth = (index: number, newWidth: number) => {
    if (!tableData) return;
    setTableData(prev => {
        if (!prev) return null;
        const newColWidths = [...prev.colWidths];
        newColWidths[index] = newWidth;
        const newTableData = { ...prev, colWidths: newColWidths };
        updateRemoteTable(newTableData);
        return newTableData;
    });
  };

  const updateRowHeight = (index: number, newHeight: number) => {
    if (!tableData) return;
    setTableData(prev => {
        if (!prev) return null;
        const newRowHeights = [...prev.rowHeights];
        newRowHeights[index] = newHeight;
        const newTableData = { ...prev, rowHeights: newRowHeights };
        updateRemoteTable(newTableData);
        return newTableData;
    });
  };
  
  const handleLoadTemplate = (template: TableTemplate) => {
    setActiveTemplate(template);
    setTableData(template.tableData);
  }

  const handleDeleteTemplate = (templateId: string) => {
      if (!firestore) return;
      deleteDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/table-templates`, templateId));
      if (activeTemplate?.id === templateId) {
          setActiveTemplate(null); // Reset to main table
      }
      toast({ title: "Template Deleted" });
  }
  
  const getSelectedCellFontSize = () => {
    if (!tableData || selectedCells.length === 0) return DEFAULT_FONT_SIZE;
    const firstSelectedCell = tableData.cells.find(c => c.r === selectedCells[0].r && c.c === selectedCells[0].c);
    return firstSelectedCell?.fontSize || DEFAULT_FONT_SIZE;
  }

  if (isLoading || !tableData) {
      return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dynamic Table Builder</CardTitle>
          <CardDescription>
            A visual table editor. Click cells to select, then merge/unmerge or align. Drag handles to resize.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className='flex justify-between items-center'>
                <div className="flex gap-2 items-center">
                    {isEditMode && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button onClick={handleMerge} disabled={selectedCells.length < 2} size="sm">Merge</Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Merge selected cells</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                           <Button onClick={handleUnmerge} disabled={selectedCells.length === 0} size="sm">Unmerge</Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Unmerge cells</p></TooltipContent>
                        </Tooltip>
                         <Tooltip>
                          <TooltipTrigger asChild>
                           <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateAlignment('left')} disabled={selectedCells.length === 0}><AlignLeft /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Align Left</p></TooltipContent>
                        </Tooltip>
                         <Tooltip>
                          <TooltipTrigger asChild>
                           <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateAlignment('center')} disabled={selectedCells.length === 0}><AlignCenter /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Align Center</p></TooltipContent>
                        </Tooltip>
                         <Tooltip>
                          <TooltipTrigger asChild>
                           <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateAlignment('right')} disabled={selectedCells.length === 0}><AlignRight /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Align Right</p></TooltipContent>
                        </Tooltip>
                         <Tooltip>
                          <TooltipTrigger asChild>
                           <Button variant="outline" size="icon" className="h-9 w-9" onClick={toggleBold} disabled={selectedCells.length === 0}><Bold /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Toggle Bold</p></TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={getSelectedCellFontSize()}
                            onChange={(e) => updateFontSize(Number(e.target.value))}
                            className="h-9 w-16 text-center"
                            disabled={selectedCells.length === 0}
                          />
                           <div className='flex flex-col'>
                                <Button variant="outline" size="icon" className='h-4 w-5 rounded-b-none' onClick={() => updateFontSize(getSelectedCellFontSize() + 1)} disabled={selectedCells.length === 0}><Plus className="h-3 w-3"/></Button>
                                <Button variant="outline" size="icon" className='h-4 w-5 rounded-t-none' onClick={() => updateFontSize(getSelectedCellFontSize() - 1)} disabled={selectedCells.length === 0}><Minus className="h-3 w-3"/></Button>
                           </div>
                        </div>
                      </TooltipProvider>
                    )}
                </div>
                 <div className="flex items-center space-x-2">
                    <Label htmlFor="edit-mode">Edit Mode</Label>
                    <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
                </div>
            </div>
             <div className='flex gap-2'>
               <SaveAsNewTemplateDialog onSave={handleSaveTemplate} isUpdate={!!activeTemplate && activeTemplate.id !== 'main-table'} currentName={activeTemplate?.name}>
                 <Button>
                   <Save className="mr-2 h-4 w-4" />
                   {activeTemplate && activeTemplate.id !== 'main-table' ? `Save "${activeTemplate.name}"` : 'Save as New Template'}
                 </Button>
               </SaveAsNewTemplateDialog>
                {activeTemplate && (
                    <Button variant="outline" onClick={() => setActiveTemplate(null)}>Load Main Table</Button>
                )}
            </div>
        </CardContent>
      </Card>
      
      <div className="w-full overflow-auto rounded-lg border shadow-sm bg-card p-4">
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            {isEditMode && (
                <thead>
                    <tr>
                        <th className="p-0 border border-border bg-muted/50 sticky left-0 z-10">
                            <div className="w-32 h-10 flex flex-row items-center justify-center">
                                <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => addRow(0)}><PlusCircle className="h-4 w-4" /></Button>
                            </div>
                        </th>
                        {Array.from({ length: tableData.cols }).map((_, colIndex) => (
                            <th
                                key={colIndex}
                                style={{ width: `${tableData.colWidths[colIndex]}px` }}
                                className="p-0 border border-border bg-muted/50 relative"
                            >
                                <div className="h-10 flex items-center justify-center px-1">
                                    <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => deleteColumn(colIndex)}><Trash2 className="h-4 w-4" /></Button>
                                    <SizeInput value={tableData.colWidths[colIndex]} onSave={(newWidth) => updateColWidth(colIndex, newWidth)} />
                                    <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => addColumn(colIndex + 1)}><PlusCircle className="h-4 w-4" /></Button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
            )}
            <tbody>
                {Array.from({ length: tableData.rows }).map((_, rowIndex) => (
                    <tr key={rowIndex} style={{ height: `${tableData.rowHeights[rowIndex]}px` }}>
                        {isEditMode && (
                            <th className="p-0 border border-border bg-muted/50 sticky left-0 z-10">
                               <div className="w-32 h-full flex flex-row items-center justify-center">
                                    <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => deleteRow(rowIndex)}><Trash2 className="h-4 w-4" /></Button>
                                    <SizeInput value={tableData.rowHeights[rowIndex]} onSave={(newHeight) => updateRowHeight(rowIndex, newHeight)} />
                                    <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => addRow(rowIndex + 1)}><PlusCircle className="h-4 w-4" /></Button>
                                </div>
                            </th>
                        )}
                        {tableData.cells
                            .filter(cell => cell.r === rowIndex)
                            .sort((a, b) => a.c - b.c)
                            .map(cell => {
                                if (cell.hidden) return null;
                                const isSelected = selectedCells.some(s => s.r === cell.r && s.c === cell.c);
                                return (
                                <td
                                    key={`${cell.r}-${cell.c}`}
                                    rowSpan={cell.rowSpan}
                                    colSpan={cell.colSpan}
                                    onClick={() => toggleSelect(cell.r, cell.c)}
                                    className={cn(
                                        "p-1 border border-border relative align-top",
                                        isEditMode && "cursor-pointer"
                                    )}
                                    style={{
                                        width: `${tableData.colWidths[cell.c]}px`,
                                        height: `${tableData.rowHeights[cell.r]}px`,
                                        textAlign: cell.align,
                                        fontWeight: cell.fontWeight,
                                        fontSize: `${cell.fontSize || DEFAULT_FONT_SIZE}px`,
                                    }}
                                >
                                    {isSelected && <div className="absolute inset-0 bg-primary/20 pointer-events-none" />}
                                    {isEditMode ? (
                                        <Input
                                            value={cell.content}
                                            onChange={(e) => updateCellContent(cell.r, cell.c, e.target.value)}
                                            onBlur={onBlurContent}
                                            className={cn("h-full w-full border-0 bg-transparent focus-visible:bg-blue-100/20 focus-visible:shadow-[inset_0_0_0_2px_theme(colors.blue.500)] focus-visible:ring-0", cell.fontWeight === 'bold' && 'font-bold')}
                                            style={{ textAlign: cell.align, fontSize: 'inherit' }}
                                        />
                                    ) : (
                                        <div 
                                          className="w-full h-full" 
                                          style={{ textAlign: cell.align, fontWeight: cell.fontWeight, fontSize: 'inherit' }}
                                        >
                                          {cell.content}
                                        </div>
                                    )}
                                </td>
                            )})}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>

      <Card>
        <CardHeader>
            <CardTitle>Saved Templates</CardTitle>
            <CardDescription>Load a previously saved table design.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(savedTemplates || []).filter(t => t.id !== 'main-table').map(template => (
                    <Card key={template.id} className="flex flex-col p-4">
                       <p className="font-semibold mb-2">{template.name}</p>
                       <TablePreview tableData={template.tableData} />
                       <div className="flex gap-2 mt-auto pt-4">
                           <Button className="flex-1" variant="outline" size="sm" onClick={() => handleLoadTemplate(template)}>
                               Load
                           </Button>
                           <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteTemplate(template.id)}>
                               <Trash2 className="h-4 w-4" />
                           </Button>
                       </div>
                    </Card>
                ))}
                 {(savedTemplates || []).filter(t => t.id !== 'main-table').length === 0 && <p className="col-span-full text-center text-muted-foreground py-4">No templates saved yet.</p>}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableBuilderPage;

    