'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardControlHeader, HEADER_ACTION_BUTTON_CLASS, HEADER_COMPACT_CONTROL_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { CapTaskDetailCard, type CapTaskDetailCardHandle, parseCapFindingLevel, parseCapObservation } from '../cap-task-detail-card';
import type { CorrectiveActionPlan, QualityAudit } from '@/types/quality';
import type { CorrectiveAction } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { cn } from '@/lib/utils';

export default function CapTaskDetailPage({ params }: { params: Promise<{ capId: string }> }) {
  const resolvedParams = use(params);
  const { tenantId, userProfile, rolePermissions } = useUserProfile();
  const { toast } = useToast();
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/quality/task-tracker' });
  const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
  const [audits, setAudits] = useState<QualityAudit[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCap, setIsSavingCap] = useState(false);
  const [isDeletingCap, setIsDeletingCap] = useState(false);
  const capDetailRef = useRef<CapTaskDetailCardHandle | null>(null);
  const canDeleteCaps =
    rolePermissions.includes('*')
    || rolePermissions.includes('admin-view')
    || rolePermissions.includes('quality-caps-manage');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
        const summary = await response.json().catch(() => ({}));
        if (cancelled) return;
        setCaps(Array.isArray(summary.caps) ? summary.caps.filter((item: CorrectiveActionPlan) => item?.tenantId === tenantId) : []);
        setAudits(Array.isArray(summary.audits) ? summary.audits.filter((item: QualityAudit) => item?.tenantId === tenantId) : []);
        setPersonnel(Array.isArray(summary.personnel) ? summary.personnel : []);
      } catch (error) {
        console.error('Failed to load CAP task detail', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const capEntry = useMemo(() => {
    const cap = caps.find((item) => item.id === resolvedParams.capId);
    if (!cap) return null;
    const audit = audits.find((item) => item.id === cap.auditId);
    if (!audit) return null;
    const finding = audit.findings?.find((item) => item.checklistItemId === cap.findingId);
    return {
      cap,
      audit,
      observation: parseCapObservation(finding),
      findingLevel: parseCapFindingLevel(finding),
    };
  }, [audits, caps, resolvedParams.capId]);

  const handleCreateAdditionalCap = async () => {
    if (!capEntry) return;
    const sourceCap = capEntry.cap;
    const defaultAction: CorrectiveAction[] = sourceCap.actions?.length
      ? []
      : [{
          id: crypto.randomUUID(),
          description: capEntry.observation,
          responsiblePersonId: sourceCap.responsiblePersonId || '',
          deadline: sourceCap.dueDate || capEntry.audit.auditDate,
          status: 'Open',
        }];

    const nextCap: CorrectiveActionPlan = {
      id: crypto.randomUUID(),
      auditId: sourceCap.auditId,
      findingId: sourceCap.findingId,
      rootCauseAnalysis: '',
      status: 'Open',
      responsiblePersonId: sourceCap.responsiblePersonId || '',
      dueDate: sourceCap.dueDate || capEntry.audit.auditDate,
      actions: defaultAction,
      responses: [],
    };

    try {
      const response = await fetch('/api/corrective-action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cap: nextCap }),
      });
      if (!response.ok) {
        throw new Error('Failed to create additional CAP.');
      }
      window.dispatchEvent(new Event('safeviate-quality-updated'));
      setCaps((current) => [{ ...nextCap, tenantId }, ...current]);
      toast({
        title: 'Additional CAP Created',
        description: 'A sibling CAP was added for this finding.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'CAP Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create additional CAP.',
      });
    }
  };

  const handleSaveCap = async () => {
    if (!capDetailRef.current || isSavingCap) return;

    try {
      setIsSavingCap(true);
      await capDetailRef.current.save();
    } finally {
      setIsSavingCap(false);
    }
  };

  const handleDeleteCap = async () => {
    if (!capEntry || isDeletingCap) return;
    if (!window.confirm('Delete this CAP only? The audit finding and observation will remain in place. This cannot be undone.')) return;

    try {
      setIsDeletingCap(true);
      const response = await fetch(`/api/corrective-action-plans?id=${encodeURIComponent(capEntry.cap.id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to delete corrective action plan.');
      }
      window.dispatchEvent(new Event('safeviate-quality-updated'));
      toast({
        title: 'Corrective Action Deleted',
        description: 'The corrective action plan was removed.',
      });
      window.location.href = '/quality/task-tracker';
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete corrective action plan.',
      });
    } finally {
      setIsDeletingCap(false);
    }
  };

  if (!isAccessLoading && !isAllowed) {
    return <TenantLayoutDisabledState />;
  }

  if (isLoading || isAccessLoading) {
    return (
      <div className="mx-auto w-full max-w-[1100px] space-y-6 px-1 pt-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  if (!capEntry) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-1 pt-4">
        <Card className="overflow-hidden border shadow-none">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Task Not Found</CardTitle>
            <CardDescription>This CAP task could not be found for the current tenant.</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/quality/task-tracker">Back to task tracker</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-1 pt-4 pb-6">
      <Card className="overflow-hidden border shadow-none">
        <div className="sticky top-0 z-20 border-b border-card-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardControlHeader
            className="flex w-full shrink-0 flex-col bg-[hsl(var(--card-header-band-background))]"
            isMobile={false}
            context={(
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Corrective Action Task</p>
                <p className="text-[11px] font-medium leading-3.5 text-muted-foreground">Manage the CAP, associated responsibility entries, and response history on a dedicated page.</p>
              </div>
            )}
            actions={(
              <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                <Button asChild variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS}>
                  <Link href="/quality/task-tracker">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back To Task Tracker
                  </Link>
                </Button>
                <Button type="button" variant="outline" className={HEADER_COMPACT_CONTROL_CLASS} onClick={() => void handleCreateAdditionalCap()}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Another CAP
                </Button>
                {canDeleteCaps ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={HEADER_COMPACT_CONTROL_CLASS}
                    onClick={() => void handleDeleteCap()}
                    disabled={isDeletingCap}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeletingCap ? 'Deleting...' : 'Delete CAP'}
                  </Button>
                ) : null}
                <Button type="button" variant="default" className={HEADER_ACTION_BUTTON_CLASS} onClick={() => void handleSaveCap()} disabled={isSavingCap}>
                  {isSavingCap ? 'Saving...' : 'Save CAP'}
                </Button>
              </div>
            )}
            navigation={(
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" className={HEADER_COMPACT_CONTROL_CLASS}>
                    <Link href={`/quality/audits/${capEntry.audit.id}`}>Audit #{capEntry.audit.auditNumber}</Link>
                  </Button>
                  <Badge variant="outline" className="h-7 rounded-md border-card-border bg-background px-2.5 text-[9px] font-black uppercase tracking-[0.08em] text-foreground">
                    {capEntry.cap.status}
                  </Badge>
                  <div className="flex h-7 items-center gap-1.5 rounded-md border border-card-border bg-background px-2.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.08em] text-muted-foreground">Finding Level</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-foreground">{capEntry.findingLevel}</span>
                  </div>
                </div>
                <p className={cn("min-w-0 text-[11px] leading-4 text-muted-foreground", "max-w-full truncate md:max-w-[420px]")}>
                  {capEntry.observation}
                </p>
              </div>
            )}
          />
        </div>
        <CardContent className="bg-muted/5 p-4">
          <CapTaskDetailCard
            ref={capDetailRef}
            cap={capEntry.cap}
            audit={capEntry.audit}
            observation={capEntry.observation}
            findingLevel={capEntry.findingLevel}
            personnel={personnel}
            currentUserId={userProfile?.id}
            currentUserName={`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email || userProfile?.id || 'Unknown user'}
            rolePermissions={rolePermissions}
            hideInlineSave
            hideLeadSummary
          />
        </CardContent>
      </Card>
    </div>
  );
}
