'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GraphPoint = { x: number; y: number };

const generateNiceTicks = (min: number | string, max: number | string, stepCount = 6) => {
  const start = Number(min);
  const end = Number(max);
  if (isNaN(start) || isNaN(end) || start >= end) return [];
  const diff = end - start;
  const roughStep = diff / (stepCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  let step;
  if (normalizedStep < 1.5) step = 1 * magnitude;
  else if (normalizedStep < 3) step = 2 * magnitude;
  else if (normalizedStep < 7) step = 5 * magnitude;
  else step = 10 * magnitude;
  const ticks = [];
  let current = Math.ceil(start / step) * step;
  if (current > start) ticks.push(start);
  while (current <= end) {
    ticks.push(current);
    current += step;
  }
  return ticks;
};

const formatTick = (value: number) => {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

export function MassBalanceEnvelopeChart({
  envelope,
  currentPoint,
  xMin,
  xMax,
  yMin,
  yMax,
  isSafe,
  isMobile,
  className,
}: {
  envelope: GraphPoint[];
  currentPoint: GraphPoint;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  isSafe: boolean;
  isMobile: boolean;
  className?: string;
}) {
  const svgContainerRef = useRef<HTMLDivElement | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchCenterRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const width = 1000;
  const height = isMobile ? 760 : 620;
  const padding = isMobile
    ? { top: 28, right: 16, bottom: 64, left: 40 }
    : { top: 24, right: 28, bottom: 64, left: 64 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const initialView = useMemo(
    () => ({ xMin, xMax, yMin, yMax }),
    [xMin, xMax, yMin, yMax]
  );
  const [view, setView] = useState(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const clampView = useCallback((next: { xMin: number; xMax: number; yMin: number; yMax: number }) => {
    const initialXSpan = Math.max(initialView.xMax - initialView.xMin, 1);
    const initialYSpan = Math.max(initialView.yMax - initialView.yMin, 1);
    const minXSpan = initialXSpan / 8;
    const minYSpan = initialYSpan / 8;
    const maxXSpan = initialXSpan * 1.1;
    const maxYSpan = initialYSpan * 1.1;

    const xSpan = Math.min(maxXSpan, Math.max(minXSpan, next.xMax - next.xMin));
    const ySpan = Math.min(maxYSpan, Math.max(minYSpan, next.yMax - next.yMin));
    const xCenter = (next.xMin + next.xMax) / 2;
    const yCenter = (next.yMin + next.yMax) / 2;

    let boundedXMin = xCenter - xSpan / 2;
    let boundedXMax = xCenter + xSpan / 2;
    let boundedYMin = yCenter - ySpan / 2;
    let boundedYMax = yCenter + ySpan / 2;

    if (boundedXMin < initialView.xMin) {
      boundedXMin = initialView.xMin;
      boundedXMax = boundedXMin + xSpan;
    }
    if (boundedXMax > initialView.xMax) {
      boundedXMax = initialView.xMax;
      boundedXMin = boundedXMax - xSpan;
    }
    if (boundedYMin < initialView.yMin) {
      boundedYMin = initialView.yMin;
      boundedYMax = boundedYMin + ySpan;
    }
    if (boundedYMax > initialView.yMax) {
      boundedYMax = initialView.yMax;
      boundedYMin = boundedYMax - ySpan;
    }

    return { xMin: boundedXMin, xMax: boundedXMax, yMin: boundedYMin, yMax: boundedYMax };
  }, [initialView]);

  const clientPointToDomain = useCallback((clientX: number, clientY: number) => {
    const bounds = svgContainerRef.current?.getBoundingClientRect();
    if (!bounds) {
      return {
        x: (view.xMin + view.xMax) / 2,
        y: (view.yMin + view.yMax) / 2,
      };
    }

    const px = Math.min(Math.max(clientX - bounds.left, 0), bounds.width);
    const py = Math.min(Math.max(clientY - bounds.top, 0), bounds.height);
    const xRatio = bounds.width > 0 ? px / bounds.width : 0.5;
    const yRatio = bounds.height > 0 ? py / bounds.height : 0.5;

    return {
      x: view.xMin + xRatio * (view.xMax - view.xMin),
      y: view.yMax - yRatio * (view.yMax - view.yMin),
    };
  }, [view]);

  const zoomAtPoint = useCallback((factor: number, center?: { x: number; y: number }) => {
    const focus = center || {
      x: (view.xMin + view.xMax) / 2,
      y: (view.yMin + view.yMax) / 2,
    };

    setView(clampView({
      xMin: focus.x - (focus.x - view.xMin) * factor,
      xMax: focus.x + (view.xMax - focus.x) * factor,
      yMin: focus.y - (focus.y - view.yMin) * factor,
      yMax: focus.y + (view.yMax - focus.y) * factor,
    }));
  }, [clampView, view]);

  const projectX = (value: number) =>
    padding.left + ((value - view.xMin) / Math.max(view.xMax - view.xMin, 1)) * innerWidth;
  const projectY = (value: number) =>
    padding.top + innerHeight - ((value - view.yMin) / Math.max(view.yMax - view.yMin, 1)) * innerHeight;

  const xTicks = generateNiceTicks(view.xMin, view.xMax, isMobile ? 4 : 7);
  const yTicks = generateNiceTicks(view.yMin, view.yMax, isMobile ? 4 : 6);
  const polygonPoints = envelope.map((point) => `${projectX(point.x)},${projectY(point.y)}`).join(' ');
  const pointX = projectX(currentPoint.x);
  const pointY = projectY(currentPoint.y);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomAtPoint(event.deltaY < 0 ? 0.85 : 1.15, clientPointToDomain(event.clientX, event.clientY));
  }, [clientPointToDomain, zoomAtPoint]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      const [first, second] = Array.from(event.touches);
      pinchDistanceRef.current = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      pinchCenterRef.current = {
        clientX: (first.clientX + second.clientX) / 2,
        clientY: (first.clientY + second.clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const [first, second] = Array.from(event.touches);
    const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    const center = {
      clientX: (first.clientX + second.clientX) / 2,
      clientY: (first.clientY + second.clientY) / 2,
    };

    if (pinchDistanceRef.current) {
      const ratio = pinchDistanceRef.current / distance;
      zoomAtPoint(
        Math.min(1.18, Math.max(0.82, ratio)),
        clientPointToDomain(
          pinchCenterRef.current?.clientX ?? center.clientX,
          pinchCenterRef.current?.clientY ?? center.clientY
        )
      );
    }

    pinchDistanceRef.current = distance;
    pinchCenterRef.current = center;
  }, [clientPointToDomain, zoomAtPoint]);

  const handleTouchEnd = useCallback(() => {
    pinchDistanceRef.current = null;
    pinchCenterRef.current = null;
  }, []);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={svgContainerRef}
        className={cn(
          'relative w-full overflow-hidden rounded-lg border bg-gradient-to-b from-background to-muted/10 touch-none',
          isMobile ? 'aspect-[10/11]' : 'aspect-[16/10]'
        )}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute right-2 top-2 z-20 flex items-center gap-2 rounded-full border bg-background/95 px-2 py-2 shadow-sm backdrop-blur">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-8 px-2 text-xs font-black"
            onClick={() => zoomAtPoint(0.85)}
          >
            +
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-8 px-2 text-xs font-black"
            onClick={() => zoomAtPoint(1.15)}
          >
            -
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-[10px] font-black uppercase"
            onClick={() => setView(initialView)}
          >
            Reset
          </Button>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Mass and balance chart">
          {yTicks.map((tick) => {
            const y = projectY(tick);
            return (
              <g key={`y-${tick}`}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="hsl(var(--border))" strokeDasharray="6 6" strokeWidth="1.5" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize={isMobile ? 20 : 18} fill="hsl(var(--muted-foreground))" fontWeight="700">
                  {formatTick(tick)}
                </text>
              </g>
            );
          })}

          {xTicks.map((tick) => {
            const x = projectX(tick);
            return (
              <g key={`x-${tick}`}>
                <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="hsl(var(--border))" strokeDasharray="6 6" strokeWidth="1.5" />
                <text x={x} y={height - padding.bottom + 26} textAnchor="middle" fontSize={isMobile ? 20 : 18} fill="hsl(var(--muted-foreground))" fontWeight="700">
                  {formatTick(tick)}
                </text>
              </g>
            );
          })}

          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="hsl(var(--foreground) / 0.45)" strokeWidth="2" />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="hsl(var(--foreground) / 0.45)" strokeWidth="2" />

          {polygonPoints ? (
            <>
              <polygon points={polygonPoints} fill="hsl(var(--primary) / 0.05)" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="4" strokeLinejoin="round" />
              {envelope.map((point, index) => (
                <circle
                  key={`${point.x}-${point.y}-${index}`}
                  cx={projectX(point.x)}
                  cy={projectY(point.y)}
                  r={isMobile ? 10 : 8}
                  fill={['#f97316', '#60a5fa', '#eab308', '#8b5cf6', '#ec4899'][index % 5]}
                  stroke="white"
                  strokeWidth="3"
                />
              ))}
            </>
          ) : null}

          {Number.isFinite(currentPoint.x) && Number.isFinite(currentPoint.y) ? (
            <>
              <circle cx={pointX} cy={pointY} r={isMobile ? 11 : 9} fill={isSafe ? '#10b981' : '#ef4444'} stroke="white" strokeWidth="4" />
              <circle cx={pointX} cy={pointY} r={isMobile ? 4 : 3} fill="rgba(0,0,0,0.9)" />
            </>
          ) : null}

          {!isMobile ? (
            <>
              <text x={width / 2} y={height - 18} textAnchor="middle" fontSize="18" fontWeight="800" fill="hsl(var(--foreground) / 0.8)">
                CG (INCHES)
              </text>
              <text x="20" y={height / 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="hsl(var(--foreground) / 0.8)" transform={`rotate(-90 20 ${height / 2})`}>
                WEIGHT (LBS)
              </text>
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
