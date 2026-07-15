'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftList } from './aircraft-list';
import type { Aircraft } from '@/types/aircraft';
import type { QualityAudit } from '@/types/quality';
import { CardControlHeader, HEADER_COMPACT_CONTROL_CLASS } from '@/components/page-header';
import { AddAircraftDialog } from './add-aircraft-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserProfile } from '@/hooks/use-user-profile';

const COMPLETED_AUDIT_STATUSES = new Set(['finalized', 'closed', 'archived']);

function getLastAuditDates(audits: QualityAudit[]) {
  const lastAuditDates: Record<string, string | null> = {};
  const now = Date.now();

  for (const audit of audits) {
    if (!audit.assetId || !audit.auditDate) continue;
    if (!COMPLETED_AUDIT_STATUSES.has(String(audit.status).toLowerCase())) continue;

    const auditTime = new Date(audit.auditDate).getTime();
    if (Number.isNaN(auditTime) || auditTime > now) continue;

    const currentDate = lastAuditDates[audit.assetId];
    if (!currentDate || auditTime > new Date(currentDate).getTime()) {
      lastAuditDates[audit.assetId] = audit.auditDate;
    }
  }

  return lastAuditDates;
}

export default function AircraftFleetPage() {
  const { hasPermission } = usePermissions();
  const { tenantId } = useUserProfile();
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [lastAuditDates, setLastAuditDates] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [aircraftView, setAircraftView] = useState<'active' | 'archived'>('active');

  const canManageAssets = hasPermission('assets-create') || hasPermission('assets-edit');

  const loadAircrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const [response, auditsResponse] = await Promise.all([
        fetch(`/api/aircraft${aircraftView === 'archived' ? '?view=archived' : ''}`, { cache: 'no-store' }),
        fetch('/api/quality-audits', { cache: 'no-store' }).catch(() => null),
      ]);
      const payload = await response.json().catch(() => ({ aircraft: [] }));
      const auditsPayload = auditsResponse?.ok
        ? await auditsResponse.json().catch(() => ({}))
        : {};

      setAircrafts(Array.isArray(payload.aircraft) ? payload.aircraft : []);
      setLastAuditDates(
        getLastAuditDates(Array.isArray(auditsPayload.audits) ? auditsPayload.audits : [])
      );
    } catch (e) {
      console.error('Failed to load aircrafts', e);
      setAircrafts([]);
      setLastAuditDates({});
    } finally {
      setIsLoading(false);
    }
  }, [aircraftView]);

  useEffect(() => {
    void loadAircrafts();
    window.addEventListener('safeviate-aircrafts-updated', loadAircrafts);
    return () => window.removeEventListener('safeviate-aircrafts-updated', loadAircrafts);
  }, [loadAircrafts]);

  if (isLoading) {
    return (
      <div className="lg:max-w-[1100px] mx-auto w-full space-y-6 px-1 pt-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="lg:max-w-[1100px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1 pt-4">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <CardControlHeader
          context={(
            <div className="flex min-w-0 flex-col gap-1">
              <p className="main-page-header__description text-[10px] font-medium text-muted-foreground sm:text-xs">
                Manage all aircraft in your organization's inventory.
              </p>
            </div>
          )}
          actions={canManageAssets ? (
            <div className="flex flex-wrap items-center gap-2">
              <AddAircraftDialog tenantId={tenantId || ''} />
            </div>
          ) : undefined}
          navigation={(
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild variant="outline" className={HEADER_COMPACT_CONTROL_CLASS}>
                <Link href="/assets/checklists">Checklists</Link>
              </Button>
              <Button asChild variant="default" className={HEADER_COMPACT_CONTROL_CLASS}>
                <Link href="/assets/inspections">Inspections</Link>
              </Button>
              <Button
                type="button"
                variant={aircraftView === 'archived' ? 'default' : 'outline'}
                className={HEADER_COMPACT_CONTROL_CLASS}
                onClick={() => setAircraftView((view) => view === 'active' ? 'archived' : 'active')}
              >
                {aircraftView === 'active' ? 'Archived Aircraft' : 'Active Aircraft'}
              </Button>
            </div>
          )}
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <AircraftList
            data={aircrafts || []}
            tenantId={tenantId || ''}
            canEdit={canManageAssets}
            archived={aircraftView === 'archived'}
            lastAuditDates={lastAuditDates}
          />
        </CardContent>
      </Card>
    </div>
  );
}
