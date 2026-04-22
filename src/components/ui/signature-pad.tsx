'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onSignatureEnd: (dataUrl: string) => void;
  initialDataUrl?: string | null;
  resetSignal?: number;
  width?: number | string;
  height?: number;
  className?: string;
  isReadOnly?: boolean;
}

export function SignaturePad({ onSignatureEnd, initialDataUrl, resetSignal, width = "100%", height = 200, className, isReadOnly = false }: SignaturePadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(!!initialDataUrl);

  const getPosition = (event: MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();

    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    if (event.touches && event.touches[0]) {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    const { x, y } = getPosition(event.nativeEvent);
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.beginPath();
      context.moveTo(x, y);
      setIsDrawing(true);
      setHasSigned(true);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isReadOnly) return;
    const { x, y } = getPosition(event.nativeEvent);
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.lineTo(x, y);
      context.stroke();
    }
  };

  const endDrawing = () => {
    if (isReadOnly) return;
    const context = canvasRef.current?.getContext('2d');
    if (context) {
        context.closePath();
    }
    setIsDrawing(false);
    if (canvasRef.current) {
        onSignatureEnd(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    if (isReadOnly) return;
    const context = canvasRef.current?.getContext('2d');
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasSigned(false);
      onSignatureEnd('');
    }
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
        const rect = container.getBoundingClientRect();
        // Use a small buffer to ensure it fits within the border
        const targetWidth = Math.floor(rect.width);
        
        if (canvas.width !== targetWidth || canvas.height !== height) {
            canvas.width = targetWidth;
            canvas.height = height;

            const context = canvas.getContext('2d');
            if (context) {
                context.strokeStyle = '#000';
                context.lineWidth = 2;
                context.lineCap = 'round';
                context.lineJoin = 'round';
                
                if (initialDataUrl) {
                    const img = new Image();
                    img.onload = () => {
                        context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    }
                    img.src = initialDataUrl;
                }
            }
        }
    }
  }, [initialDataUrl, height]);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

  useEffect(() => {
    if (typeof resetSignal !== 'number') return;
    clearSignature();
  }, [resetSignal]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden w-full", className)} style={{ height }}>
      <canvas
        ref={canvasRef}
        className={cn("border rounded-md bg-white block w-full h-full", isReadOnly ? "cursor-not-allowed" : "cursor-crosshair")}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      {!isReadOnly && (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-7 w-7"
            onClick={clearSignature}
            disabled={!hasSigned}
        >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Clear Signature</span>
        </Button>
      )}
    </div>
  );
}
