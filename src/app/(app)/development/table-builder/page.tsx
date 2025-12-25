'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
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
                <CardDescription>A simple table builder. Add or remove rows and columns, and edit content directly.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
                <Button onClick={addRow}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
                <Button onClick={addColumn}><PlusCircle className="mr-2 h-4 w-4" /> Add Column</Button>
            </CardContent>
        </Card>

        <div className="w-full overflow-x-auto rounded-lg border shadow-sm">
            <table className="w-full border-collapse bg-card table-auto min-w-[800px]">
            <thead>
                <tr className="border-b">
                {headers.map((header, colIndex) => (
                    <th key={colIndex} className="p-0 border-r text-sm font-medium text-muted-foreground bg-muted/50">
                        <div className="flex items-center">
                            <Input
                                value={header}
                                onChange={(e) => updateHeader(colIndex, e.target.value)}
                                className="h-10 border-0 bg-transparent text-center font-semibold text-card-foreground"
                            />
                        </div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b">
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
