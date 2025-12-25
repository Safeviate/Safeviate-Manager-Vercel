
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const TableBuilderPage = () => {
  const [cols, setCols] = useState(['Header 1', 'Header 2']);
  const [rows, setRows] = useState([['Cell 1', 'Cell 2']]);

  // Add a new column to every row
  const addColumn = () => {
    setCols([...cols, `Header ${cols.length + 1}`]);
    setRows(rows.map(row => [...row, '']));
  };

  // Add a new row with empty strings for each column
  const addRow = () => {
    setRows([...rows, Array(cols.length).fill('')]);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][colIndex] = value;
    setRows(updatedRows);
  };

  const updateHeader = (colIndex: number, value: string) => {
    const newCols = [...cols];
    newCols[colIndex] = value;
    setCols(newCols);
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Dynamic Table Builder</CardTitle>
                <CardDescription>
                    Add or remove rows and columns to build your table structure.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Button onClick={addRow}><PlusCircle className="mr-2" /> Add Row</Button>
                    <Button onClick={addColumn}><PlusCircle className="mr-2" /> Add Column</Button>
                </div>
            </CardContent>
        </Card>

      <Card>
        <CardContent className="p-0">
          <ScrollArea>
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  {cols.map((col, i) => (
                    <TableHead key={i}>
                      <Input 
                        value={col} 
                        onChange={(e) => updateHeader(i, e.target.value)} 
                        className="font-bold"
                      />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <TableCell key={colIndex}>
                        <Input 
                          value={cell} 
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)} 
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableBuilderPage;
