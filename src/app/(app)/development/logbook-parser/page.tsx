
'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ClipboardPaste, Wand2, Table } from 'lucide-react';
import { parseLogbook, type LogbookColumn } from '@/ai/flows/parse-logbook-flow';
import Image from 'next/image';

interface HeaderCell {
  label: string;
  colSpan: number;
  rowSpan: number;
}

const calculateSpans = (columns: LogbookColumn[]): { headerRows: HeaderCell[][], totalCols: number } => {
  if (!columns || columns.length === 0) {
    return { headerRows: [], totalCols: 0 };
  }

  const rows: HeaderCell[][] = [];
  let totalCols = 0;

  function processColumns(cols: LogbookColumn[], level: number) {
    if (!rows[level]) {
      rows[level] = [];
    }

    let maxSubLevel = level;

    for (const col of cols) {
      const cell: HeaderCell = { label: col.label, colSpan: 1, rowSpan: 1 };
      rows[level].push(cell);

      if (col.subColumns && col.subColumns.length > 0) {
        const subResult = processColumns(col.subColumns, level + 1);
        cell.colSpan = subResult.totalSubCols;
        maxSubLevel = Math.max(maxSubLevel, subResult.maxLevel);
      } else {
         if (level === 0) totalCols++;
      }
    }
     if (level === 0) {
        rows.forEach((row, rowIndex) => {
            row.forEach(cell => {
                if (!cell.colSpan || cell.colSpan === 1 && !columns.find(c => c.label === cell.label)?.subColumns) {
                    cell.rowSpan = rows.length - rowIndex;
                }
            })
        })
    }


    let totalSubCols = 0;
    for (const col of cols) {
        if(col.subColumns && col.subColumns.length > 0) {
            totalSubCols += col.subColumns.length;
        } else {
            totalSubCols +=1;
        }
    }

    return { maxLevel: maxSubLevel, totalSubCols: totalSubCols };
  }

  processColumns(columns, 0);
  
  // Adjust rowSpans for cells that don't have subColumns
  const maxDepth = rows.length;
  for(let i=0; i<rows.length; i++) {
      for(let j=0; j<rows[i].length; j++) {
          const cell = rows[i][j];
          const hasSubColumns = columns.some(c => c.label === cell.label && c.subColumns && c.subColumns.length > 0)
          
          let hasSubColumnsRecursive = false;
          const findCol = (cols: LogbookColumn[], label: string): LogbookColumn | undefined => {
              for(const col of cols) {
                  if(col.label === label) return col;
                  if(col.subColumns) {
                      const found = findCol(col.subColumns, label);
                      if (found) return found;
                  }
              }
              return undefined;
          }
          const colData = findCol(columns, cell.label);
          if (colData && colData.subColumns && colData.subColumns.length > 0) {
              hasSubColumnsRecursive = true;
          }

          if(!hasSubColumnsRecursive) {
              cell.rowSpan = maxDepth - i;
          }
      }
  }


  return { headerRows: rows, totalCols };
};

const TablePreview = ({ columns }: { columns: LogbookColumn[] }) => {
  const { headerRows } = calculateSpans(columns);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          {headerRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <th
                  key={cellIndex}
                  scope="col"
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className="px-6 py-3 border"
                >
                  {cell.label}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
            <tr className="bg-white border-b">
                <td colSpan={100} className="px-6 py-12 text-center text-muted-foreground">
                    (Logbook entries would appear here)
                </td>
            </tr>
        </tbody>
      </table>
    </div>
  );
};


export default function LogbookParserPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [parsedStructure, setParsedStructure] = useState<LogbookColumn[] | null>(null);

  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
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
        toast({ title: 'Structure Parsed', description: 'The logbook table structure has been extracted.' });
      }
    } catch (error: any) {
      console.error('Error parsing logbook:', error);
      toast({ variant: 'destructive', title: 'Processing Failed', description: error.message || 'An unknown error occurred.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full items-start">
      <Card>
        <CardHeader>
          <CardTitle>Logbook Parser</CardTitle>
          <CardDescription>
            Paste an image of a logbook page to parse its column structure. The AI will analyze the headers, including nested columns.
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
          <Button onClick={handleProcess} disabled={isProcessing || !pastedImage} className="w-full">
            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Parse Structure'}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Structure Preview</CardTitle>
          <CardDescription>A visual representation of the parsed table header structure.</CardDescription>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
             <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : parsedStructure ? (
            <TablePreview columns={parsedStructure} />
          ) : (
            <div className="h-48 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Table className="h-8 w-8 mr-2" />
              <p>The parsed table structure will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
