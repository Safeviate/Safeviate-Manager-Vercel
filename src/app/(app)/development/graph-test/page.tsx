'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { GRAPH_TEMPLATES, getGraphTemplate, type GraphPoint, type GraphTemplate } from './graph-specs';
import { MasterGraph } from './master-graph';
import { Minus, Plus, RotateCcw } from 'lucide-react';

const WIDTH_PRESETS = [
  { label: 'Phone', value: 375 },
  { label: 'Tablet', value: 768 },
  { label: 'Desktop', value: 861 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildAutoDomain(points: GraphPoint[], fallback: [number, number], padRatio: number, minPad: number): [number, number] {
  const xs = points.map((point) => point.x).filter(Number.isFinite);
  if (!xs.length) return fallback;

  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = Math.max(max - min, 1);
  const pad = Math.max(span * padRatio, minPad);

  return [min - pad, max + pad];
}

export default function GraphTestPage() {
  const [templateId, setTemplateId] = useState(GRAPH_TEMPLATES[0].id);
  const template = useMemo(() => getGraphTemplate(templateId), [templateId]);
  const [previewWidth, setPreviewWidth] = useState(768);
  const [autoFit, setAutoFit] = useState(true);
  const [currentX, setCurrentX] = useState(template.currentPoint.x);
  const [currentY, setCurrentY] = useState(template.currentPoint.y);
  const [manualXMin, setManualXMin] = useState(template.xDomain[0]);
  const [manualXMax, setManualXMax] = useState(template.xDomain[1]);
  const [manualYMin, setManualYMin] = useState(template.yDomain[0]);
  const [manualYMax, setManualYMax] = useState(template.yDomain[1]);
  const [points, setPoints] = useState<GraphPoint[]>(template.envelope.slice(0, -1));

  useEffect(() => {
    setCurrentX(template.currentPoint.x);
    setCurrentY(template.currentPoint.y);
    setManualXMin(template.xDomain[0]);
    setManualXMax(template.xDomain[1]);
    setManualYMin(template.yDomain[0]);
    setManualYMax(template.yDomain[1]);
    setPoints(template.envelope.slice(0, -1));
    setAutoFit(true);
  }, [template]);

  const activeEnvelope = useMemo(() => {
    if (points.length < 3) {
      return template.envelope.slice(0, -1);
    }
    return points;
  }, [points, template.envelope]);

  const displayXDomain: [number, number] = autoFit
    ? buildAutoDomain(activeEnvelope, template.xDomain, 0.14, 1)
    : [manualXMin, manualXMax];
  const displayYDomain: [number, number] = autoFit
    ? (() => {
        const ys = activeEnvelope
          .map((point) => point.y)
          .filter(Number.isFinite);
        if (!ys.length) return template.yDomain;
        const min = Math.min(...ys);
        const max = Math.max(...ys);
        const span = Math.max(max - min, 1);
        const pad = Math.max(span * 0.12, 80);
        return [min - pad, max + pad] as [number, number];
      })()
    : [manualYMin, manualYMax];

  const activeTemplate: GraphTemplate = {
    ...template,
    envelope: activeEnvelope,
    currentPoint: { x: currentX, y: currentY },
    xDomain: displayXDomain,
    yDomain: displayYDomain,
  };

  const layoutMode = previewWidth < 560 ? 'compact' : previewWidth < 920 ? 'cozy' : 'wide';

  const addVertex = () => {
    const last = activeEnvelope[activeEnvelope.length - 1] ?? template.currentPoint;
    setPoints((prev) => [
      ...prev,
      {
        x: clamp(last.x + 0.8, template.xDomain[0], template.xDomain[1]),
        y: clamp(last.y + 120, template.yDomain[0], template.yDomain[1]),
      },
    ]);
  };

  const removeVertex = (index: number) => {
    setPoints((prev) => prev.filter((_, pointIndex) => pointIndex !== index));
  };

  const resetTemplate = () => {
    setCurrentX(template.currentPoint.x);
    setCurrentY(template.currentPoint.y);
    setManualXMin(template.xDomain[0]);
    setManualXMax(template.xDomain[1]);
    setManualYMin(template.yDomain[0]);
    setManualYMax(template.yDomain[1]);
    setPoints(template.envelope.slice(0, -1));
    setAutoFit(true);
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-1 flex-col gap-6 overflow-y-auto px-2 pb-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black uppercase tracking-tight">Graph Test</h1>
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wide">
            Master graph lab
          </Badge>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">
          This is the isolated test environment for building one master mass and balance graph engine that can adapt to
          different aircraft and different screen sizes without changing the underlying math.
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.75fr)]">
        <Card className="border shadow-none">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base font-black uppercase tracking-wide">Responsive Graph Preview</CardTitle>
                <CardDescription>
                  The same renderer is measured inside a viewport simulator so we can test mobile, tablet, and desktop widths.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {WIDTH_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewWidth(preset.value)}
                    className="text-xs font-black uppercase"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Viewport width</p>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {previewWidth}px
                  </Badge>
                </div>
                <Slider
                  value={[previewWidth]}
                  min={320}
                  max={1400}
                  step={1}
                  onValueChange={(value) => setPreviewWidth(value[0] ?? previewWidth)}
                />
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Layout mode</p>
                <p className="mt-1 text-lg font-black uppercase">{layoutMode}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border bg-background p-3">
              <div style={{ width: previewWidth, minWidth: 320 }}>
                <MasterGraph template={activeTemplate} currentPoint={{ x: currentX, y: currentY }} />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Profile</p>
                <p className="mt-0.5 text-base font-black">{template.name}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Family</p>
                <p className="mt-0.5 text-base font-black">{template.family}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Domain</p>
                <p className="mt-0.5 text-base font-black">
                  {displayXDomain[0].toFixed(1)} to {displayXDomain[1].toFixed(1)} in
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-black uppercase tracking-wide">Master Graph Controls</CardTitle>
            <CardDescription>
              Swap templates and adjust the active point while the same rendering engine stays in place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Aircraft template</p>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {GRAPH_TEMPLATES.map((graphTemplate) => (
                    <SelectItem key={graphTemplate.id} value={graphTemplate.id}>
                      {graphTemplate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-2">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Domain mode</p>
                <p className="text-sm font-medium text-muted-foreground">
                  {autoFit ? 'Auto-fit envelope' : 'Fixed domain'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoFit((value) => !value)}
                className="text-xs font-black uppercase"
              >
                {autoFit ? 'Switch to fixed' : 'Switch to auto-fit'}
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current CG</p>
                  <p className="text-sm text-muted-foreground">This moves the black point horizontally.</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {currentX.toFixed(2)}
                </Badge>
              </div>
              <Slider
                value={[currentX]}
                min={autoFit ? template.xDomain[0] : manualXMin}
                max={autoFit ? template.xDomain[1] : manualXMax}
                step={0.01}
                onValueChange={(value) => setCurrentX(value[0] ?? currentX)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Weight</p>
                  <p className="text-sm text-muted-foreground">This moves the black point vertically.</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {currentY.toFixed(0)}
                </Badge>
              </div>
              <Slider
                value={[currentY]}
                min={autoFit ? template.yDomain[0] : manualYMin}
                max={autoFit ? template.yDomain[1] : manualYMax}
                step={1}
                onValueChange={(value) => setCurrentY(value[0] ?? currentY)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Envelope points</p>
                  <p className="text-sm text-muted-foreground">Edit the polygon that defines the master graph.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addVertex} className="gap-2 text-xs font-black uppercase">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetTemplate} className="gap-2 text-xs font-black uppercase">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {activeEnvelope.map((point, index) => (
                  <div key={`${index}-${point.x}-${point.y}`} className="rounded-xl border bg-muted/20 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-black uppercase tracking-wide">Vertex {index + 1}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeVertex(index)}
                        disabled={activeEnvelope.length <= 3}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>CG</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={point.x}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setPoints((prev) =>
                              prev.map((item, pointIndex) => (pointIndex === index ? { ...item, x: value } : item))
                            );
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Weight</Label>
                        <Input
                          type="number"
                          step="1"
                          value={point.y}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setPoints((prev) =>
                              prev.map((item, pointIndex) => (pointIndex === index ? { ...item, y: value } : item))
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="x-min">X Min</Label>
                  <Input
                    id="x-min"
                    type="number"
                    value={manualXMin}
                    disabled={autoFit}
                    onChange={(event) => setManualXMin(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x-max">X Max</Label>
                  <Input
                    id="x-max"
                    type="number"
                    value={manualXMax}
                    disabled={autoFit}
                    onChange={(event) => setManualXMax(Number(event.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="y-min">Y Min</Label>
                  <Input
                    id="y-min"
                    type="number"
                    value={manualYMin}
                    disabled={autoFit}
                    onChange={(event) => setManualYMin(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="y-max">Y Max</Label>
                  <Input
                    id="y-max"
                    type="number"
                    value={manualYMax}
                    disabled={autoFit}
                    onChange={(event) => setManualYMax(Number(event.target.value))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="rounded-xl border bg-slate-950 p-4 text-slate-50">
              <p className="text-xs font-black uppercase tracking-wide text-slate-300">Implementation rules</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                <li>- The template is the source of truth.</li>
                <li>- Screen size only changes layout density and label strategy.</li>
                <li>- The graph math stays stable while the shell adapts.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
