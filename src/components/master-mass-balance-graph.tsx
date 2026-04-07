'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn, isPointInPolygon } from '@/lib/utils';

export type MassBalanceGraphPoint = {
  x: number;
  y: number;
  label?: string;
  color?: string;
};

export type MassBalanceGraphTemplate = {
  id: string;
  name: string;
  family: string;
  xLabel: string;
  yLabel: string;
  xDomain: [number, number];
  yDomain: [number, number];
  envelope: MassBalanceGraphPoint[];
  currentPoint: MassBalanceGraphPoint;
};

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: rect.width,
        height: rect.height,
      });
    };

    update();

    const observer = new ResizeObserver(() => {
      update();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function generateTicks(min: number, max: number, targetCount: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return [];
  }

  const span = max - min;
  const roughStep = span / Math.max(targetCount - 1, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let step = magnitude;
  if (normalized < 1.5) step = 1 * magnitude;
  else if (normalized < 3) step = 2 * magnitude;
  else if (normalized < 7) step = 5 * magnitude;
  else step = 10 * magnitude;

  const ticks: number[] = [];
  let current = Math.ceil(min / step) * step;

  if (current > min) {
    ticks.push(min);
  }

  while (current <= max) {
    ticks.push(current);
    current += step;
  }

  return ticks;
}

function formatTick(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ensureClosedEnvelope(envelope: MassBalanceGraphTemplate['envelope']) {
  if (envelope.length < 2) return envelope;
  const first = envelope[0];
  const last = envelope[envelope.length - 1];
  if (first.x === last.x && first.y === last.y) return envelope;
  return [...envelope, first];
}

export function MasterMassBalanceGraph({
  template,
  currentPoint,
  showHeader = true,
  showLayoutBadge = true,
  inlineTitle = false,
  showCompactMetrics = true,
  compactHeightMode = 'default',
}: {
  template: MassBalanceGraphTemplate;
  currentPoint?: MassBalanceGraphPoint;
  showHeader?: boolean;
  showLayoutBadge?: boolean;
  inlineTitle?: boolean;
  showCompactMetrics?: boolean;
  compactHeightMode?: 'default' | 'tight';
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const measuredWidth = size.width || 960;
  const compact = measuredWidth < 560;
  const cozy = measuredWidth >= 560 && measuredWidth < 920;
  const compactMinHeight = compactHeightMode === 'tight' ? 595 : 580;
  const compactMaxHeight = compactHeightMode === 'tight' ? 655 : 640;
  const compactHeightRatio = compactHeightMode === 'tight' ? 0.65 : 0.66;
  const canvasHeight = compact
    ? Math.min(compactMaxHeight, Math.max(compactMinHeight, Math.round(measuredWidth * compactHeightRatio + 240)))
    : cozy
      ? Math.min(680, Math.max(580, Math.round(measuredWidth * 0.48 + 230)))
      : Math.min(720, Math.max(600, Math.round(measuredWidth * 0.46 + 220)));

  const canvas = {
    width: 1000,
    height: canvasHeight,
    margin: compact
      ? { top: 22, right: 18, bottom: 82, left: 44 }
      : cozy
        ? { top: 28, right: 24, bottom: 68, left: 58 }
        : { top: 30, right: 30, bottom: 74, left: 72 },
  };

  const innerWidth = canvas.width - canvas.margin.left - canvas.margin.right;
  const innerHeight = canvas.height - canvas.margin.top - canvas.margin.bottom;
  const [xMin, xMax] = template.xDomain;
  const [yMin, yMax] = template.yDomain;

  const projectX = (value: number) =>
    canvas.margin.left + ((value - xMin) / Math.max(xMax - xMin, 1)) * innerWidth;
  const projectY = (value: number) =>
    canvas.margin.top + innerHeight - ((value - yMin) / Math.max(yMax - yMin, 1)) * innerHeight;

  const envelope = useMemo(() => ensureClosedEnvelope(template.envelope), [template.envelope]);
  const envelopePath = envelope.map((point, index) => `${index === 0 ? 'M' : 'L'} ${projectX(point.x)} ${projectY(point.y)}`).join(' ');

  const xTicks = useMemo(
    () => generateTicks(xMin, xMax, compact ? 4 : cozy ? 6 : 8),
    [compact, cozy, xMin, xMax]
  );
  const yTicks = useMemo(
    () => generateTicks(yMin, yMax, compact ? 4 : cozy ? 5 : 7),
    [compact, cozy, yMin, yMax]
  );

  const activePoint = currentPoint ?? template.currentPoint;
  const current = {
    x: projectX(activePoint.x),
    y: projectY(activePoint.y),
  };

  const isSafe = isPointInPolygon(
    { x: activePoint.x, y: activePoint.y },
    envelope
  );

  const envelopeXs = envelope.map((point) => point.x);
  const cgMargin =
    envelopeXs.length > 0
      ? Math.min(
          Math.abs(activePoint.x - Math.min(...envelopeXs)),
          Math.abs(Math.max(...envelopeXs) - activePoint.x)
        )
      : null;

  const pointRadius = compact ? 6 : 7;
  const pointLabelSize = compact ? 'text-[10px]' : 'text-[11px]';
  const axisFont = compact ? 'text-[10px]' : 'text-[11px]';
  const calloutX = Math.min(
    Math.max(current.x + 18, canvas.margin.left + 8),
    canvas.width - canvas.margin.right - 134
  );
  const calloutY = Math.min(
    Math.max(current.y - 30, canvas.margin.top + 10),
    canvas.height - canvas.margin.bottom - 40
  );

  return (
    <div ref={ref} className="w-full max-w-full overflow-x-hidden">
      <Card className="overflow-hidden border shadow-none">
        <CardContent className="space-y-4 p-3 sm:p-4">
          {showHeader || !compact ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              {showHeader ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      {template.family}
                    </p>
                    {inlineTitle && (
                      <h2 className="text-lg font-black uppercase tracking-tight sm:text-xl">{template.name}</h2>
                    )}
                    {showLayoutBadge ? (
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wide">
                        {compact ? 'Compact layout' : cozy ? 'Adaptive layout' : 'Wide layout'}
                      </Badge>
                    ) : null}
                  </div>
                  {!inlineTitle ? <h2 className="text-lg font-black uppercase tracking-tight sm:text-xl">{template.name}</h2> : null}
                </div>
              ) : null}

              {!compact ? (
                <div className="grid grid-cols-2 gap-2 sm:min-w-[250px]">
                  <div className="rounded-lg border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CG</p>
                    <p className="text-base font-black tabular-nums">{activePoint.x.toFixed(2)} in</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Weight</p>
                    <p className="text-base font-black tabular-nums">{activePoint.y.toFixed(0)} lbs</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className={cn('text-base font-black uppercase', isSafe ? 'text-emerald-700' : 'text-red-700')}>
                      {isSafe ? 'Within limits' : 'Review'}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CG Margin</p>
                    <p className="text-base font-black tabular-nums">
                      {cgMargin === null ? '--' : `${cgMargin.toFixed(1)} in`}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {compact ? (
            <div className="w-full max-w-full">
              <div className="w-full space-y-4 pb-4">
              {showCompactMetrics ? (
                <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 border-t border-border/70 pt-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CG</p>
                    <p className="text-sm font-black tabular-nums">{activePoint.x.toFixed(2)} in</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Weight</p>
                    <p className="text-sm font-black tabular-nums">{activePoint.y.toFixed(0)} lbs</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className={cn('text-sm font-black uppercase', isSafe ? 'text-emerald-700' : 'text-red-700')}>
                      {isSafe ? 'Within limits' : 'Review'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CG Margin</p>
                    <p className="text-sm font-black tabular-nums">
                      {cgMargin === null ? '--' : `${cgMargin.toFixed(1)} in`}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border bg-background p-1.5">
                <div>
                  <svg
                    viewBox={`0 0 ${canvas.width} ${canvas.height}`}
                    className="block h-auto w-full"
                    role="img"
                    aria-label={`${template.name} mass and balance envelope`}
                  >
              <defs>
                <linearGradient id={`graph-bg-${template.id}`} x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width={canvas.width} height={canvas.height} fill={`url(#graph-bg-${template.id})`} rx="18" />

              {xTicks.map((tick) => {
                const x = projectX(tick);
                return (
                  <g key={`x-${tick}`}>
                    <line
                      x1={x}
                      y1={canvas.margin.top}
                      x2={x}
                      y2={canvas.height - canvas.margin.bottom}
                      stroke="#cbd5e1"
                      strokeDasharray="5 6"
                    />
                    <text x={x} y={canvas.height - 20} textAnchor="middle" className={`fill-slate-600 font-semibold ${axisFont}`}>
                      {formatTick(tick)}
                    </text>
                  </g>
                );
              })}

              {yTicks.map((tick) => {
                const y = projectY(tick);
                return (
                  <g key={`y-${tick}`}>
                    <line
                      x1={canvas.margin.left}
                      y1={y}
                      x2={canvas.width - canvas.margin.right}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeDasharray="5 6"
                    />
                    <text x={canvas.margin.left - 10} y={y + 4} textAnchor="end" className={`fill-slate-600 font-semibold ${axisFont}`}>
                      {formatTick(tick)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={canvas.margin.left}
                y1={canvas.margin.top}
                x2={canvas.margin.left}
                y2={canvas.height - canvas.margin.bottom}
                stroke="#475569"
                strokeWidth="1.5"
              />
              <line
                x1={canvas.margin.left}
                y1={canvas.height - canvas.margin.bottom}
                x2={canvas.width - canvas.margin.right}
                y2={canvas.height - canvas.margin.bottom}
                stroke="#475569"
                strokeWidth="1.5"
              />

              <text
                x={18}
                y={canvas.height / 2}
                transform={`rotate(-90 18 ${canvas.height / 2})`}
                className={`fill-slate-700 font-black uppercase tracking-wide ${compact ? 'text-[12px]' : 'text-[14px]'}`}
              >
                {template.yLabel}
              </text>
              <text
                x={canvas.width / 2}
                y={canvas.height - 6}
                textAnchor="middle"
                className={`fill-slate-700 font-black uppercase tracking-wide ${compact ? 'text-[12px]' : 'text-[14px]'}`}
              >
                {template.xLabel}
              </text>

              <path
                d={envelopePath}
                fill="none"
                stroke="#52525b"
                strokeWidth={compact ? 2.5 : 3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {envelope.map((point, index) => (
                <circle
                  key={`${point.label || 'p'}-${index}`}
                  cx={projectX(point.x)}
                  cy={projectY(point.y)}
                  r={pointRadius}
                  fill={point.color || '#6366f1'}
                  stroke="white"
                  strokeWidth="3"
                />
              ))}

              <circle cx={current.x} cy={current.y} r={pointRadius - 1} fill="black" />
              <circle cx={current.x} cy={current.y} r={pointRadius + 6} fill="none" stroke="rgba(34,197,94,0.18)" strokeWidth="6" />

              <g>
                <rect
                  x={calloutX}
                  y={calloutY}
                  rx="6"
                  ry="6"
                  width="116"
                  height="28"
                  fill="white"
                  stroke="#cbd5e1"
                />
                <text x={calloutX + 10} y={calloutY + 19} className={`fill-slate-700 font-black ${pointLabelSize}`}>
                  Current load
                </text>
              </g>
                  </svg>
                </div>
              </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-background p-1.5">
              <div>
              <svg
                viewBox={`0 0 ${canvas.width} ${canvas.height}`}
                className="block h-auto w-full"
                role="img"
                aria-label={`${template.name} mass and balance envelope`}
              >
              <defs>
                <linearGradient id={`graph-bg-${template.id}`} x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width={canvas.width} height={canvas.height} fill={`url(#graph-bg-${template.id})`} rx="18" />

              {xTicks.map((tick) => {
                const x = projectX(tick);
                return (
                  <g key={`x-${tick}`}>
                    <line
                      x1={x}
                      y1={canvas.margin.top}
                      x2={x}
                      y2={canvas.height - canvas.margin.bottom}
                      stroke="#cbd5e1"
                      strokeDasharray="5 6"
                    />
                    <text x={x} y={canvas.height - 20} textAnchor="middle" className={`fill-slate-600 font-semibold ${axisFont}`}>
                      {formatTick(tick)}
                    </text>
                  </g>
                );
              })}

              {yTicks.map((tick) => {
                const y = projectY(tick);
                return (
                  <g key={`y-${tick}`}>
                    <line
                      x1={canvas.margin.left}
                      y1={y}
                      x2={canvas.width - canvas.margin.right}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeDasharray="5 6"
                    />
                    <text x={canvas.margin.left - 10} y={y + 4} textAnchor="end" className={`fill-slate-600 font-semibold ${axisFont}`}>
                      {formatTick(tick)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={canvas.margin.left}
                y1={canvas.margin.top}
                x2={canvas.margin.left}
                y2={canvas.height - canvas.margin.bottom}
                stroke="#475569"
                strokeWidth="1.5"
              />
              <line
                x1={canvas.margin.left}
                y1={canvas.height - canvas.margin.bottom}
                x2={canvas.width - canvas.margin.right}
                y2={canvas.height - canvas.margin.bottom}
                stroke="#475569"
                strokeWidth="1.5"
              />

              <text
                x={18}
                y={canvas.height / 2}
                transform={`rotate(-90 18 ${canvas.height / 2})`}
                className={`fill-slate-700 font-black uppercase tracking-wide ${compact ? 'text-[12px]' : 'text-[14px]'}`}
              >
                {template.yLabel}
              </text>
              <text
                x={canvas.width / 2}
                y={canvas.height - 6}
                textAnchor="middle"
                className={`fill-slate-700 font-black uppercase tracking-wide ${compact ? 'text-[12px]' : 'text-[14px]'}`}
              >
                {template.xLabel}
              </text>

              <path
                d={envelopePath}
                fill="none"
                stroke="#52525b"
                strokeWidth={compact ? 2.5 : 3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {envelope.map((point, index) => (
                <circle
                  key={`${point.label || 'p'}-${index}`}
                  cx={projectX(point.x)}
                  cy={projectY(point.y)}
                  r={pointRadius}
                  fill={point.color || '#6366f1'}
                  stroke="white"
                  strokeWidth="3"
                />
              ))}

              <circle cx={current.x} cy={current.y} r={pointRadius - 1} fill="black" />
              <circle cx={current.x} cy={current.y} r={pointRadius + 6} fill="none" stroke="rgba(34,197,94,0.18)" strokeWidth="6" />

              <g>
                <rect
                  x={calloutX}
                  y={calloutY}
                  rx="6"
                  ry="6"
                  width="116"
                  height="28"
                  fill="white"
                  stroke="#cbd5e1"
                />
                <text x={calloutX + 10} y={calloutY + 19} className={`fill-slate-700 font-black ${pointLabelSize}`}>
                  Current load
                </text>
              </g>
              </svg>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
