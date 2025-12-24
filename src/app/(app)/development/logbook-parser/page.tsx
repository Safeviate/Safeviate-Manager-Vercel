
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, ClipboardPaste, Wand2, Table, Trash2, PlusCircle, Save, X, GripVertical } from 'lucide-react';
import { parseLogbook, type LogbookColumn } from '@/ai/flows/parse-logbook-flow';
import Image from 'next/image';
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';


// --- Types ---
interface HeaderCell {
  id: string;
  label: string;
  colSpan: number;
  rowSpan: number;
}

export interface LogbookTemplate {
    id: string;
    name: string;
    columns: LogbookColumn[];
}

// --- Recursive calculation for table spans ---
const calculateSpans = (columns: LogbookColumn[]): { headerRows: HeaderCell[][], totalCols: number } => {
  if (!columns || columns.length === 0) {
    return { headerRows: [], totalCols: 0 };
  }

  const rows: HeaderCell[][] = [];

  function processColumns(cols: LogbookColumn[], level: number): { maxLevel: number, totalSubCols: number } {
    if (!rows[level]) {
      rows[level] = [];
    }
    let maxLevel = level;
    let totalSubCols = 0;

    for (const col of cols) {
      const cell: HeaderCell = { id: col.id, label: col.label, colSpan: 1, rowSpan: 1 };
      rows[level].push(cell);

      if (col.subColumns && col.subColumns.length > 0) {
        const subResult = processColumns(col.subColumns, level + 1);
        cell.colSpan = subResult.totalSubCols;
        maxLevel = Math.max(maxLevel, subResult.maxLevel);
        totalSubCols += subResult.totalSubCols;
      } else {
        totalSubCols += 1;
      }
    }
    
    return { maxLevel, totalSubCols };
  }

  const { maxLevel } = processColumns(columns, 0);

  // Adjust rowSpans for cells that don't have subColumns
  for (let i = 0; i < rows.length; i++) {
    for (const cell of rows[i]) {
      const findCol = (cols: LogbookColumn[], id: string): LogbookColumn | undefined => {
        for (const c of cols) {
          if (c.id === id) return c;
          if (c.subColumns) {
            const found = findCol(c.subColumns, id);
            if (found) return found;
          }
        }
        return undefined;
      };
      const colData = findCol(columns, cell.id);
      if (colData && (!colData.subColumns || colData.subColumns.length === 0)) {
        cell.rowSpan = maxLevel - i + 1;
      }
    }
  }

  return { headerRows: rows, totalCols: rows[0]?.reduce((acc, cell) => acc + cell.colSpan, 0) || 0 };
};

// --- Editable Table Preview Component ---
const TablePreview = ({ columns, setColumns }: { columns: LogbookColumn[], setColumns: (cols: LogbookColumn[]) => void }) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleLabelChange = (id: string, newLabel: string) => {
    const updateRecursively = (cols: LogbookColumn[]): LogbookColumn[] => {
      return cols.map(col => {
        if (col.id === id) {
          return { ...col, label: newLabel };
        }
        if (col.subColumns) {
          return { ...col, subColumns: updateRecursively(col.subColumns) };
        }
        return col;
      });
    };
    setColumns(updateRecursively(columns));
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableHeaderCellElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>, index: number) => {
    e.preventDefault(); // This is necessary to allow a drop
    dragOverItem.current = index;
    e.currentTarget.classList.add('bg-primary/20', 'border-primary');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
    e.currentTarget.classList.remove('bg-primary/20', 'border-primary');
  }

  const handleDrop = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
    e.currentTarget.classList.remove('bg-primary/20', 'border-primary');
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const newColumns = [...columns];
    const draggedItemContent = newColumns.splice(dragItem.current, 1)[0];
    newColumns.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;

    setColumns(newColumns);
  };
  
  const { headerRows, totalCols } = calculateSpans(columns);

  if (!headerRows || headerRows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm text-left text-gray-500 table-fixed">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          {headerRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const isTopLevelDraggable = rowIndex === 0;
                return (
                  <th
                    key={cell.id}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    className={cn("px-1 py-1 border relative group transition-colors", isTopLevelDraggable && "cursor-move")}
                    draggable={isTopLevelDraggable}
                    onDragStart={(e) => isTopLevelDraggable && handleDragStart(e, cellIndex)}
                    onDragOver={(e) => isTopLevelDraggable && handleDragOver(e, cellIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => isTopLevelDraggable && handleDrop(e)}
                  >
                      <div className="flex items-center justify-center">
                          {isTopLevelDraggable && <GripVertical className="h-4 w-4 text-muted-foreground absolute left-1 top-1/2 -translate-y-1/2" />}
                          <Input
                              value={cell.label}
                              onChange={(e) => handleLabelChange(cell.id, e.target.value)}
                              className="bg-transparent border-none text-center font-semibold text-gray-700 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white"
                          />
                      </div>
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          <tr className="bg-white border-b">
            <td colSpan={totalCols} className="px-6 py-12 text-center text-muted-foreground">
              (Logbook entries would appear here)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};


// --- Main Page Component ---
export default function LogbookParserPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [parsedStructure, setParsedStructure] = useState<LogbookColumn[] | null>(null);
  const [templateName, setTemplateName] = useState('');

  const templatesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/logbook-templates`) : null),
    [firestore, tenantId]
  );
  const { data: savedTemplates, isLoading: isLoadingTemplates } = useCollection<LogbookTemplate>(templatesQuery);

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPastedImage(e.target?.result as string);
            setParsedStructure(null); // Clear previous result
            toast({ title: 'Image Pasted', description: 'The logbook image has been loaded.' });
          };
          reader.readAsDataURL(blob);
        }
        return;
      }
    }
  }, [toast]);

  const handleProcess = async () => {
    if (!pastedImage) {
      toast({ variant: 'destructive', title: 'No Image', description: 'Please paste an image of the logbook table.' });
      return;
    }

    setIsProcessing(true);
    setParsedStructure(null);

    try {
      const result = await parseLogbook({ image: pastedImage });
      if (!result.columns || result.columns.length === 0) {
        toast({ variant: 'destructive', title: 'Parsing Failed', description: 'The AI could not identify a table structure.' });
      } else {
        setParsedStructure(result.columns);
        toast({ title: 'Structure Parsed', description: 'The logbook table structure has been extracted and is now editable.' });
      }
    } catch (error: any) {
      console.error('Error parsing logbook:', error);
      toast({ variant: 'destructive', title: 'Processing Failed', description: error.message || 'An unknown error occurred.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!firestore || !parsedStructure) return;
    if (!templateName.trim()) {
        toast({ variant: 'destructive', title: 'Name required', description: 'Please enter a name for the template.' });
        return;
    }

    const templatesCollection = collection(firestore, `tenants/${tenantId}/logbook-templates`);
    addDocumentNonBlocking(templatesCollection, { name: templateName, columns: parsedStructure });
    
    toast({ title: 'Template Saved', description: `Template "${templateName}" has been saved.`});
    setTemplateName('');
  };

  const handleClearImage = () => {
    setPastedImage(null);
    setParsedStructure(null);
  };
  
  const handleDeleteTemplate = (templateId: string) => {
    if (!firestore) return;
    const templateRef = doc(firestore, `tenants/${tenantId}/logbook-templates`, templateId);
    deleteDocumentNonBlocking(templateRef);
    toast({ title: 'Template Deleted', description: 'The logbook template is being deleted.' });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full items-start">
        <Card>
          <CardHeader>
            <CardTitle>Logbook Parser</CardTitle>
            <CardDescription>
              Paste an image of a logbook page to parse its column structure. You can then edit the structure and save it as a template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onPaste={handlePaste}
              className="h-60 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/20"
            >
              {pastedImage ? (
                <Image src={pastedImage} alt="Pasted logbook" width={400} height={240} className="max-h-full max-w-full object-contain rounded-md" />
              ) : (
                <div className="text-center">
                  <ClipboardPaste className="mx-auto h-10 w-10" />
                  <p className="mt-2">Click here and paste an image (Ctrl+V)</p>
                </div>
              )}
            </div>
            {pastedImage && (
              <div className="flex gap-2">
                <Button onClick={handleProcess} disabled={isProcessing} className="w-full">
                  {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Wand2 className="mr-2 h-4 w-4"/>Parse Structure</>}
                </Button>
                <Button onClick={handleClearImage} variant="outline" size="icon">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear image</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Structure Preview</CardTitle>
            <CardDescription>A visual, editable representation of the parsed table header structure.</CardDescription>
          </CardHeader>
          <CardContent>
            {isProcessing ? (
               <div className="h-48 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
               </div>
            ) : parsedStructure ? (
                <>
                    <TablePreview columns={parsedStructure} setColumns={setParsedStructure} />
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="mt-4 w-full">
                                <Save className="mr-2 h-4 w-4" /> Save as Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Save Logbook Template</DialogTitle>
                                <DialogDescription>Give this logbook structure a name to save it for later use.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Input 
                                    placeholder="e.g., Standard PPL Logbook"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                <DialogClose asChild>
                                    <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>Save Template</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            ) : (
              <div className="h-48 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Table className="h-8 w-8 mr-2" />
                <p>The parsed table structure will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Saved Logbook Templates</CardTitle>
            <CardDescription>A list of all saved logbook templates.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingTemplates ? <p>Loading templates...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(savedTemplates || []).map(template => (
                        <Card key={template.id} className="flex items-center justify-between p-4">
                           <p className="font-semibold">{template.name}</p>
                           <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteTemplate(template.id)}>
                               <Trash2 className="h-4 w-4" />
                           </Button>
                        </Card>
                    ))}
                     {(savedTemplates || []).length === 0 && <p className="col-span-full text-center text-muted-foreground py-4">No templates saved yet.</p>}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
