'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useDebounce } from '@/hooks/use-debounce';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger, 
    DialogClose 
} from '@/components/ui/dialog';
import { 
    Trash2, 
    Plus, 
    Minus, 
    Upload, 
    Library, 
    Grid2X2, 
    Save, 
    Sparkles, 
    Pencil, 
    Maximize,
    ChevronDown,
    ArrowRight,
    Layout,
    Columns
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { LogbookTemplate } from '../../development/logbook-parser/page';

type Cell = {
  r: number;
  c: number;
  content: string;
  rowSpan: number;
  colSpan: number;
  hidden: boolean;
};

export type TableData = {
  rows: number;
  cols: number;
  cells: Cell[];
  colWidths: number[];
  rowHeights: number[];
};

export type TableTemplate = {
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
    colWidths: Array(cols).fill(120),
    rowHeights: Array(rows).fill(48),
  };
};

const PublishDialog = ({ template }: { template: TableTemplate }) => {
    const { toast } = useToast();
    const [selectedPage, setSelectedPage] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const availablePages = [
        { id: 'dashboard', name: 'Main Fleet Dashboard' },
        { id: 'logbook-view', name: 'Logbook Analysis View' },
        { id: 'custom-report', name: 'Ad-hoc Maintenance Report' }
    ];

    const handlePublish = async () => {
        if (!selectedPage) {
            toast({ variant: 'destructive', title: 'Invalid Operation', description: 'Destination vector must be selected.' });
            return;
        }

        try {
            const response = await fetch('/api/tenant-config', { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            const config = payload?.config && typeof payload.config === 'object' ? payload.config : {};
            const published = (config as any)['published-tables'] || {};

            const nextPublished = {
                ...published,
                [selectedPage]: {
                pageId: selectedPage,
                tableData: template.tableData,
                publishedAt: new Date().toISOString()
                }
            };

            await fetch('/api/tenant-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: { ...config, 'published-tables': nextPublished } }),
            });
            window.dispatchEvent(new Event('safeviate-tables-published'));

            toast({
                title: 'Logic Deployed',
                description: `Schematic "${template.name}" published to ${selectedPage}.`,
            });
            setIsOpen(false);
        } catch (e) {
            console.error('Failed to publish table', e);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-primary/5 hover:text-primary transition-all">
                    <Upload className="h-3.5 w-3.5" /> Deploy
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-0 shadow-2xl p-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Deploy Schematic</DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                        Finalize the logic distribution for this grid to a live system page.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-8 space-y-3 text-left">
                    <Label htmlFor="destination-page" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Destination Vector</Label>
                    <Select onValueChange={setSelectedPage} value={selectedPage}>
                        <SelectTrigger id="destination-page" className="h-14 border-2 rounded-xl font-black uppercase tracking-tight text-base">
                            <SelectValue placeholder="Select high-level page..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2 shadow-xl">
                            {availablePages.map(page => (
                                <SelectItem key={page.id} value={page.id} className="font-bold uppercase text-[11px]">{page.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter className="gap-4">
                    <DialogClose asChild><Button variant="outline" className="h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest">Abort</Button></DialogClose>
                    <Button onClick={handlePublish} disabled={!selectedPage} className="h-12 px-10 rounded-xl shadow-lg font-black uppercase text-[10px] tracking-widest">Confirm Deployment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function TableBuilderPage() {
  const { toast } = useToast();
  const [tableData, setTableData] = useState<TableData>(() => createInitialTable(5, 5));
  const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(true);
  const [templateName, setTemplateName] = useState('');
  
  const [savedTemplates, setSavedTemplates] = useState<TableTemplate[]>([]);
  const [savedLogbookTemplates, setSavedLogbookTemplates] = useState<LogbookTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { rows, cols, cells, colWidths, rowHeights } = tableData;

  const [inputColWidths, setInputColWidths] = useState(colWidths.map(w => Math.round(w).toString()));
  const [inputRowHeights, setInputRowHeights] = useState(rowHeights.map(h => Math.round(h).toString()));
  
  const debouncedColWidths = useDebounce(inputColWidths, 500);
  const debouncedRowHeights = useDebounce(inputRowHeights, 500);

  // Load from LocalStorage
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
        try {
            const [tableStore, logbookStore] = await Promise.all([
                fetch('/api/tenant-config', { cache: 'no-store' }),
                fetch('/api/logbook-templates', { cache: 'no-store' }),
            ]);
            const [tablePayload, logbookPayload] = await Promise.all([
                tableStore.json().catch(() => ({})),
                logbookStore.json().catch(() => ({})),
            ]);

            const config = tablePayload?.config && typeof tablePayload.config === 'object' ? tablePayload.config : {};
            const tableTemplates = (config as { 'table-templates'?: TableTemplate[] })['table-templates'];
            if (!cancelled && Array.isArray(tableTemplates)) {
                setSavedTemplates(tableTemplates);
            }
            if (!cancelled && Array.isArray(logbookPayload?.templates)) {
                setSavedLogbookTemplates(logbookPayload.templates);
            }
        } catch (e) {
            console.error('Failed to load builder data', e);
        } finally {
            if (!cancelled) setIsLoading(false);
        }
    };
    void loadData();
    return () => {
        cancelled = true;
    };
  }, []);

  useEffect(() => {
    setInputColWidths(tableData.colWidths.map(w => Math.round(w).toString()));
  }, [tableData.colWidths]);
  
  useEffect(() => {
    setInputRowHeights(tableData.rowHeights.map(h => Math.round(h).toString()));
  }, [tableData.rowHeights]);

  useEffect(() => {
      const newWidths = debouncedColWidths.map(w => parseInt(w, 10) || 20);
      setTableData(prev => ({...prev, colWidths: newWidths}));
  }, [debouncedColWidths]);

  useEffect(() => {
      const newHeights = debouncedRowHeights.map(h => parseInt(h, 10) || 20);
      setTableData(prev => ({...prev, rowHeights: newHeights}));
  }, [debouncedRowHeights]);


  const resizeHandleRef = useRef<{ type: 'col' | 'row', index: number, initialPos: number, initialSize: number } | null>(null);

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
        toast({ variant: "destructive", title: "Invalid Selection", description: "Minimal set of two units required." });
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
                 toast({ variant: "destructive", title: "Geometric Fault", description: "Selection must form a unified quadrilateral." });
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
    toast({ title: 'Grid Unified' });
  };
  
  const handleUnmerge = () => {
    const selectionKeys = Object.keys(selectedCells);
    if (selectionKeys.length === 0) {
      toast({ variant: 'destructive', title: 'Selection Zero', description: 'No units selected for fragmentation.' });
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
        toast({ title: 'Fragmentation Complete' });
    } else {
        toast({ variant: 'destructive', title: 'Solid Unit', description: 'Selection is already at minimum fragmentation.' });
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
    const newSize = Math.max(initialSize + delta, 20);

    if (type === 'col') {
      setTableData(prev => {
        const newColWidths = [...prev.colWidths];
        newColWidths[index] = newSize;
        return { ...prev, colWidths: newColWidths }
      });
    } else {
       setTableData(prev => {
        const newRowHeights = [...prev.rowHeights];
        newRowHeights[index] = newSize;
        return { ...prev, rowHeights: newRowHeights }
      });
    }
  }, []);

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

  const handleDimensionChange = (type: 'col' | 'row', index: number, value: string) => {
    if (type === 'col') {
      const newWidths = [...inputColWidths];
      newWidths[index] = value;
      setInputColWidths(newWidths);
    } else {
      const newHeights = [...inputRowHeights];
      newHeights[index] = value;
      setInputRowHeights(newHeights);
    }
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
    if (!templateName.trim()) {
        toast({ variant: 'destructive', title: 'ID Mandatory', description: 'Synthesize a valid label for this schematic.' });
        return;
    }

    const newTemplate: TableTemplate = {
        id: crypto.randomUUID(),
        name: templateName,
        tableData
    };

    const nextTemplates = [newTemplate, ...savedTemplates];

    fetch('/api/tenant-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { 'table-templates': nextTemplates, 'logbook-templates': savedLogbookTemplates } }),
    }).catch((error) => {
      console.error('Failed to save table template', error);
    });

    setSavedTemplates(nextTemplates);
    
    toast({ title: 'Logic Persistent', description: `Schematic "${templateName}" registered.` });
    setTemplateName('');
  };

  const handleLoadTemplate = (template: TableTemplate) => {
    setTableData(template.tableData);
    setSelectedCells({});
    toast({ title: 'Interface Reconstructed', description: `Schematic parameters inherited from "${template.name}".` });
  }

  const handleDeleteTemplate = (templateId: string) => {
    const nextTemplates = savedTemplates.filter(t => t.id !== templateId);

    fetch('/api/tenant-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { 'table-templates': nextTemplates, 'logbook-templates': savedLogbookTemplates } }),
    }).catch((error) => {
      console.error('Failed to delete table template', error);
    });

    setSavedTemplates(nextTemplates);
    toast({ title: 'Schematic Purged' });
  };
  
  const handleImportFromLogbook = (logbookTemplate: LogbookTemplate) => {
    const headerRows: { id: string; label: string; colSpan: number; rowSpan: number }[][] = [];
    const maxDepth = getDepth(logbookTemplate.columns);
    let totalCols = 0;

    function getDepth(columns: LogbookTemplate['columns']): number {
        if (!columns || columns.length === 0) return 0;
        let max = 0;
        for (const col of columns) {
            max = Math.max(max, getDepth(col.subColumns || []));
        }
        return 1 + max;
    }

    function processColumns(columns: LogbookTemplate['columns'], level: number): number {
        if (!headerRows[level]) headerRows[level] = [];
        let numCols = 0;
        for (const col of columns) {
            const subCols = col.subColumns || [];
            const colSpan = subCols.length > 0 ? processColumns(subCols, level + 1) : 1;
            const rowSpan = subCols.length === 0 ? maxDepth - level : 1;
            headerRows[level].push({ id: col.id, label: col.label, colSpan, rowSpan });
            numCols += colSpan;
        }
        if(level === 0) totalCols = numCols;
        return numCols;
    }
    
    processColumns(logbookTemplate.columns, 0);

    const newRows = headerRows.length + 5;
    const newCols = totalCols;
    const newCells: Cell[] = [];

    headerRows.forEach((row, rIndex) => {
        let cIndex = 0;
        row.forEach(headerCell => {
            newCells.push({
                r: rIndex,
                c: cIndex,
                content: headerCell.label,
                rowSpan: headerCell.rowSpan,
                colSpan: headerCell.colSpan,
                hidden: false,
            });
            for (let rs = 0; rs < headerCell.rowSpan; rs++) {
                for (let cs = 0; cs < headerCell.colSpan; cs++) {
                    if (rs === 0 && cs === 0) continue;
                    newCells.push({ r: rIndex + rs, c: cIndex + cs, content: '', rowSpan: 1, colSpan: 1, hidden: true });
                }
            }
            cIndex += headerCell.colSpan;
        });
    });

    for (let r = headerRows.length; r < newRows; r++) {
        for (let c = 0; c < newCols; c++) {
            if (!newCells.find(cell => cell.r === r && cell.c === c)) {
               newCells.push({ r, c, content: '', rowSpan: 1, colSpan: 1, hidden: false });
            }
        }
    }
    
    newCells.sort((a, b) => a.r - b.r || a.c - b.c);
    const uniqueCells = newCells.filter((cell, index, self) => 
        index === self.findIndex(c => c.r === cell.r && c.c === cell.c)
    );

    setTableData({
        rows: newRows,
        cols: newCols,
        cells: uniqueCells,
        colWidths: Array(newCols).fill(120),
        rowHeights: Array(newRows).fill(48),
    });

    toast({ title: 'Vector Ingested', description: `Logical grid inherited from "${logbookTemplate.name}".` });
  };



  return (
    <div className="p-8 space-y-12">
      <div className="flex items-center justify-between">
          <div className="space-y-4 text-left">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/30 bg-primary/5 px-4 h-7 tracking-widest">
                  <Grid2X2 className="h-3.5 w-3.5 mr-2" />
                  Grid Architect Console
              </Badge>
              <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Logic Schematic Builder</h1>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                      Parameterize grid geometry and coordinate logic distribution for dynamic interfaces.
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <div className="flex items-center bg-muted/5 border-2 rounded-2xl p-2 px-4 shadow-inner">
                <Switch id="edit-mode" checked={isEditing} onCheckedChange={setIsEditing} className="data-[state=checked]:bg-primary" />
                <Label htmlFor="edit-mode" className="text-[10px] font-black uppercase tracking-widest ml-3 cursor-pointer">Bypass Auth Protect</Label>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-1 rounded-3xl border-0 shadow-2xl overflow-hidden bg-background">
          <CardHeader className="p-8 pb-4 bg-muted/5 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                  <Maximize className="h-4 w-4 text-primary" />
                  Geometry Matrix
              </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
              <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Logical Rows</Label>
                  <div className="flex items-center justify-between bg-muted/10 p-2 rounded-2xl border-2">
                    <Button size="icon" variant="ghost" className="h-10 w-10 text-primary" onClick={removeRow} disabled={rows <= 1}><Minus className="h-5 w-5" /></Button>
                    <span className="text-2xl font-black font-mono">{rows}</span>
                    <Button size="icon" variant="ghost" className="h-10 w-10 text-primary" onClick={addRow}><Plus className="h-5 w-5" /></Button>
                  </div>
              </div>
              <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Logical Columns</Label>
                  <div className="flex items-center justify-between bg-muted/10 p-2 rounded-2xl border-2">
                    <Button size="icon" variant="ghost" className="h-10 w-10 text-primary" onClick={removeColumn} disabled={cols <= 1}><Minus className="h-5 w-5" /></Button>
                    <span className="text-2xl font-black font-mono">{cols}</span>
                    <Button size="icon" variant="ghost" className="h-10 w-10 text-primary" onClick={addColumn}><Plus className="h-5 w-5" /></Button>
                  </div>
              </div>
              <Separator className="my-6 opacity-40" />
              <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fragment Control</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <Button onClick={handleMerge} disabled={Object.keys(selectedCells).length < 2 || !isEditing} className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg">
                        <Layout className="h-4 w-4" /> Unify Cells
                    </Button>
                    <Button onClick={handleUnmerge} disabled={Object.keys(selectedCells).length === 0 || !isEditing} variant="outline" className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-2">
                        <Columns className="h-4 w-4" /> Fragment
                    </Button>
                  </div>
              </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-8">
            <div className="relative group rounded-[2.5rem] border-4 border-slate-50 bg-background shadow-inner p-1 overflow-hidden min-h-[600px] flex items-center justify-center">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div 
                    className="grid gap-0 relative bg-white shadow-2xl rounded-sm border-2 border-slate-100"
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
                        'flex items-center justify-center border border-slate-100 text-sm transition-all p-0 relative',
                        isEditing && 'cursor-crosshair hover:bg-primary/5',
                        isSelected && 'ring-4 ring-primary ring-inset bg-primary/10 z-10'
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
                            className="w-full h-full bg-transparent border-none text-center font-bold uppercase text-[10px] tracking-widest text-slate-700 p-0 focus-visible:ring-0"
                            placeholder={isEditing ? '...' : ''}
                        />
                    </div>
                    );
                })}
                {isEditing && Array.from({ length: cols }).map((_, index) => (
                    <div 
                        key={`col-handle-${index}`}
                        className="absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-20"
                        style={{ left: `${colWidths.slice(0, index + 1).reduce((a, b) => a + b, 0) - 1}px`}}
                        onMouseDown={(e) => handleMouseDown(e, 'col', index)}
                    />
                ))}
                {isEditing && Array.from({ length: rows }).map((_, index) => (
                    <div 
                        key={`row-handle-${index}`}
                        className="absolute left-0 right-0 h-1 cursor-row-resize hover:bg-primary/50 transition-colors z-20"
                        style={{ top: `${rowHeights.slice(0, index + 1).reduce((a, b) => a + b, 0) - 1}px`}}
                        onMouseDown={(e) => handleMouseDown(e, 'row', index)}
                    />
                ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="rounded-3xl border-0 shadow-2xl overflow-hidden bg-background">
                    <CardHeader className="p-8 pb-4 bg-muted/5 border-b">
                        <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Library className="h-5 w-5 text-primary" />
                            Ingest Sub-Logic
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full h-16 rounded-2xl border-2 border-dashed font-black uppercase tracking-widest text-xs gap-3 hover:bg-primary/5 hover:border-primary/30 transition-all">
                                    <Sparkles className='h-5 w-5 text-primary' /> Inherit from Axiom Vision
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl border-0 shadow-2xl p-8 max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none">External Schema Matrix</DialogTitle>
                                    <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Select a synthesized grid to inherit structure.</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="h-[400px] mt-6 pr-4">
                                    <div className="space-y-4">
                                        {(savedLogbookTemplates || []).map(template => (
                                            <DialogClose key={template.id} asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full h-16 justify-between px-6 rounded-2xl border hover:bg-primary/5 hover:border-primary/20 group/btn transition-all"
                                                    onClick={() => handleImportFromLogbook(template)}
                                                >
                                                    <div className="text-left">
                                                        <p className="font-black uppercase tracking-tight text-sm text-slate-800">{template.name}</p>
                                                        <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Axiom Vision Schema</p>
                                                    </div>
                                                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all" />
                                                </Button>
                                            </DialogClose>
                                        ))}
                                        {(savedLogbookTemplates || []).length === 0 && (
                                            <p className="text-center text-[10px] font-black uppercase tracking-widest opacity-30 py-10">Registry Zero: Vision synthesis required.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-0 shadow-2xl overflow-hidden bg-background">
                    <CardHeader className="p-8 pb-4 bg-muted/5 border-b">
                        <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Save className="h-5 w-5 text-primary" />
                            Commit Schematic
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                        <div className="flex gap-3">
                            <Input placeholder="Registry Label..." value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="h-14 border-2 rounded-2xl font-black uppercase tracking-tight text-base focus-visible:ring-primary/20 flex-1" />
                            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()} className="h-14 px-8 rounded-2xl shadow-xl font-black uppercase tracking-widest text-xs">Register</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8">
                <div className="flex items-center gap-4 text-left">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                        <ChevronDown className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Registered Schematic Library</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Persistent grid parameters for logical distribution.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedTemplates.map(template => (
                        <Card key={template.id} className="flex items-center justify-between p-6 rounded-3xl border-2 hover:border-primary/40 transition-all group shadow-sm bg-background">
                           <div className="flex items-center gap-4 text-left">
                               <div className="h-14 w-14 rounded-2xl bg-muted/5 flex items-center justify-center text-primary group-hover:bg-primary/5 transition-colors border-2 shadow-inner">
                                   <Pencil className="h-6 w-6" />
                               </div>
                               <div className="space-y-1">
                                   <p className="font-black uppercase tracking-tight text-base text-slate-800">{template.name}</p>
                                   <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground opacity-50">{template.tableData.rows}x{template.tableData.cols} Geometry Matrix</p>
                               </div>
                           </div>
                           <div className="flex items-center gap-3">
                                <Button size="sm" variant="ghost" onClick={() => handleLoadTemplate(template)} className="h-9 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary/5 hover:text-primary">Recall</Button>
                                <PublishDialog template={template} />
                                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-10 w-10 rounded-xl transition-all" onClick={() => handleDeleteTemplate(template.id)}>
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                           </div>
                        </Card>
                    ))}
                    {savedTemplates.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-muted/5 rounded-[3rem] border-4 border-dashed border-slate-50">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Library Empty. Parameterize Schematic to Register.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
