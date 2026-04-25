'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { menuConfig } from '@/lib/menu-config';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw } from 'lucide-react';
import { formatBookingSequenceNumber } from '@/lib/booking-sequence';
import { parseJsonResponse } from '@/lib/safe-json';

type BookingSequenceSettings = {
  id: 'booking-sequence';
  nextBookingNumber: number;
  lastResetAt?: string;
};

type DevelopmentDiagnostics = {
  tenantId: string | null;
  tenantName: string | null;
  roleCount: number;
  roleNames: string[];
  meStatus: number | null;
  rolesStatus: number | null;
  rolesLoaded: boolean;
};

const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || 'local-dev';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || 'local build';

const PERFORMANCE_ROADMAP = [
  {
    title: '1. Finish CLS / Theme Stability',
    detail:
      'Keep first paint stable by aligning default and tenant formatting, reserving header/card space, and removing late layout-affecting theme passes.',
  },
  {
    title: '2. Trim Heavy First Renders',
    detail:
      'Render the page shell first, defer below-the-fold sections, and avoid mounting large trees before the user asks for them.',
  },
  {
    title: '3. Expand Safe Live Caching',
    detail:
      'Cache tenant config, aircraft/personnel reference lists, and dashboard summary payloads with short-lived tenant-scoped invalidation.',
  },
  {
    title: '4. Add Query-Level Hotspot Detection',
    detail:
      'Use Simulation Lab and route telemetry to surface expensive reads, repeated queries, and slow request paths before optimizing blindly.',
  },
  {
    title: '5. Optimize the Hottest Routes',
    detail:
      'Refactor the measured bottlenecks first using smaller selects, batched reads, and precomputed rollups where the app is actually under pressure.',
  },
  {
    title: '6. Decide on Archiving at Scale',
    detail:
      'Once seeded runs prove record-volume pressure, archive older bookings, telemetry, and historical records without affecting live operations.',
  },
];

export default function DevelopmentPage() {
  const { toast } = useToast();
  const { canAccessMenuItem } = usePermissions();
  const developmentMenu = menuConfig.find(item => item.href === '/development');
  const [bookingSequenceSettings, setBookingSequenceSettings] = useState<BookingSequenceSettings | null>(null);
  const [isLoadingSequence, setIsLoadingSequence] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DevelopmentDiagnostics | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(true);

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

  const loadDiagnostics = useCallback(async () => {
    setIsLoadingDiagnostics(true);
    try {
      const [meResponse, rolesResponse] = await Promise.all([
        fetch('/api/me', { cache: 'no-store' }),
        fetch('/api/roles', { cache: 'no-store' }),
      ]);
      const [mePayload, rolesPayload] = await Promise.all([
        parseJsonResponse<{
          tenant?: {
            id?: string | null;
            name?: string | null;
          } | null;
        }>(meResponse),
        parseJsonResponse<{ roles?: { name?: string | null }[] }>(rolesResponse),
      ]);
      const roleNames = Array.isArray(rolesPayload?.roles)
        ? rolesPayload!.roles
            .map((role) => (typeof role?.name === 'string' ? role.name.trim() : ''))
            .filter(Boolean)
        : [];

      setDiagnostics({
        tenantId: mePayload?.tenant?.id || null,
        tenantName: mePayload?.tenant?.name || null,
        roleCount: roleNames.length,
        roleNames,
        meStatus: meResponse.status,
        rolesStatus: rolesResponse.status,
        rolesLoaded: rolesResponse.ok,
      });
    } catch (error) {
      console.error('Failed to load development diagnostics', error);
      setDiagnostics({
        tenantId: null,
        tenantName: null,
        roleCount: 0,
        roleNames: [],
        meStatus: null,
        rolesStatus: null,
        rolesLoaded: false,
      });
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }, []);

  useEffect(() => {
    void loadBookingSequence();
    void loadDiagnostics();
    const handler = () => void loadBookingSequence();
    window.addEventListener('safeviate-booking-sequence-updated', handler);
    window.addEventListener('safeviate-roles-updated', loadDiagnostics);
    window.addEventListener('safeviate-tenant-config-updated', loadDiagnostics);
    return () => {
      window.removeEventListener('safeviate-booking-sequence-updated', handler);
      window.removeEventListener('safeviate-roles-updated', loadDiagnostics);
      window.removeEventListener('safeviate-tenant-config-updated', loadDiagnostics);
    };
  }, [loadBookingSequence, loadDiagnostics]);

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
  const diagnosticsSummary = useMemo(() => {
    if (!diagnostics) return 'Diagnostics unavailable.';
    if (!diagnostics.rolesLoaded) return 'Unable to confirm live role menu data.';
    if (diagnostics.roleCount === 0) return 'No dynamic roles were returned for the current tenant.';
    return `${diagnostics.roleCount} dynamic roles were returned for the current tenant.`;
  }, [diagnostics]);

  return (
      <div className="grid gap-6">
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-primary">
            Build Identity
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            Confirms which commit and build artifact the app is currently serving.
          </p>
        </div>

        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-background px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Commit</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">{BUILD_SHA}</p>
              </div>
              <div className="rounded-2xl border bg-background px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Built At</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{BUILD_TIME}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-primary">
            Live Diagnostics
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            Quick verification for tenant resolution and dynamic user-role submenu data.
          </p>
        </div>

        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-background px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Tenant</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {isLoadingDiagnostics ? 'Loading...' : diagnostics?.tenantName || diagnostics?.tenantId || 'Unavailable'}
                </p>
                {diagnostics?.tenantId ? (
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {diagnostics.tenantId}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border bg-background px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">API /me</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {isLoadingDiagnostics ? 'Loading...' : diagnostics?.meStatus ?? 'Unavailable'}
                </p>
              </div>

              <div className="rounded-2xl border bg-background px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">API /roles</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {isLoadingDiagnostics ? 'Loading...' : diagnostics?.rolesStatus ?? 'Unavailable'}
                </p>
              </div>

              <div className="rounded-2xl border bg-background px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Dynamic Roles</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {isLoadingDiagnostics ? 'Loading...' : diagnostics?.roleCount ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-muted/10 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Interpretation</p>
              <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{diagnosticsSummary}</p>
              {!isLoadingDiagnostics && diagnostics?.roleNames?.length ? (
                <p className="mt-2 text-[11px] font-semibold text-foreground">
                  {diagnostics.roleNames.join(' · ')}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

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

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-primary">
            Performance Roadmap
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            Internal review path for performance work after simulation, telemetry, and live rendering checks.
          </p>
        </div>

        <Card className="border shadow-none">
          <CardContent className="p-5">
            <div className="grid gap-3">
              {PERFORMANCE_ROADMAP.map((step) => (
                <div key={step.title} className="rounded-2xl border bg-background px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{step.detail}</p>
                </div>
              ))}
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
