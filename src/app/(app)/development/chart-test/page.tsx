
'use client';

import { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Static data for the background scatter plot
const backgroundData = Array.from({ length: 50 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
}));

export default function ChartTestPage() {
  const [targetX, setTargetX] = useState(50);
  const [targetY, setTargetY] = useState(50);

  const targetData = [{ x: targetX, y: targetY }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Dynamic Chart</CardTitle>
            <CardDescription>
              The red dot will move based on the X and Y values entered in the controls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart
                margin={{
                  top: 20,
                  right: 20,
                  bottom: 20,
                  left: 20,
                }}
              >
                <CartesianGrid />
                <XAxis type="number" dataKey="x" name="X-Value" unit="" domain={[0, 100]} />
                <YAxis type="number" dataKey="y" name="Y-Value" unit="" domain={[0, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                
                {/* Background points for context */}
                <Scatter name="Background Data" data={backgroundData} fill="#8884d8" opacity={0.5} />

                {/* The dynamic target point */}
                <Scatter name="Target" data={targetData} fill="#ff0000" shape="star" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Edit the X and Y coordinates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="x-input">X Coordinate (0-100)</Label>
              <Input
                id="x-input"
                type="number"
                value={targetX}
                onChange={(e) => setTargetX(Math.max(0, Math.min(100, Number(e.target.value))))}
                max={100}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="y-input">Y Coordinate (0-100)</Label>
              <Input
                id="y-input"
                type="number"
                value={targetY}
                onChange={(e) => setTargetY(Math.max(0, Math.min(100, Number(e.target.value))))}
                max={100}
                min={0}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
