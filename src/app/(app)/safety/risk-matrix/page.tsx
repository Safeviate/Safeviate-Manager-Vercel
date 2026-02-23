
'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

const likelihoods = [
    { name: 'Frequent', value: 5 },
    { name: 'Occasional', value: 4 },
    { name: 'Remote', value: 3 },
    { name: 'Improbable', value: 2 },
    { name: 'Extremely Improbable', value: 1 },
];

const severities = [
    { name: 'Catastrophic', value: 'A' },
    { name: 'Hazardous', value: 'B' },
    { name: 'Major', value: 'C' },
    { name: 'Minor', value: 'D' },
    { name: 'Negligible', value: 'E' },
];

const defaultColors: Record<string, string> = {
    '5A': '#d9534f', '5B': '#d9534f', '5C': '#f0ad4e', '5D': '#f0ad4e', '5E': '#f0ad4e',
    '4A': '#d9534f', '4B': '#d9534f', '4C': '#d9534f', '4D': '#5cb85c', '4E': '#5cb85c',
    '3A': '#d9534f', '3B': '#d9534f', '3C': '#f0ad4e', '3D': '#5cb85c', '3E': '#5cb85c',
    '2A': '#f0ad4e', '2B': '#f0ad4e', '2C': '#5cb85c', '2D': '#5cb85c', '2E': '#5cb85c',
    '1A': '#f0ad4e', '1B': '#5cb85c', '1C': '#5cb85c', '1D': '#5cb85c', '1E': '#5cb85c',
};

type RiskMatrixSettings = {
    id: string;
    colors: Record<string, string>;
}

export default function RiskMatrixPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const settingsId = 'risk-matrix-config';
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const settingsRef = useMemoFirebase(() => (
    firestore ? doc(firestore, 'tenants', tenantId, 'settings', settingsId) : null
  ), [firestore, tenantId]);

  const { data: riskMatrixSettings, isLoading } = useDoc<RiskMatrixSettings>(settingsRef);

  const [colors, setColors] = useState<Record<string, string>>(defaultColors);
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // Load colors from Firestore on initial render or when they change on the server
  useEffect(() => {
    if (riskMatrixSettings) {
        setColors(riskMatrixSettings.colors || defaultColors);
    } else if (!isLoading && settingsRef) {
        // If doc doesn't exist, create it with defaults
        setDocumentNonBlocking(settingsRef, { id: settingsId, colors: defaultColors }, { merge: false });
    }
  }, [riskMatrixSettings, isLoading, settingsRef]);

  const handleColorChange = (cellId: string, newColor: string) => {
    // Optimistically update the UI
    const newColors = { ...colors, [cellId]: newColor };
    setColors(newColors);

    // Debounce the save operation
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
        if (settingsRef) {
            setDocumentNonBlocking(settingsRef, { colors: newColors }, { merge: true });
        }
    }, 1000); // 1-second debounce delay
  };

  // Cleanup timeout on unmount
  useEffect(() => {
      return () => {
          if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
          }
      };
  }, []);
  
  const handleRightClick = (e: React.MouseEvent, cellId: string) => {
      e.preventDefault();
      setActiveCell(cellId);
      if (colorInputRef.current) {
          colorInputRef.current.click();
      }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Matrix Configuration</CardTitle>
          <CardDescription>
            This matrix is used to determine the level of risk associated with an identified hazard, based on ICAO Document 9859 (Safety Management Manual). Right-click a cell to change the color.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-separate" style={{ borderSpacing: 0 }}>
                <colgroup>
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                    <col className="w-[16.66%]" />
                </colgroup>
                <thead>
                    <tr>
                        <th className="border border-slate-200 dark:border-slate-700 p-2"></th>
                        {severities.map(s => (
                            <th key={s.value} className="h-24 border-t border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center align-middle font-semibold">
                                {s.name} ({s.value})
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {likelihoods.slice().reverse().map(l => (
                        <tr key={l.value}>
                            <th className="h-24 border-l border-b border-r border-slate-200 dark:border-slate-700 p-2 text-right align-middle font-semibold">
                                {l.name}
                                <span className="block text-muted-foreground font-normal">({l.value})</span>
                            </th>
                            {severities.map(s => {
                                const cellId = `${l.value}${s.value}`;
                                return (
                                <td
                                    key={cellId}
                                    onContextMenu={(e) => handleRightClick(e, cellId)}
                                    style={{ backgroundColor: colors[cellId] }}
                                    className={cn(
                                        "h-24 border-b border-r border-slate-200 dark:border-slate-700 p-2 text-center align-middle font-bold text-black transition-colors",
                                        "cursor-pointer"
                                    )}
                                >
                                    {cellId}
                                </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <Input 
                type="color" 
                ref={colorInputRef} 
                className="hidden" 
                onChange={(e) => activeCell && handleColorChange(activeCell, e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Severity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>(A) Catastrophic:</strong> Equipment destroyed, multiple deaths.</p>
            <p><strong>(B) Hazardous:</strong> Large reduction in safety margins, serious injury, major equipment damage.</p>
            <p><strong>(C) Major:</strong> Significant reduction in safety margins, serious incident, injury to persons.</p>
            <p><strong>(D) Minor:</strong> Nuisance, operating limitations, minor incident.</p>
            <p><strong>(E) Negligible:</strong> Little or no effect on safety.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Likelihood</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>(5) Frequent:</strong> Likely to occur many times (has happened frequently).</p>
            <p><strong>(4) Occasional:</strong> Likely to occur some times (has happened infrequently).</p>
            <p><strong>(3) Remote:</strong> Unlikely, but possible to occur (has happened rarely).</p>
            <p><strong>(2) Improbable:</strong> Very unlikely to occur (not known to have happened).</p>
            <p><strong>(1) Extremely Improbable:</strong> Almost inconceivable that the event will occur.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
