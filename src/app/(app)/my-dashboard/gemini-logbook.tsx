
'use client';

import { useMemo } from 'react';
import type { LogbookTemplate, LogbookColumn } from '@/app/(app)/development/logbook-parser/page';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface GeminiLogbookProps {
  template: LogbookTemplate;
}

// Hardcoded sample data for the logbook
const sampleLogbookEntries = [
    { date: '2024-07-20', aircraft: 'G-DEMO', singleEngineTime: '1.5', totalTime: '1.5' },
    { date: '2024-07-21', aircraft: 'G-TEST', singleEngineTime: '0.8', totalTime: '0.8' },
    { date: '2024-07-22', aircraft: 'G-DEMO', singleEngineTime: '2.1', totalTime: '2.1' },
    { date: '2024-07-24', aircraft: 'N-CPL', singleEngineTime: '3.0', totalTime: '3.0' },
];


// Recursive helper to render table headers
const renderHeaderRows = (headerRows: any[][]) => {
  return headerRows.map((row, rowIndex) => (
    <TableRow key={`header-row-${rowIndex}`}>
      {row.map((cell) => (
        <TableHead
          key={cell.id}
          colSpan={cell.colSpan}
          rowSpan={cell.rowSpan}
          className="text-center border"
        >
          {cell.label}
        </TableHead>
      ))}
    </TableRow>
  ));
};

// Recursive helper to get all bottom-level column IDs in order
const getLeafColumnIds = (columns: LogbookColumn[]): string[] => {
  let ids: string[] = [];
  for (const col of columns) {
    if (col.subColumns && col.subColumns.length > 0) {
      ids = [...ids, ...getLeafColumnIds(col.subColumns)];
    } else {
      ids.push(col.id);
    }
  }
  return ids;
};

export function GeminiLogbook({ template }: GeminiLogbookProps) {

  // This logic processes the template structure to calculate row and column spans for the table header.
  const { headerRows, leafColumnIds } = useMemo(() => {
    if (!template?.columns) return { headerRows: [], leafColumnIds: [] };

    const rows: any[][] = [];
    const process = (columns: LogbookColumn[], level: number) => {
      if (!rows[level]) rows[level] = [];
      let maxLevel = level;
      let totalSubCols = 0;

      for (const col of columns) {
        const cell = { id: col.id, label: col.label, colSpan: 1, rowSpan: 1 };
        rows[level].push(cell);

        if (col.subColumns && col.subColumns.length > 0) {
          const subResult = process(col.subColumns, level + 1);
          cell.colSpan = subResult.totalSubCols;
          maxLevel = Math.max(maxLevel, subResult.maxLevel);
          totalSubCols += subResult.totalSubCols;
        } else {
          totalSubCols += 1;
        }
      }
      return { maxLevel, totalSubCols };
    };

    const { maxLevel } = process(template.columns, 0);

    // Adjust rowSpans for cells that don't have subColumns to make them span all header rows
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
        const colData = findCol(template.columns, cell.id);
        if (colData && (!colData.subColumns || colData.subColumns.length === 0)) {
          cell.rowSpan = maxLevel - i + 1;
        }
      }
    }

    return { headerRows: rows, leafColumnIds: getLeafColumnIds(template.columns) };
  }, [template]);
  
  // This function maps the sample data to the correct column based on the column ID.
  const getCellData = (entry: typeof sampleLogbookEntries[0], columnId: string): string => {
    // Basic mapping based on expected IDs from parsing.
    switch (columnId) {
      case 'date': return entry.date;
      case 'aircraft': return entry.aircraft;
      case 'singleEngineTime': return entry.singleEngineTime;
      case 'totalTime': return entry.totalTime;
      default: return '...'; // Placeholder for unmapped columns
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gemini's Logbook (Sample Data)</CardTitle>
        <CardDescription>A logbook component with hardcoded data to demonstrate the template structure.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {renderHeaderRows(headerRows)}
            </TableHeader>
            <TableBody>
              {sampleLogbookEntries.length > 0 ? (
                sampleLogbookEntries.map((entry, index) => (
                  <TableRow key={index}>
                    {leafColumnIds.map(id => (
                      <TableCell key={id} className="text-center">{getCellData(entry, id)}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={leafColumnIds.length || 1} className="h-24 text-center">
                    No sample entries available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
