'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Loader2, 
    ClipboardPaste, 
    Wand2, 
    Table, 
    Trash2, 
    PlusCircle, 
    Save, 
    X, 
    GripVertical, 
    Sparkles,
    Eye,
    ChevronDown,
    LayoutGrid,
    FileType,
    ScanLine
} from 'lucide-react';
import { callAiFlow } from '@/lib/ai-client';
import type { ParseLogbookOutput, LogbookColumn } from '@/ai/flows/parse-logbook-flow';
import Image from 'next/image';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter, 
    DialogTrigger, 
    DialogClose 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    e.preventDefault();
    dragOverItem.current = index;
    e.currentTarget.classList.add('bg-primary/5', 'border-primary/50');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
    e.currentTarget.classList.remove('bg-primary/5', 'border-primary/50');
  }

  const handleDrop = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
    e.currentTarget.classList.remove('bg-primary/5', 'border-primary/50');
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
    <div className="overflow-x-auto rounded-[2rem] border-2 border-slate-100 bg-background shadow-inner">
      <table className="w-full text-xs text-left table-fixed border-collapse">
        <thead className="bg-muted/5 uppercase tracking-widest text-primary">
          {headerRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => {
                const isTopLevelDraggable = rowIndex === 0;
                return (
                  <th
                    key={cell.id}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    className={cn(
                        "px-2 py-4 border-2 border-slate-50 relative group transition-all text-center", 
                        isTopLevelDraggable && "cursor-grab active:cursor-grabbing",
                        isTopLevelDraggable ? "bg-muted/10" : ""
                    )}
                    draggable={isTopLevelDraggable}
                    onDragStart={(e) => isTopLevelDraggable && handleDragStart(e, cellIndex)}
                    onDragOver={(e) => isTopLevelDraggable && handleDragOver(e, cellIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => isTopLevelDraggable && handleDrop(e)}
                  >
                      <div className="flex flex-col items-center justify-center gap-2">
                          {isTopLevelDraggable && (
                              <Badge variant="outline" className="text-[8px] font-black opacity-30 border-0 p-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="h-3 w-3" />
                              </Badge>
                          )}
                          <Input
                              value={cell.label}
                              onChange={(e) => handleLabelChange(cell.id, e.target.value)}
                              className="h-8 bg-transparent border-none text-center font-black uppercase text-[10px] tracking-widest text-slate-700 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white rounded-lg shadow-none"
                          />
                      </div>
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          <tr className="bg-white">
            <td colSpan={totalCols} className="px-6 py-20 text-center text-muted-foreground bg-muted/5 opacity-50">
                <div className="flex flex-col items-center gap-3">
                    <Table className="h-10 w-10 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-[10px]">Logical Grid Mapping Established</p>
                </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};


// --- Main Page Component ---
export default function LogbookParserPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [parsedStructure, setParsedStructure] = useState<LogbookColumn[] | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<LogbookTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadTemplates = async () => {
        try {
            const response = await fetch('/api/logbook-templates', { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!cancelled && Array.isArray(payload?.templates)) {
                setSavedTemplates(payload.templates);
            }
        } catch (e) {
            console.error('Failed to load logbook templates', e);
        } finally {
            if (!cancelled) setIsLoadingTemplates(false);
        }
    };

    void loadTemplates();
    return () => {
        cancelled = true;
    };
  }, []);

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPastedImage(e.target?.result as string);
            setParsedStructure(null);
            toast({ title: 'Axiom Vision Engaged', description: 'Logbook frame captured for synthesis.' });
          };
          reader.readAsDataURL(blob);
        }
        return;
      }
    }
  }, [toast]);

  const handleProcess = async () => {
    if (!pastedImage) {
      toast({ variant: 'destructive', title: 'Input Missing', description: 'Focus and use Ctrl+V to engage Axiom Vision.' });
      return;
    }

    setIsProcessing(true);
    setParsedStructure(null);

    try {
      const result = await callAiFlow<{ image: string }, ParseLogbookOutput>(
        'parseLogbook',
        { image: pastedImage }
      );
      if (!result.columns || result.columns.length === 0) {
        toast({ variant: 'destructive', title: 'Synthesis Zero', description: 'No logical grid structures identified.' });
      } else {
        setParsedStructure(result.columns);
        toast({ title: 'Logic Mapped', description: `Identified ${result.columns.length} structural headers.` });
      }
    } catch (error: any) {
      console.error('Error parsing logbook:', error);
      toast({ variant: 'destructive', title: 'System Error', description: error.message || 'Unknown fault during synthesis.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!parsedStructure) return;
    if (!templateName.trim()) {
        toast({ variant: 'destructive', title: 'Label Required', description: 'Please provide a unique label for this grid.' });
        return;
    }

    const newTemplate: LogbookTemplate = {
        id: crypto.randomUUID(),
        name: templateName,
        columns: parsedStructure
    };

    const nextTemplates = [newTemplate, ...savedTemplates];

    fetch('/api/logbook-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: nextTemplates }),
    }).catch((error) => {
      console.error('Failed to save logbook template', error);
    });

    setSavedTemplates(nextTemplates);
    toast({ title: 'Logic Persistent', description: `Grid schema "${templateName}" saved to local registry.`});
    setTemplateName('');
  };

  const handleClearImage = () => {
    setPastedImage(null);
    setParsedStructure(null);
  };
  
  const handleDeleteTemplate = (templateId: string) => {
    const nextTemplates = savedTemplates.filter(t => t.id !== templateId);

    fetch('/api/logbook-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: nextTemplates }),
    }).catch((error) => {
      console.error('Failed to delete logbook template', error);
    });

    setSavedTemplates(nextTemplates);
    toast({ title: 'Registry Purged' });
  }

  return (
    <div className="p-8 space-y-12">
      <div className="flex items-center justify-between">
          <div className="space-y-4 text-left">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/30 bg-primary/5 px-4 h-7 tracking-widest">
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                  Axiom Vision Ingestion
              </Badge>
              <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Logbook Grid Synthesis</h1>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                      Ingest physical logbook documentation into structured logical schematics via AI vision.
                  </p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <Card className="rounded-3xl border-0 shadow-2xl overflow-hidden bg-background">
          <CardHeader className="p-8 pb-4 bg-muted/5 border-b">
              <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                  <ScanLine className="h-5 w-5 text-primary" />
                  Vision Ingestion
              </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div
              onPaste={handlePaste}
              className={cn(
                "h-72 border-4 border-dashed rounded-[2.5rem] flex items-center justify-center transition-all bg-muted/5 overflow-hidden group",
                pastedImage ? "border-primary/20" : "border-slate-100 hover:border-primary/40"
              )}
            >
              {pastedImage ? (
                <div className="relative h-full w-full p-4 animate-in zoom-in duration-500">
                    <Image src={pastedImage} alt="Pasted logbook" fill className="object-contain rounded-2xl" />
                </div>
              ) : (
                <div className="text-center group-hover:scale-110 transition-transform duration-500">
                  <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-4 border-2 border-primary/10 shadow-inner">
                    <ClipboardPaste className="h-10 w-10 text-primary opacity-50" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Calibrate Vision Parameters</p>
                  <p className="text-[10px] font-bold opacity-30 mt-1 uppercase tracking-tight">Focus & Paste (Ctrl+V)</p>
                </div>
              )}
            </div>
            {pastedImage && (
              <div className="flex gap-4 animate-in slide-in-from-bottom-4">
                <Button onClick={handleProcess} disabled={isProcessing} className="flex-1 h-16 rounded-2xl shadow-xl font-black uppercase tracking-widest text-lg gap-3 transition-all hover:scale-[1.02]">
                  {isProcessing ? <><Loader2 className="h-6 w-6 animate-spin" /> Engaged...</> : <><Wand2 className="h-6 w-6"/> Engage Synthesis</>}
                </Button>
                <Button onClick={handleClearImage} variant="outline" size="icon" className="h-16 w-16 rounded-2xl border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors">
                    <X className="h-6 w-6" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl border-0 shadow-2xl overflow-hidden bg-background h-full min-h-[500px]">
          <CardHeader className="p-8 pb-4 bg-muted/5 border-b flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Grid Logic Preview
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Refine and parameterize identified structures.</CardDescription>
              </div>
              {parsedStructure && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black px-3 h-6 uppercase tracking-widest">Validated</Badge>
              )}
          </CardHeader>
          <CardScrollArea parsedStructure={parsedStructure} isProcessing={isProcessing}>
            {isProcessing ? (
               <div className="h-64 flex flex-col items-center justify-center gap-6 animate-pulse">
                  <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Executing Logical Extraction</p>
               </div>
            ) : parsedStructure ? (
                <div className="p-8 flex flex-col h-full gap-8">
                    <TablePreview columns={parsedStructure} setColumns={setParsedStructure} />
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="w-full h-14 rounded-2xl shadow-xl font-black uppercase tracking-widest text-base gap-3">
                                <Save className="h-5 w-5" /> Commit to Registry
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl border-0 shadow-2xl p-8">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Initialize Grid Schema</DialogTitle>
                                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assign a registry identifier to this structure.</DialogDescription>
                            </DialogHeader>
                            <div className="py-8">
                                <Input 
                                    placeholder="e.g., PH-PPL Standard Layout"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="h-14 border-2 rounded-xl font-black uppercase tracking-tight text-lg focus-visible:ring-primary/20"
                                />
                            </div>
                            <DialogFooter className="gap-4">
                                <DialogClose asChild><Button variant="outline" className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]">Abort</Button></DialogClose>
                                <DialogClose asChild>
                                    <Button onClick={handleSaveTemplate} disabled={!templateName.trim()} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">Finalize Schema</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-12 border-4 border-dashed border-slate-50 rounded-[2.5rem] m-8 bg-muted/5 opacity-50">
                <div className="h-16 w-16 bg-muted/20 rounded-3xl flex items-center justify-center mb-6">
                    <Table className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logical Interface Pending</p>
              </div>
            )}
          </CardScrollArea>
        </Card>
      </div>

      <div className="space-y-8">
        <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                <ChevronDown className="h-5 w-5" />
            </div>
            <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Schema Registry</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Authorized logbook templates persistent in local storage.</p>
            </div>
        </div>

        {isLoadingTemplates ? (
            <div className="flex justify-center p-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedTemplates.map(template => (
                    <Card key={template.id} className="flex items-center justify-between p-6 rounded-3xl border-2 hover:border-primary/40 transition-all group shadow-sm bg-background">
                       <div className="flex items-center gap-4 text-left">
                           <div className="h-12 w-12 rounded-2xl bg-muted/5 flex items-center justify-center text-primary group-hover:bg-primary/5 transition-colors border">
                               <FileType className="h-6 w-6" />
                           </div>
                           <div>
                               <p className="font-black uppercase tracking-tight text-sm text-slate-800">{template.name}</p>
                               <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{template.columns.length} Mapping Columns</p>
                           </div>
                       </div>
                       <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-10 w-10 rounded-xl transition-all" onClick={() => handleDeleteTemplate(template.id)}>
                           <Trash2 className="h-5 w-5" />
                       </Button>
                    </Card>
                ))}
                 {savedTemplates.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-muted/5 rounded-[3rem] border-4 border-dashed border-slate-50">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Registry Empty. Engage Vision to Populate.</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

function CardScrollArea({ children, parsedStructure, isProcessing }: { children: React.ReactNode, parsedStructure: any, isProcessing: boolean }) {
    if (parsedStructure || isProcessing) return <div className="h-full">{children}</div>;
    return <div>{children}</div>;
}
