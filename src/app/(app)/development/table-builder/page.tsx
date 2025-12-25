
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PlusCircle, Trash2, Save, AlignLeft, AlignCenter, AlignRight, Merge, Unplug } from 'lucide-react';

// --- Types ---
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

const DEFAULT_COL_WIDTH = 144; // 9rem
const DEFAULT_ROW_HEIGHT = 40; // 2.5rem


// --- Initial Data Helper ---
const createInitialTableData = (rows: number, cols: number): TableData => {
    const cells: Cell[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push({
                r, c,
                content: ``,
                rowSpan: 1,
                colSpan: 1,
                align: 'left',
                hidden: false,
            });
        }
    }
    return { 
        rows, 
        cols, 
        cells,
        colWidths: Array(cols).fill(DEFAULT_COL_WIDTH),
        rowHeights: Array(rows).fill(DEFAULT_ROW_HEIGHT),
    };
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
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsOpen(true); }}>
                {children}
            </DropdownMenuItem>
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


const SaveButton = ({ isTemplateLoaded, onSaveAs, onUpdate }: { isTemplateLoaded: boolean, onSaveAs: (name: string) => void, onUpdate: () => void }) => {
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
                        Save as New Template...
                    </SaveAsNewTemplateDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
       <Dialog>
         <DialogTrigger asChild>
            <Button>
              <Save className="mr-2" />
              Save as New Template
            </Button>
         </DialogTrigger>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Save as New Template</DialogTitle>
             <DialogDescription>Give your new table template a name.</DialogDescription>
           </DialogHeader>
           <SaveAsNewTemplateDialog onSave={onSaveAs}>
             <Input placeholder="e.g., Weekly Report" />
           </SaveAsNewTemplateDialog>
         </DialogContent>
       </Dialog>
    );
};

// --- Main Page Component ---
const TableBuilderPage = () => {
    const [tableData, setTableData] = useState<TableData>(() => createInitialTableData(5, 5));
    const [selection, setSelection] = useState<{ start: { r: number, c: number } | null, end: { r: number, c: number } | null }>({ start: null, end: null });
    const [isSelecting, setIsSelecting] = useState(false);
    const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);

    // Resizing state
    const [resizingCol, setResizingCol] = useState<number | null>(null);
    const [resizingRow, setResizingRow] = useState<number | null>(null);
    const tableRef = useRef<HTMLTableElement>(null);


    const firestore = useFirestore();
    const { toast } = useToast();
    const tenantId = 'safeviate';

    const templatesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, `tenants/${tenantId}/table-templates`) : null),
        [firestore, tenantId]
    );
    const { data: savedTemplates, isLoading: isLoadingTemplates } = useCollection<TableTemplate>(templatesQuery);
    
    // --- Resizing Logic ---
    const handleColResizeStart = (e: React.MouseEvent, colIndex: number) => {
        e.preventDefault();
        setResizingCol(colIndex);
    };

    const handleRowResizeStart = (e: React.MouseEvent, rowIndex: number) => {
        e.preventDefault();
        setResizingRow(rowIndex);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingCol !== null) {
                const newWidth = e.clientX - (tableRef.current?.rows[0]?.cells[resizingCol + 1]?.getBoundingClientRect().left || 0);
                setTableData(prev => {
                    const newColWidths = [...prev.colWidths];
                    newColWidths[resizingCol] = Math.max(40, newWidth); // min width
                    return { ...prev, colWidths: newColWidths };
                });
            }
            if (resizingRow !== null && tableRef.current?.rows[resizingRow + 1]) {
                const newHeight = e.clientY - (tableRef.current.rows[resizingRow + 1].getBoundingClientRect().top || 0);
                 setTableData(prev => {
                    const newRowHeights = [...prev.rowHeights];
                    newRowHeights[resizingRow] = Math.max(20, newHeight); // min height
                    return { ...prev, rowHeights: newRowHeights };
                });
            }
        };

        const handleMouseUp = () => {
            setResizingCol(null);
            setResizingRow(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingCol, resizingRow]);

    // --- Cell & Selection Logic ---
    const getCell = (r: number, c: number) => {
        return tableData.cells.find(cell => cell.r === r && cell.c === c);
    };

    const handleMouseDown = (r: number, c: number) => {
        setIsSelecting(true);
        setSelection({ start: { r, c }, end: { r, c } });
    };

    const handleMouseOver = (r: number, c: number) => {
        if (isSelecting && selection.start) {
            setSelection(prev => ({ ...prev, end: { r, c } }));
        }
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
    };

    const isCellSelected = (r: number, c: number) => {
        if (!selection.start || !selection.end) return false;
        const { start, end } = selection;
        const minR = Math.min(start.r, end.r);
        const maxR = Math.max(start.r, end.r);
        const minC = Math.min(start.c, end.c);
        const maxC = Math.max(start.c, end.c);
        return r >= minR && r <= maxR && c >= minC && c <= maxC;
    };
    
    // --- Grid Modification Logic ---
    const updateCellContent = (r: number, c: number, content: string) => {
        const newCells = tableData.cells.map(cell => 
            (cell.r === r && cell.c === c) ? { ...cell, content } : cell
        );
        setTableData({ ...tableData, cells: newCells });
    };

    const addRow = () => {
        const newRowIndex = tableData.rows;
        const newCells: Cell[] = [];
        for (let c = 0; c < tableData.cols; c++) {
            newCells.push({ r: newRowIndex, c, content: '', rowSpan: 1, colSpan: 1, align: 'left', hidden: false });
        }
        setTableData(prev => ({
            rows: prev.rows + 1,
            cols: prev.cols,
            cells: [...prev.cells, ...newCells],
            colWidths: prev.colWidths,
            rowHeights: [...prev.rowHeights, DEFAULT_ROW_HEIGHT],
        }));
    };

    const addColumn = () => {
        const newColIndex = tableData.cols;
        const newCells: Cell[] = [];
        for (let r = 0; r < tableData.rows; r++) {
            newCells.push({ r, c: newColIndex, content: '', rowSpan: 1, colSpan: 1, align: 'left', hidden: false });
        }
        setTableData(prev => ({
            rows: prev.rows,
            cols: prev.cols + 1,
            cells: [...prev.cells, ...newCells],
            colWidths: [...prev.colWidths, DEFAULT_COL_WIDTH],
            rowHeights: prev.rowHeights,
        }));
    };

    // --- Template & Firestore Logic ---
    const handleSaveTemplate = (name: string, idToUpdate?: string) => {
        if (!firestore) return;

        const templateData = { name, tableData };

        if (idToUpdate) {
            const templateRef = doc(firestore, `tenants/${tenantId}/table-templates`, idToUpdate);
            updateDocumentNonBlocking(templateRef, templateData);
            toast({ title: "Template Updated", description: `Template "${name}" has been updated.` });
        } else {
            const templatesCollection = collection(firestore, `tenants/${tenantId}/table-templates`);
            addDocumentNonBlocking(templatesCollection, templateData).then((docRef) => {
                if(docRef) setLoadedTemplateId(docRef.id);
            });
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
      if (loadedTemplateId === templateId) {
          setLoadedTemplateId(null);
          setTableData(createInitialTableData(5,5)); // Reset to blank slate
      }
    };

    const handleLoadTemplate = (template: TableTemplate) => {
        setTableData(template.tableData);
        setLoadedTemplateId(template.id);
        toast({ title: "Template Loaded", description: `Template "${template.name}" has been loaded.` });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Dynamic Table Builder</CardTitle>
                    <CardDescription>
                        Click and drag to select cells. Use the controls to merge, align, and format your table. Drag the borders of the headers to resize.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={addRow}><PlusCircle className="mr-2" /> Add Row</Button>
                        <Button onClick={addColumn}><PlusCircle className="mr-2" /> Add Column</Button>
                        <Button variant="outline"><Merge className="mr-2" /> Merge</Button>
                        <Button variant="outline"><Unplug className="mr-2" /> Unmerge</Button>
                        <Button variant="outline"><AlignLeft className="mr-2" /> Left</Button>
                        <Button variant="outline"><AlignCenter className="mr-2" /> Center</Button>
                        <Button variant="outline"><AlignRight className="mr-2" /> Right</Button>
                    </div>
                     <SaveButton
                        isTemplateLoaded={!!loadedTemplateId}
                        onSaveAs={(name) => handleSaveTemplate(name)}
                        onUpdate={handleUpdateCurrentTemplate}
                    />
                </CardContent>
            </Card>

            <div className="w-full overflow-auto rounded-lg border shadow-sm" onMouseUp={handleMouseUp}>
                <table ref={tableRef} className="border-collapse bg-white" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '40px' }} />
                        {tableData.colWidths.map((width, index) => (
                            <col key={index} style={{ width: `${width}px` }} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 w-[40px] bg-gray-100 border border-gray-300"></th>
                            {Array.from({ length: tableData.cols }).map((_, colIndex) => (
                                <th key={colIndex} className="p-1 border border-gray-300 bg-gray-50 text-center text-xs relative" style={{width: `${tableData.colWidths[colIndex]}px`}}>
                                    {String.fromCharCode(65 + colIndex)}
                                    <div
                                        onMouseDown={(e) => handleColResizeStart(e, colIndex)}
                                        className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-blue-500/20 hover:bg-blue-500"
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: tableData.rows }).map((_, r) => (
                            <tr key={r} style={{height: `${tableData.rowHeights[r]}px`}}>
                                <td className="sticky left-0 z-10 text-center text-xs text-gray-500 bg-gray-100 border border-gray-300 w-[40px] relative">
                                    {r + 1}
                                     <div
                                        onMouseDown={(e) => handleRowResizeStart(e, r)}
                                        className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize bg-blue-500/20 hover:bg-blue-500"
                                    />
                                </td>
                                {Array.from({ length: tableData.cols }).map((_, c) => {
                                    const cell = getCell(r, c);
                                    if (!cell || cell.hidden) return null;
                                    
                                    return (
                                        <td
                                            key={`${r}-${c}`}
                                            rowSpan={cell.rowSpan}
                                            colSpan={cell.colSpan}
                                            onMouseDown={() => handleMouseDown(r, c)}
                                            onMouseOver={() => handleMouseOver(r, c)}
                                            className={cn(
                                                "border border-gray-300 p-0 relative",
                                                isCellSelected(r,c) && "bg-blue-100/50"
                                            )}
                                        >
                                            <Input
                                                value={cell.content}
                                                onChange={(e) => updateCellContent(r, c, e.target.value)}
                                                className={cn(
                                                  "w-full h-full border-none p-2 bg-transparent focus:shadow-[inset_0_0_0_2px_#1a73e8] focus:z-10",
                                                  `text-${cell.align}`
                                                )}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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

    