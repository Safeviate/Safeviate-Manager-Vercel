
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';

const TableBuilderPage = () => {
  const [cols, setCols] = useState(['Header 1', 'Header 2']);
  const [rows, setRows] = useState([['Cell 1', 'Cell 2']]);

  const addColumn = () => {
    setCols([...cols, `Header ${cols.length + 1}`]);
    setRows(rows.map(row => [...row, '']));
  };

  const addRow = () => {
    setRows([...rows, Array(cols.length).fill('')]);
  };
  
  const deleteColumn = (colIndex: number) => {
    if (cols.length <= 1) return; // Prevent deleting the last column
    setCols(cols.filter((_, i) => i !== colIndex));
    setRows(rows.map(row => row.filter((_, i) => i !== colIndex)));
  };

  const deleteRow = (rowIndex: number) => {
    if (rows.length <= 1) return; // Prevent deleting the last row
    setRows(rows.filter((_, i) => i !== rowIndex));
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
          <div className="w-full overflow-x-auto border shadow-sm">
            <table className="w-full border-collapse table-fixed min-w-[800px]">
              <thead>
                <tr>
                  <th className="w-[40px] bg-gray-100 border border-gray-300"></th>
                  {cols.map((_, colIndex) => (
                    <th key={colIndex} className="border border-gray-300 bg-gray-50 h-[35px] p-0">
                      <div className="flex items-center h-full">
                        <Input 
                          value={cols[colIndex]} 
                          onChange={(e) => updateHeader(colIndex, e.target.value)} 
                          className="w-full h-full border-none p-2 bg-transparent focus:bg-blue-100/50 focus:shadow-[inset_0_0_0_2px_#1a73e8]"
                        />
                         <button onClick={() => deleteColumn(colIndex)} className="px-2 text-gray-400 hover:text-red-500">
                            <Trash2 className='h-4 w-4' />
                         </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="w-[40px] text-center text-xs text-gray-500 bg-gray-100 border border-gray-300 relative">
                      {rowIndex + 1}
                       <button onClick={() => deleteRow(rowIndex)} className="absolute right-0 top-1/2 -translate-y-1/2 px-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </td>
                    {row.map((cell, colIndex) => (
                      <td key={colIndex} className="border border-gray-300 h-[35px] p-0">
                        <Input 
                          value={cell} 
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)} 
                          className="w-full h-full border-none p-2 bg-transparent focus:bg-blue-100/50 focus:shadow-[inset_0_0_0_2px_#1a73e8]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableBuilderPage;
