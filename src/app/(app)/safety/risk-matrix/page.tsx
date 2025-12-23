
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const RISK_MATRIX_COLORS_KEY = 'safeviate-risk-matrix-colors';

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


export default function RiskMatrixPage() {
  const [colors, setColors] = useState<Record<string, string>>(defaultColors);
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // Load colors from localStorage on initial render
  useEffect(() => {
    try {
        const savedColors = localStorage.getItem(RISK_MATRIX_COLORS_KEY);
        if (savedColors) {
            setColors(JSON.parse(savedColors));
        }
    } catch (error) {
        console.error("Failed to load colors from localStorage", error);
        setColors(defaultColors);
    }
  }, []);

  // Save colors to localStorage whenever they change
  useEffect(() => {
    try {
        localStorage.setItem(RISK_MATRIX_COLORS_KEY, JSON.stringify(colors));
    } catch (error) {
        console.error("Failed to save colors to localStorage", error);
    }
  }, [colors]);


  const handleColorChange = (cellId: string, newColor: string) => {
    setColors(prev => ({ ...prev, [cellId]: newColor }));
  };
  
  const handleRightClick = (e: React.MouseEvent, cellId: string) => {
      e.preventDefault();
      setActiveCell(cellId);
      colorInputRef.current?.click();
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
            <div className="grid grid-cols-[1fr,repeat(5,1fr)]">
              {/* Top Headers */}
              <div className="col-start-2 col-span-5 p-2 text-center font-semibold">
                Severity of Consequences
              </div>

              {/* Second Row Headers */}
              <div></div> {/* Empty top-left corner */}
              {severities.map(s => (
                <div key={s.value} className="p-2 text-center font-semibold">
                  {s.name} ({s.value})
                </div>
              ))}
              
              {/* Matrix Body */}
              {likelihoods.slice().reverse().map(l => (
                <React.Fragment key={l.value}>
                  <div className="p-2 flex items-center justify-end text-right font-semibold">
                    <div>
                      {l.name}
                      <span className="block text-muted-foreground font-normal">({l.value})</span>
                    </div>
                  </div>
                  {severities.map(s => {
                    const cellId = `${l.value}${s.value}`;
                    return (
                        <div
                            key={cellId}
                            onContextMenu={(e) => handleRightClick(e, cellId)}
                            style={{ backgroundColor: colors[cellId] }}
                            className={cn(
                                "flex items-center justify-center p-4 border text-white font-bold h-20 w-full transition-colors",
                                "cursor-pointer"
                            )}
                        >
                            {cellId}
                        </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
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
