
'use client';

import { useState, useMemo, MouseEvent, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useDebounce } from '@/hooks/use-debounce';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Minus, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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

type TableTemplate = {
    id: string;
    name: string;
    tableData: TableData;
}

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

const PublishDialog = ({ template }: { template: TableTemplate }) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const [selectedPage, setSelectedPage] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // In a real app, this would come from a config or another Firestore collection.
    const availablePages = [{ id: 'my-dashboard', name: 'My Dashboard' }];

    const handlePublish = () => {
        if (!firestore || !selectedPage) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a page to publish to.' });
            return;
        }

        const publishedTableRef = doc(firestore, `tenants/${tenantId}/published-tables`, selectedPage);
        const dataToPublish = {
            pageId: selectedPage,
            tableData: template.tableData,
        };

        setDocumentNonBlocking(publishedTableRef, dataToPublish, { merge: true });

        toast({
            title: 'Table Published',
            description: `Template "${template.name}" has been published to "${selectedPage}".`,
        });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="secondary"><Upload className="mr-2 h-4 w-4" /> Publish</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Publish &quot;{template.name}&quot;</DialogTitle>
                    <DialogDescription>
                        Publishing this table will make it live on the selected page, replacing any existing table.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="destination-page">Destination Page</Label>
                    <Select onValueChange={setSelectedPage} value={selectedPage}>
                        <SelectTrigger id="destination-page">
                            <SelectValue placeholder="Select a page..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availablePages.map(page => (
                                <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handlePublish} disabled={!selectedPage}>
                        Confirm & Publish
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function TableBuilderPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const [tableData, setTableData] = useState<TableData>(() => createInitialTable(5, 5));
  const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(true);
  const [templateName, setTemplateName] = useState('');

  const debouncedTableData = useDebounce(tableData, 500);

  const templatesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/table-templates`) : null),
    [firestore, tenantId]
  );
  const { data: savedTemplates, isLoading: isLoadingTemplates } = useCollection<TableTemplate>(templatesQuery);

  const resizeHandleRef = useRef<{ type: 'col' | 'row', index: number, initialPos: number, initialSize: number } | null>(null);

  const { rows, cols, cells, colWidths, rowHeights } = tableData;

  const getCell = (r: number, c: number) => cells.find(cell => cell.r === r && cell.c === c);

  const addRow = () => {
    setTableData(prev => {
        const newRows = prev.rows + 1;
        const newCells = [...prev.cells];
        for (let c = 0; c < prev.cols; c++) {
            newCells.push({ r: newRows - 1, c, rowSpan: 1, colSpan: 1, hidden: false, content: '' });
        }
        return {
            ...prev,
            rows: newRows,
            cells: newCells,
            rowHeights: [...prev.rowHeights, 48],
        };
    });
  };

  const removeRow = () => {
      if (rows <= 1) return;
      setTableData(prev => {
          const newRows = prev.rows - 1;
          return {
              ...prev,
              rows: newRows,
              cells: prev.cells.filter(cell => cell.r < newRows),
              rowHeights: prev.rowHeights.slice(0, -1),
          };
      });
  };

  const addColumn = () => {
      setTableData(prev => {
          const newCols = prev.cols + 1;
          const newCells = [...prev.cells];
          for (let r = 0; r < prev.rows; r++) {
              newCells.push({ r, c: newCols - 1, rowSpan: 1, colSpan: 1, hidden: false, content: '' });
          }

          return {
              ...prev,
              cols: newCols,
              cells: newCells,
              colWidths: [...prev.colWidths, 120],
          };
      });
  };

  const removeColumn = () => {
      if (cols <= 1) return;
      setTableData(prev => {
          const newCols = prev.cols - 1;
          return {
              ...prev,
              cols: newCols,
              cells: prev.cells.filter(cell => cell.c < newCols),
              colWidths: prev.colWidths.slice(0, -1),
          };
      });
  };
  
  const handleCellClick = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const cell = getCell(r, c);
    if (!cell || cell.hidden || !isEditing) return;
  
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
    const selectionKeys = Object.keys(selectedCells).filter(key => selectedCells[key]);
    if (selectionKeys.length < 2) {
        toast({ variant: "destructive", title: "Invalid Selection", description: "Select at least two cells to merge." });
        return;
    }

    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
    selectionKeys.forEach(key => {
        const [r, c] = key.split('-').map(Number);
        const cell = getCell(r, c);
        if (cell && !cell.hidden) {
            minR = Math.min(minR, r);
            minC = Math.min(minC, c);
            maxR = Math.max(maxR, r + cell.rowSpan - 1);
            maxC = Math.max(maxC, c + cell.colSpan - 1);
        }
    });

    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            let isCellInSelection = false;
            for (const key of selectionKeys) {
                const [selR, selC] = key.split('-').map(Number);
                 const selectedCell = getCell(selR, selC);
                 if (selectedCell && r >= selR && r < selR + selectedCell.rowSpan && c >= selC && c < selC + selectedCell.colSpan) {
                    isCellInSelection = true;
                     break;
                 }
            }
            if(!isCellInSelection){
                 toast({ variant: "destructive", title: "Invalid Merge", description: "Selection must form a solid rectangle." });
                 return;
            }
        }
    }


    const newCells = cells.map(cell => ({ ...cell }));
    const newRowSpan = maxR - minR + 1;
    const newColSpan = maxC - minC + 1;
    
    const topLeftCell = newCells.find(c => c.r === minR && c.c === minC);
    if (!topLeftCell) return;

    topLeftCell.rowSpan = newRowSpan;
    topLeftCell.colSpan = newColSpan;
    topLeftCell.hidden = false;

    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            if (r === minR && c === minC) continue;
            const cellToHide = newCells.find(cell => cell.r === r && cell.c === c);
            if (cellToHide) {
                cellToHide.hidden = true;
                cellToHide.rowSpan = 1; 
                cellToHide.colSpan = 1;
            }
        }
    }

    setTableData(prev => ({ ...prev, cells: newCells }));
    setSelectedCells({});
    toast({ title: 'Cells Merged' });
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
  
  const handleSaveTemplate = () => {
    if (!firestore || !templateName.trim()) {
        toast({ variant: 'destructive', title: 'Missing Name', description: 'Please provide a name for the template.' });
        return;
    }
    const templatesCollection = collection(firestore, `tenants/${tenantId}/table-templates`);
    addDocumentNonBlocking(templatesCollection, { name: templateName, tableData });
    toast({ title: 'Template Saved', description: `Template "${templateName}" has been saved.` });
    setTemplateName('');
  };

  const handleLoadTemplate = (template: TableTemplate) => {
    setTableData(template.tableData);
    setSelectedCells({});
    toast({ title: 'Template Loaded', description: `Template "${template.name}" has been loaded.` });
  }

  const handleDeleteTemplate = (templateId: string) => {
    if (!firestore) return;
    const templateRef = doc(firestore, `tenants/${tenantId}/table-templates`, templateId);
    deleteDocumentNonBlocking(templateRef);
    toast({ title: 'Template Deleted' });
  };


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
                    <Label>Rows ({rows})</Label>
                    <Button size="icon" variant="outline" onClick={addRow}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={removeRow} disabled={rows <= 1}><Minus className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-2">
                    <Label>Columns ({cols})</Label>
                    <Button size="icon" variant="outline" onClick={addColumn}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={removeColumn} disabled={cols <= 1}><Minus className="h-4 w-4" /></Button>
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
                onClick={() => handleCellClick(cell.r, cell.c)}
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
         {isEditing && Array.from({ length: cols }).map((_, index) => {
            const isAligned = index > 0 && Math.abs(colWidths[index] - colWidths[index - 1]) < 1;
            return (
                <div 
                    key={`col-handle-${index}`}
                    className={cn(
                        "absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50",
                         isAligned && "bg-blue-500"
                    )}
                    style={{ left: `${colWidths.slice(0, index + 1).reduce((a, b) => a + b, 0) - 1.5}px`}}
                    onMouseDown={(e) => handleMouseDown(e, 'col', index)}
                />
            )
          })}
          {isEditing && Array.from({ length: rows }).map((_, index) => {
            const isAligned = index > 0 && Math.abs(rowHeights[index] - rowHeights[index - 1]) < 1;
            return (
                <div 
                    key={`row-handle-${index}`}
                    className={cn(
                        "absolute left-0 right-0 h-1.5 cursor-row-resize hover:bg-primary/50",
                         isAligned && "bg-blue-500"
                    )}
                    style={{ top: `${rowHeights.slice(0, index + 1).reduce((a, b) => a + b, 0) - 1.5}px`}}
                    onMouseDown={(e) => handleMouseDown(e, 'row', index)}
                />
            )
          })}
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Save & Load Templates</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
            <div className="flex gap-2">
                <Input placeholder="New template name..." value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>Save Current as Template</Button>
            </div>
             <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Saved Templates</h4>
                {isLoadingTemplates ? (
                    <p>Loading templates...</p>
                ) : (savedTemplates?.length ?? 0) > 0 ? (
                    <ScrollArea className='h-40 rounded-md border p-2'>
                        <div className="space-y-2">
                            {savedTemplates?.map(template => (
                                <div key={template.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                                    <span className="font-medium">{template.name}</span>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(template)}>Load</Button>
                                        <PublishDialog template={template} />
                                        <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => handleDeleteTemplate(template.id)}>
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <p className='text-sm text-muted-foreground text-center py-4'>No templates saved yet.</p>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
