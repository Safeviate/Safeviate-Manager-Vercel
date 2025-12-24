
'use client';

import * as React from 'react';
import { useState, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// --- Components ---

const ResizableTable = ({ rows, cols }: { rows: number, cols: number }) => {
    const tableRef = useRef<HTMLTableElement>(null);
    const colRefs = useRef<(HTMLTableColElement | null)[]>([]);
    const [colWidths, setColWidths] = useState<number[]>([]);

    React.useEffect(() => {
        setColWidths(Array(cols).fill(100 / cols));
    }, [cols]);

    const startResize = useCallback((colIndex: number) => {
        const table = tableRef.current;
        if (!table) return;

        const startX = table.getBoundingClientRect().left;
        let currentWidths = [...colWidths];

        const handleMouseMove = (e: MouseEvent) => {
            const tableWidth = table.offsetWidth;
            let newWidths = [...currentWidths];
            
            // Calculate total width of previous columns
            let leftWidth = 0;
            for(let i=0; i<colIndex; i++){
                leftWidth += newWidths[i] / 100 * tableWidth;
            }

            const newLeftWidth = e.clientX - startX - leftWidth;
            const newRightWidth = (newWidths[colIndex] + newWidths[colIndex + 1]) / 100 * tableWidth - newLeftWidth;

            const leftPercentage = (newLeftWidth / tableWidth) * 100;
            const rightPercentage = (newRightWidth / tableWidth) * 100;

            if(leftPercentage > 5 && rightPercentage > 5){ // min width
                newWidths[colIndex] = leftPercentage;
                newWidths[colIndex+1] = rightPercentage;
                setColWidths(newWidths);
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [colWidths]);
    
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table
                ref={tableRef}
                className="w-full border-collapse"
                style={{ tableLayout: 'fixed' }}
            >
                <colgroup>
                    {colWidths.map((width, i) => (
                        <col key={i} ref={el => colRefs.current[i] = el} style={{ width: `${width}%` }} />
                    ))}
                </colgroup>
                <tbody>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: cols }).map((_, colIndex) => (
                                <td 
                                    key={colIndex} 
                                    className="border border-muted p-2 h-12 relative"
                                    contentEditable
                                    suppressContentEditableWarning
                                >
                                    {colIndex < cols - 1 && (
                                         <div
                                            className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-primary/20 hover:bg-primary transition-colors z-10"
                                            onMouseDown={() => startResize(colIndex)}
                                        />
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const TableSelector = ({ onSelect }: { onSelect: (dims: { rows: number; cols: number }) => void }) => {
    const [hovered, setHovered] = useState({ rows: 0, cols: 0 });
    const [selected, setSelected] = useState({ rows: 0, cols: 0 });
    const gridRef = useRef<HTMLDivElement>(null);

    const handleHover = (rows: number, cols: number) => {
        setHovered({ rows, cols });
    };

    const handleSelect = () => {
        setSelected(hovered);
        onSelect(hovered);
    };

    const handleMouseLeave = () => {
        setHovered({ rows: 0, cols: 0 });
    }

    const gridSize = 10;

    return (
        <Card className="w-fit">
            <CardHeader>
                <CardTitle>Table Dimensions</CardTitle>
                <CardDescription>Hover and click to select table size.</CardDescription>
            </CardHeader>
            <CardContent>
                <div 
                    ref={gridRef}
                    className="grid gap-1 bg-muted/20 p-2" 
                    style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                    onMouseLeave={handleMouseLeave}
                >
                    {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                        const row = Math.floor(index / gridSize) + 1;
                        const col = (index % gridSize) + 1;
                        const isHighlighted = row <= hovered.rows && col <= hovered.cols;
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "h-6 w-6 border border-border transition-colors",
                                    isHighlighted ? 'bg-primary' : 'bg-background hover:bg-accent'
                                )}
                                onMouseEnter={() => handleHover(row, col)}
                                onClick={handleSelect}
                            />
                        );
                    })}
                </div>
                <p className="mt-4 text-center font-medium">
                    {hovered.rows > 0 ? `${hovered.cols} x ${hovered.rows}` : 'Select Dimensions'}
                </p>
            </CardContent>
        </Card>
    );
}

// --- Main Page Component ---
export default function TableBuilderPage() {
    const [tableDimensions, setTableDimensions] = useState<{ rows: number, cols: number } | null>(null);

    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold tracking-tight">Interactive Table Builder</h1>
             <div className="flex flex-col md:flex-row gap-8 items-start">
                <TableSelector onSelect={setTableDimensions} />

                <div className="flex-1 w-full">
                     <Card>
                        <CardHeader>
                            <CardTitle>Table Preview</CardTitle>
                            <CardDescription>Click in cells to edit text. Drag column borders to resize.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {tableDimensions ? (
                                <ResizableTable rows={tableDimensions.rows} cols={tableDimensions.cols} />
                            ) : (
                                <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                                    <p>Select table dimensions to see a preview.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
             </div>
        </div>
    );
}
