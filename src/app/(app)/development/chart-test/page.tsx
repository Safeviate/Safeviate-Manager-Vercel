
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
  ZAxis,
  Polygon,
  Label as RechartsLabel,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Static Data for the CG Envelope (example for a Cessna 172) ---
const cgEnvelope = [
  { weight: 1950, cg: 35.0 },
  { weight: 2550, cg: 38.5 },
  { weight: 2550, cg: 47.3 },
  { weight: 1950, cg: 47.3 },
  { weight: 1950, cg: 35.0 }, // Close the polygon
];

// --- Helper function to check if a point is inside a polygon ---
// Using the Ray-Casting algorithm
function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

// Generate background data points for visual context
const backgroundData = Array.from({ length: 200 }, () => ({
  x: Math.random() * (48 - 34) + 34, // CG range
  y: Math.random() * (2600 - 1900) + 1900, // Weight range
}));


export default function ChartTestPage() {
  const [weight, setWeight] = useState(2200);
  const [cg, setCg] = useState(41.5);

  const targetPoint = { x: cg, y: weight };

  const polygonForCheck = cgEnvelope.map(p => ({ x: p.cg, y: p.weight }));
  const isWithinLimits = isPointInPolygon(targetPoint, polygonForCheck);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Weight & Balance CG Envelope</CardTitle>
            <CardDescription>
              The chart shows the safe operating envelope. The red dot represents the aircraft's current CG and will move based on the input values.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={450}>
              <ScatterChart
                margin={{
                  top: 20,
                  right: 40,
                  bottom: 40,
                  left: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Center of Gravity" 
                  unit=" in"
                  domain={[34, 48]}
                  tickCount={8}
                >
                    <RechartsLabel value="Center of Gravity (inches from datum)" offset={-25} position="insideBottom" />
                </XAxis>
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Weight" 
                  unit=" lbs"
                  domain={[1900, 2600]}
                >
                    <RechartsLabel value="Weight (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                </YAxis>

                <ZAxis dataKey="z" range={[10, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />

                {/* Background points for context */}
                <Scatter name="Background" data={backgroundData} fill="#e0e0e0" shape="circle" fillOpacity={0.5} />
                
                {/* The CG Envelope Polygon */}
                <Area type="linear" dataKey="weight" data={cgEnvelope} name="CG Limit" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} strokeWidth={2} />

                {/* The dynamic target point */}
                <Scatter name="Current CG" data={[targetPoint]} fill={isWithinLimits ? "#22c55e" : "#ef4444"} shape="star" size={150} />

              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Edit the Weight and CG to see if it's within safe limits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight-input">Aircraft Weight (lbs)</Label>
              <Input
                id="weight-input"
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-input">Center of Gravity (in)</Label>
              <Input
                id="cg-input"
                type="number"
                value={cg}
                onChange={(e) => setCg(Number(e.target.value))}
              />
            </div>
            <div className="pt-4 text-center">
                <Badge className={cn(isWithinLimits ? 'bg-green-600 hover:bg-green-600' : 'bg-destructive hover:bg-destructive', 'text-lg text-white px-6 py-2')}>
                    {isWithinLimits ? 'Within Limits' : 'Out of Limits'}
                </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
