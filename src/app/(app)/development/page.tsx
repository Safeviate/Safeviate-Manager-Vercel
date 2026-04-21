'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { menuConfig } from '@/lib/menu-config';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw } from 'lucide-react';
import { formatBookingSequenceNumber } from '@/lib/booking-sequence';

type BookingSequenceSettings = {
  id: 'booking-sequence';
  nextBookingNumber: number;
  lastResetAt?: string;
};

export default function DevelopmentPage() {
  const { toast } = useToast();
  const { canAccessMenuItem } = usePermissions();
  const developmentMenu = menuConfig.find(item => item.href === '/development');
  const [bookingSequenceSettings, setBookingSequenceSettings] = useState<BookingSequenceSettings | null>(null);
  const [isLoadingSequence, setIsLoadingSequence] = useState(true);

  const loadBookingSequence = useCallback(async () => {
    setIsLoadingSequence(true);
    try {
      const response = await fetch('/api/tenant-config', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      const config = payload?.config && typeof payload.config === 'object' ? payload.config : {};
      const sequenceConfig = config['booking-sequence-settings'];

      if (sequenceConfig && typeof sequenceConfig === 'object') {
        setBookingSequenceSettings({
          id: 'booking-sequence',
          nextBookingNumber: Number((sequenceConfig as Record<string, unknown>).nextBookingNumber) || 1,
          lastResetAt: typeof (sequenceConfig as Record<string, unknown>).lastResetAt === 'string'
            ? (sequenceConfig as Record<string, unknown>).lastResetAt as string
            : undefined,
        });
      } else {
        setBookingSequenceSettings({
          id: 'booking-sequence',
          nextBookingNumber: 1,
        });
      }
    } catch (error) {
      console.error('Failed to load booking sequence', error);
      setBookingSequenceSettings({
        id: 'booking-sequence',
        nextBookingNumber: 1,
      });
    } finally {
      setIsLoadingSequence(false);
    }
  }, []);

  useEffect(() => {
    void loadBookingSequence();
    const handler = () => void loadBookingSequence();
    window.addEventListener('safeviate-booking-sequence-updated', handler);
    return () => window.removeEventListener('safeviate-booking-sequence-updated', handler);
  }, [loadBookingSequence]);

  const handleResetBookingSequence = async () => {
    const confirmed = window.confirm('Reset booking numbering back to 00001? Only do this after old bookings have been cleared or archived.');
    if (!confirmed) return;

    const nextSettings: BookingSequenceSettings = {
      id: 'booking-sequence',
      nextBookingNumber: 1,
      lastResetAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/tenant-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            'booking-sequence-settings': nextSettings,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to reset booking sequence.');
      }

      setBookingSequenceSettings(nextSettings);
      window.dispatchEvent(new Event('safeviate-booking-sequence-updated'));
      toast({ title: 'Booking Sequence Reset', description: 'The next booking number will start from 00001.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Reset Failed', description: error instanceof Error ? error.message : 'Reset failed.' });
    }
  };

  if (!developmentMenu || !developmentMenu.subItems) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Development section not configured.</p>
      </div>
    );
  }

  // We filter out the database page since we moved it
  const devSubItems = developmentMenu.subItems.filter(
    (item) => item.href !== '/development/database' && canAccessMenuItem(item, developmentMenu)
  );

  return (
      <div className="grid gap-6">
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Booking Sequence
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            Reset the booking counter after old bookings have been cleared or archived.
          </p>
        </div>

        <Card className="border shadow-none">
          <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Next Booking Number</Label>
              <p className="text-2xl font-black tracking-tight text-foreground">
                {isLoadingSequence ? '-----' : formatBookingSequenceNumber(bookingSequenceSettings?.nextBookingNumber || 1)}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                The next created booking will use this number.
              </p>
              {bookingSequenceSettings?.lastResetAt ? (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Last reset: {new Date(bookingSequenceSettings.lastResetAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={handleResetBookingSequence}
                disabled={isLoadingSequence}
              >
                <RotateCcw className="h-4 w-4" />
                Reset Sequence
              </Button>
              <p className="text-[10px] font-medium text-muted-foreground">
                This will restart the sequence for new bookings.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {devSubItems.map((item) => (
          <Link href={item.href} key={item.href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
