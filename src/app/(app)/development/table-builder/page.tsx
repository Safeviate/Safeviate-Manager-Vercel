
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const TableBuilderPage = () => {
  const [headers, setHeaders] = useState(['Header 1', 'Header 2']);
  const [rows, setRows] = useState([['Cell 1.1', 'Cell 1.2']]);

  const addColumn = () => {
    setHeaders([...headers, `Header ${headers.length + 1}`]);
    setRows(rows.map(row => [...row, '']));
  };

  const addRow = () => {
    setRows([...rows, Array(headers.length).fill('')]);
  };

  const deleteColumn = (colIndex: number) => {
    if (headers.length <= 1) return; // Prevent deleting the last column
    setHeaders(headers.filter((_, i) => i !== colIndex));
    setRows(rows.map(row => row.filter((_, i) => i !== colIndex)));
  };

  const deleteRow = (rowIndex: number) => {
    if (rows.length <= 1) return; // Prevent deleting the last row
    setRows(rows.filter((_, i) => i !== rowIndex));
  };
  
  const updateHeader = (colIndex: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][colIndex] = value;
    setRows(updatedRows);
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Dynamic Table Builder</CardTitle>
                <CardDescription>A simple, stable table builder. Add or remove rows and columns, and edit content directly.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
                <Button onClick={addRow}><PlusCircle className="mr-2" /> Add Row</Button>
                <Button onClick={addColumn}><PlusCircle className="mr-2" /> Add Column</Button>
            </CardContent>
        </Card>

        <div className="w-full overflow-x-auto rounded-lg border shadow-sm">
            <table className="w-full border-collapse bg-card table-fixed min-w-[800px]">
            <thead>
                <tr className="border-b">
                <th className="w-16 p-0 border-r bg-muted/50"></th>
                {headers.map((header, colIndex) => (
                    <th key={colIndex} className="p-0 border-r text-sm font-medium text-muted-foreground bg-muted/50">
                        <div className="flex items-center">
                            <Input
                                value={header}
                                onChange={(e) => updateHeader(colIndex, e.target.value)}
                                className="h-10 border-0 bg-transparent text-center font-semibold"
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive" onClick={() => deleteColumn(colIndex)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b">
                    <td className="w-16 p-0 border-r bg-muted/50 text-center">
                        <div className="flex items-center justify-center">
                            <span className="text-sm text-muted-foreground mr-1">{rowIndex + 1}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive" onClick={() => deleteRow(rowIndex)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </td>
                    {row.map((cell, colIndex) => (
                    <td key={colIndex} className="p-0 border-r">
                        <Input
                            value={cell}
                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                            className="h-10 border-0 bg-transparent focus-visible:bg-blue-100/20 focus-visible:shadow-[inset_0_0_0_2px_theme(colors.blue.500)] focus-visible:ring-0"
                        />
                    </td>
                    ))}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
    </div>
  );
};

export default TableBuilderPage;
