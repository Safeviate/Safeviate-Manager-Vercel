'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PenTool, Eraser, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecureSignaturePadProps {
  onSign: (signatureBase64: string, credentials: { pin: string }) => Promise<void>;
  title?: string;
  description?: string;
  declarationText?: string;
}

export function SecureSignaturePad({
  onSign,
  title = "Electronic Signature",
  description = "Aviation regulations (FAA AC 120-78B / EASA) require physical electronic signatures and identity re-verification for traceability.",
  declarationText = "I certify under penalty of perjury that the work described was performed in accordance with current regulations and is approved for return to service.",
}: SecureSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [pin, setPin] = useState('');
  const [intentConfirmed, setIntentConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Handle Resize for canvas
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        // Keep height relative, or fixed. We'll use fixed in CSS but set width to avoid stretching
        const context = canvas.getContext('2d');
        if (context) {
          context.lineWidth = 2;
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.strokeStyle = 'black';
        }
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    // Prevent scrolling while signing
    if ('touches' in e) {
       e.preventDefault(); 
       clientX = e.touches[0].clientX;
       clientY = e.touches[0].clientY;
    } else {
       clientX = (e as React.MouseEvent).clientX;
       clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.closePath();
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!hasDrawn) {
      toast({ title: "Signature missing", description: "Please provide a physical signature.", variant: "destructive" });
      return;
    }
    if (!pin) {
      toast({ title: "PIN missing", description: "Authentication PIN is required to bind signature.", variant: "destructive" });
      return;
    }
    if (!intentConfirmed) {
      toast({ title: "Declaration required", description: "You must confirm your intent to sign.", variant: "destructive" });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsSubmitting(true);
    try {
      // Get base64 PNG
      const dataUrl = canvas.toDataURL('image/png');
      await onSign(dataUrl, { pin });
      clearSignature();
      setPin('');
      setIntentConfirmed(false);
    } catch (e: any) {
      toast({ title: "Signature Failed", description: e.message || "Could not process signature", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl border-2 border-slate-200">
      <CardHeader className="bg-slate-50/50 pb-4 border-b">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Physical Signature Pad */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">1. Provide Signature <span className="text-red-500">*</span></Label>
            <Button variant="ghost" size="sm" onClick={clearSignature} className="h-8 text-xs h-8 px-2 text-muted-foreground hover:text-foreground">
              <Eraser className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
          
          <div className="w-full aspect-[3/1] bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden relative touch-none cursor-crosshair group">
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 flex-col gap-2">
                <PenTool className="h-8 w-8 text-slate-400" />
                <span className="text-sm font-medium text-slate-400">Sign Here</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{ touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        {/* Identity Verification */}
        <div className="space-y-3 pt-2">
          <Label htmlFor="auth-pin" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            2. Verify Identity <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input 
              id="auth-pin" 
              type="password" 
              maxLength={6}
              placeholder="Enter your 6-digit Security PIN" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="font-mono text-center tracking-[0.5em] text-lg h-12"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">This ensures that your session was not hijacked and the signature is uniquely under your control.</p>
        </div>

        {/* Intent Declaration */}
        <div className="pt-4 border-t space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            3. Declaration of Intent <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
            <Checkbox 
              id="intent" 
              checked={intentConfirmed}
              onCheckedChange={(c) => setIntentConfirmed(c === true)}
              className="mt-1 flex-shrink-0"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="intent"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                {declarationText}
              </label>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50/50 border-t pt-4">
        <Button 
          onClick={handleSign} 
          disabled={!hasDrawn || !pin || !intentConfirmed || isSubmitting}
          className="w-full font-black uppercase tracking-wider"
          size="lg"
        >
          {isSubmitting ? 'Securing Record...' : 'Sign & Submit Record'}
        </Button>
      </CardFooter>
    </Card>
  );
}
