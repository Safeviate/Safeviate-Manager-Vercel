
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Save, Trash2, AlignLeft, AlignCenter, AlignRight, ChevronsUpDown, Bold, Minus, Plus, Unplug, Split } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

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
const MIN_COL_WIDTH = 50;
const MIN_ROW_HEIGHT = 20;

// A controlled, auto-resizing textarea component
const AutoResizingTextarea = ({ value, onChange, onBlur, ...props }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, onBlur: () => void } & React.ComponentProps<'textarea'>) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '0px'; // Temporarily shrink to get the correct scrollHeight
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = scrollHeight + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            rows={1}
            {...props}
        />
    );
};


const TablePreview = ({ tableData }: { tableData: TableData }) => {
    if (!tableData) return null;
  
    return (
      <div className="w-full overflow-auto rounded-lg border my-2">
        <div
          className="grid"
          style={{
            gridTemplateColumns: tableData.colWidths.map(w => `${w}px`).join(' '),
            gridTemplateRows: `repeat(${tableData.rows}, auto)`,
          }}
        >
          {tableData.cells.map(cell => {
            if (cell.hidden) return null;
            return (
              <div
                key={`${cell.r}-${cell.c}`}
                className="p-1 border border-border flex items-center"
                style={{
                  gridRow: `${cell.r + 1} / span ${cell.rowSpan}`,
                  gridColumn: `${cell.c + 1} / span ${cell.colSpan}`,
                  justifyContent: cell.align,
                  fontWeight: cell.fontWeight,
                  fontSize: `${cell.fontSize || DEFAULT_FONT_SIZE}px`,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {cell.content}
              </div>
            );
          })}
        </div>
      </div>
    );
};


const SizeInput = ({ value, onSave, minValue }: { value: number, onSave: (newSize: number) => void, minValue: number }) => {
    const [localValue, setLocalValue] = useState(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleBlur = () => {
        let newSize = parseInt(localValue, 10);
        if (!isNaN(newSize) && newSize >= minValue) {
            onSave(newSize);
        } else {
            onSave(Math.max(minValue, value));
            setLocalValue(String(Math.max(minValue, value)));
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
            min={minValue}
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

  const defaultTableData = useMemo<TableTemplate>(() => ({
    id: 'main-table',
    name: 'Main Table',
    tableData: {
      rows: 3,
      cols: 4,
      cells: Array.from({ length: 3 * 4 }, (_, i) => ({
        r: Math.floor(i / 4),
        c: i % 4,
        content: '',
        rowSpan: 1,
        colSpan: 1,
        align: 'left',
        fontWeight: 'normal',
        fontSize: DEFAULT_FONT_SIZE,
        hidden: false,
      })),
      colWidths: Array(4).fill(DEFAULT_COL_WIDTH),
      rowHeights: Array(3).fill(DEFAULT_ROW_HEIGHT),
    },
  }), []);


  const tableTemplateRef = useMemoFirebase(() => {
    if (!firestore) return null;
    const templateId = activeTemplate ? activeTemplate.id : 'main-table';
    return doc(firestore, 'tenants', tenantId, 'table-templates', templateId);
  }, [firestore, tenantId, activeTemplate]);

  const { data: remoteTableData, isLoading } = useDoc<TableTemplate>(tableTemplateRef, {
      initialData: defaultTableData
  });

  const templatesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/table-templates`)) : null),
    [firestore, tenantId]
  );
  const { data: savedTemplates } = useCollection<TableTemplate>(templatesQuery);

  useEffect(() => {
    if (!isLoading && remoteTableData?.tableData) {
        setTableData(remoteTableData.tableData);
        if (!activeTemplate && remoteTableData.id !== 'main-table') {
            setActiveTemplate(remoteTableData);
        } else if (!activeTemplate && remoteTableData.id === 'main-table' ) {
            setActiveTemplate(null);
        }
    } else if (!isLoading && !remoteTableData) {
        if (tableTemplateRef && tableTemplateRef.id === 'main-table') {
            setDocumentNonBlocking(tableTemplateRef, defaultTableData, { merge: true });
            setTableData(defaultTableData.tableData);
            setActiveTemplate(null);
        }
    }
  }, [remoteTableData, isLoading, activeTemplate, tableTemplateRef, defaultTableData]);
  
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
        const newColWidths = [...prev.colWidths];
        
        newColWidths.splice(index, 0, DEFAULT_COL_WIDTH);

        for (let r = 0; r < prev.rows; r++) {
            const insertionIndex = newCells.findIndex(cell => cell.r > r || (cell.r === r && cell.c >= index));
            const newCell = { r, c: index, content: '', rowSpan: 1, colSpan: 1, align: 'left', fontWeight: 'normal', fontSize: DEFAULT_FONT_SIZE, hidden: false };
            
            if (insertionIndex === -1) {
                newCells.push(newCell);
            } else {
                newCells.splice(insertionIndex, 0, newCell);
            }
        }
        
        for (const cell of newCells) {
            if (cell.c >= index) {
                // Find the original cell to avoid issues with already shifted cells
                const originalCell = prev.cells.find(c => c.r === cell.r && c.c === cell.c - 1);
                if (cell.r === originalCell?.r && cell.c === originalCell?.c + 1) {
                  // already shifted
                } else if(cell.r === newCells.find(c => c.c === index)?.r && cell.c === index){
                  // this is a new cell, do nothing
                }
                else {
                   cell.c += 1;
                }
            }
        }

        const newTableData = { ...prev, cols: newCols, cells: newCells, colWidths: newColWidths };
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

  const handleSplit = () => {
    if (!tableData || selectedCells.length !== 1) return;
    
    const { r: selectedR, c: selectedC } = selectedCells[0];
    const cellToSplit = tableData.cells.find(cell => cell.r === selectedR && cell.c === selectedC);

    if (!cellToSplit || (cellToSplit.rowSpan === 1 && cellToSplit.colSpan === 1)) return;

    const newCells = tableData.cells.map(cell => {
        // Un-hide all the cells within the bounds of the merged cell
        if (
            cell.r >= cellToSplit.r && cell.r < cellToSplit.r + cellToSplit.rowSpan &&
            cell.c >= cellToSplit.c && cell.c < cellToSplit.c + cellToSplit.colSpan
        ) {
            return { ...cell, hidden: false, rowSpan: 1, colSpan: 1 };
        }
        return cell;
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
  
  const isSplitEnabled = useMemo(() => {
    if (!tableData || selectedCells.length !== 1) return false;
    const cell = tableData.cells.find(c => c.r === selectedCells[0].r && c.c === selectedCells[0].c);
    return cell ? (cell.rowSpan > 1 || cell.colSpan > 1) : false;
  }, [tableData, selectedCells]);
  
  const totalTableWidth = useMemo(() => {
    if (!tableData) return 0;
    // 48px is the width of the row header column
    return (isEditMode ? 48 : 0) + tableData.colWidths.reduce((acc, width) => acc + width, 0);
  }, [tableData, isEditMode]);

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
                           <Button onClick={handleSplit} disabled={!isSplitEnabled} size="sm">
                              <Split className="mr-2 h-4 w-4" />
                              Split
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Split selected cell</p></TooltipContent>
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
        <div style={{ width: `${totalTableWidth}px`}}>
            <div
                className="grid"
                style={{
                    gridTemplateColumns: isEditMode ? `48px ${tableData.colWidths.map(w => `${w}px`).join(' ')}` : tableData.colWidths.map(w => `${w}px`).join(' '),
                    gridTemplateRows: isEditMode ? `28px repeat(${tableData.rows}, auto)` : `repeat(${tableData.rows}, auto)`,
                }}
            >
                {isEditMode && (
                <>
                    <div className="row-start-1 col-start-1 sticky top-0 left-0 z-20 bg-muted/50 border border-border"></div>
                    <div
                        className="row-start-1 grid sticky top-0 z-10"
                        style={{ 
                            gridTemplateColumns: 'subgrid',
                            gridColumn: `2 / span ${tableData.cols}`,
                        }}
                    >
                    {Array.from({ length: tableData.cols }).map((_, colIndex) => (
                        <div
                        key={colIndex}
                        className="p-0 border-x border-border bg-muted/50 relative h-7 flex items-center justify-center"
                        >
                        <Button variant="ghost" size="icon" className='h-7 w-7' onClick={() => deleteColumn(colIndex)}><Trash2 className="h-4 w-4" /></Button>
                        <SizeInput value={tableData.colWidths[colIndex]} onSave={(newWidth) => updateColWidth(colIndex, newWidth)} minValue={MIN_COL_WIDTH} />
                        <Button variant="ghost" size="icon" className='h-7 w-7' onClick={() => addColumn(colIndex + 1)}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    </div>
                </>
                )}

                {isEditMode &&
                Array.from({ length: tableData.rows }).map((_, rowIndex) => (
                    <div
                        key={rowIndex}
                        className="p-0 border-t border-border bg-muted/50 sticky left-0 z-10 flex flex-row items-center justify-center"
                        style={{ gridRow: rowIndex + 2 }}
                    >
                        <Button variant="ghost" size="icon" className='h-7 w-7' onClick={() => deleteRow(rowIndex)}><Trash2 className="h-4 w-4" /></Button>
                        <SizeInput value={tableData.rowHeights[rowIndex]} onSave={(newHeight) => updateRowHeight(rowIndex, newHeight)} minValue={MIN_ROW_HEIGHT} />
                        <Button variant="ghost" size="icon" className='h-7 w-7' onClick={() => addRow(rowIndex + 1)}><PlusCircle className="h-4 w-4" /></Button>
                    </div>
                ))}

                {tableData.cells
                    .filter(cell => !cell.hidden)
                    .map(cell => {
                        const isSelected = selectedCells.some(s => s.r === cell.r && s.c === cell.c);
                        const justifyContent = cell.align === 'left' ? 'flex-start' : cell.align === 'right' ? 'flex-end' : 'center';
                        return (
                        <div
                            key={`${cell.r}-${cell.c}`}
                            onClick={() => toggleSelect(cell.r, cell.c)}
                            className={cn(
                                "p-0 relative flex",
                                isEditMode && "cursor-pointer hover:bg-muted/50",
                                "border border-border"
                            )}
                            style={{
                                gridRow: `${cell.r + (isEditMode ? 2 : 1)} / span ${cell.rowSpan}`,
                                gridColumn: `${cell.c + (isEditMode ? 2 : 1)} / span ${cell.colSpan}`,
                                justifyContent,
                                alignItems: 'center',
                                minHeight: `${tableData.rowHeights[cell.r]}px`,
                            }}
                        >
                            {isEditMode ? (
                                <AutoResizingTextarea
                                    value={cell.content}
                                    onChange={(e) => updateCellContent(cell.r, cell.c, e.target.value)}
                                    onBlur={onBlurContent}
                                    className="w-full h-full p-1 bg-transparent border-none resize-none overflow-hidden focus:outline-none focus:ring-0"
                                    style={{
                                        fontWeight: cell.fontWeight,
                                        fontSize: `${cell.fontSize || DEFAULT_FONT_SIZE}px`,
                                        textAlign: cell.align,
                                    }}
                                />
                            ) : (
                                <div className='p-1 whitespace-pre-wrap' style={{wordBreak: 'break-word', fontWeight: cell.fontWeight, fontSize: `${cell.fontSize || DEFAULT_FONT_SIZE}px`, textAlign: cell.align}}>{cell.content}</div>
                            )}
                            {isSelected && <div className="absolute inset-0 bg-primary/20 pointer-events-none" />}
                        </div>
                    )})}
            </div>
        </div>
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
                           <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteTemplate(template.id)}>
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
