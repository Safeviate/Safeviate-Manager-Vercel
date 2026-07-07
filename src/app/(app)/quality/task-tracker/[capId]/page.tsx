'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardControlHeader, HEADER_COMPACT_CONTROL_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { CapTaskDetailCard, parseCapFindingLevel, parseCapObservation } from '../cap-task-detail-card';
import type { CorrectiveActionPlan, QualityAudit } from '@/types/quality';
import type { CorrectiveAction } from '@/types/safety-report';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { getPersonnelDisplayName } from '@/lib/personnel-label';
import { cn } from '@/lib/utils';

const FINDING_ROUTE_PREFIX = 'finding::';

const formatCapDueDate = (value?: string) => {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};

const getDisplayedActionsForCap = (cap: CorrectiveActionPlan) => {
  const explicitActions = Array.isArray(cap.actions) ? cap.actions : [];
  return explicitActions.filter((action) => {
    const description = action.description?.trim() || '';
    return Boolean(description && description !== 'Primary corrective action responsibility');
  });
};

const hasSavedCorrectiveAction = (cap: CorrectiveActionPlan) => {
  if (cap.rootCauseAnalysis?.trim()) {
    return true;
  }
  return getDisplayedActionsForCap(cap).length > 0;
};

const isFindingRouteId = (value: string) => value.startsWith(FINDING_ROUTE_PREFIX);

const parseFindingRouteId = (value: string) => {
  if (!isFindingRouteId(value)) return null;
  const [, auditId = '', findingId = ''] = value.split('::');
  if (!auditId || !findingId) return null;
  return { auditId, findingId };
};

export default function CapTaskDetailPage({ params }: { params: Promise<{ capId: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const { tenantId, userProfile, rolePermissions } = useUserProfile();
  const { toast } = useToast();
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/quality/task-tracker' });
  const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
  const [audits, setAudits] = useState<QualityAudit[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingCap, setIsDeletingCap] = useState(false);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
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
    if (cap) {
      const audit = audits.find((item) => item.id === cap.auditId);
      if (!audit) return null;
      const finding = audit.findings?.find((item) => item.checklistItemId === cap.findingId);
      return {
        cap,
        audit,
        observation: parseCapObservation(finding),
        findingLevel: parseCapFindingLevel(finding),
      };
    }

    const routeFinding = parseFindingRouteId(resolvedParams.capId);
    const queryAuditId = searchParams?.get('auditId')?.trim() || '';
    const queryFindingId = searchParams?.get('findingId')?.trim() || '';
    const resolvedFinding = routeFinding || ((queryAuditId && queryFindingId) ? { auditId: queryAuditId, findingId: queryFindingId } : null);
    if (!resolvedFinding) return null;
    const audit = audits.find((item) => item.id === resolvedFinding.auditId);
    if (!audit) return null;
    const finding = audit.findings?.find((item) => item.checklistItemId === resolvedFinding.findingId);
    if (!finding) return null;
    return {
      cap: {
        id: resolvedParams.capId,
        auditId: audit.id,
        findingId: resolvedFinding.findingId,
        rootCauseAnalysis: '',
        status: 'Open',
        actions: [],
        responsiblePersonId: '',
        dueDate: audit.auditDate,
        responses: [],
        tenantId,
      } satisfies CorrectiveActionPlan,
      audit,
      observation: parseCapObservation(finding),
      findingLevel: parseCapFindingLevel(finding),
    };
  }, [audits, caps, resolvedParams.capId, searchParams, tenantId]);

  const relatedCaps = useMemo(() => {
    if (!capEntry) return [];
    return caps
      .filter((item) => item.auditId === capEntry.cap.auditId && item.findingId === capEntry.cap.findingId)
      .filter((item) => hasSavedCorrectiveAction(item))
      .sort((left, right) => {
        if (left.id === capEntry.cap.id) return -1;
        if (right.id === capEntry.cap.id) return 1;
        return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
      });
  }, [capEntry, caps]);

  const isDraftFindingOnly = useMemo(
    () => Boolean(capEntry && isFindingRouteId(capEntry.cap.id) && relatedCaps.length === 0 && !hasSavedCorrectiveAction(capEntry.cap)),
    [capEntry, relatedCaps]
  );

  const hasAnySavedCorrectiveActions = relatedCaps.length > 0;

  useEffect(() => {
    if (hasAnySavedCorrectiveActions) {
      setIsEditorVisible(true);
    }
  }, [hasAnySavedCorrectiveActions, resolvedParams.capId]);

  const handleAddCorrectiveAction = async () => {
    if (!hasAnySavedCorrectiveActions) {
      setIsEditorVisible(true);
      return;
    }
    await handleCreateAdditionalCap();
    setIsEditorVisible(true);
  };

  const handleCreateAdditionalCap = async () => {
    if (!capEntry) return;
    const sourceCap = capEntry.cap;
    const nextCap: CorrectiveActionPlan = {
      id: isFindingRouteId(sourceCap.id) ? sourceCap.id : crypto.randomUUID(),
      auditId: sourceCap.auditId,
      findingId: sourceCap.findingId,
      rootCauseAnalysis: '',
      status: 'Open',
      responsiblePersonId: sourceCap.responsiblePersonId || '',
      dueDate: sourceCap.dueDate || capEntry.audit.auditDate,
      actions: [],
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
      const payload = await response.json().catch(() => null);
      const savedCap = payload?.cap as CorrectiveActionPlan | undefined;
      window.dispatchEvent(new Event('safeviate-quality-updated'));
      setCaps((current) => [{ ...(savedCap || nextCap), tenantId }, ...current.filter((item) => item.id !== (savedCap?.id || nextCap.id))]);
      if (savedCap?.id && savedCap.id !== resolvedParams.capId) {
        window.history.replaceState({}, '', `/quality/task-tracker/${savedCap.id}`);
      }
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
                <p className="text-[11px] font-medium leading-3.5 text-muted-foreground">Review the finding, manage its CAPs, and maintain the related corrective actions and responses.</p>
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
                <Button type="button" variant="outline" className={HEADER_COMPACT_CONTROL_CLASS} onClick={() => void handleAddCorrectiveAction()}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Corrective Action
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
          <div className="mb-4 rounded-lg border border-card-border bg-background">
            <div className="border-b border-card-border bg-muted/20 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Audit Finding</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{capEntry.observation}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Open the finding, then assign one or more corrective actions with an assignee and completion date.</p>
                </div>
                <Button type="button" variant="outline" className={HEADER_COMPACT_CONTROL_CLASS} onClick={() => void handleAddCorrectiveAction()}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Corrective Action
                </Button>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {relatedCaps.map((relatedCap, index) => {
                const ownerLabel = getPersonnelDisplayName(personnel, relatedCap.responsiblePersonId || '') || 'Unassigned';
                const dueDate = formatCapDueDate(relatedCap.dueDate || capEntry.audit.auditDate);
                const isCurrentCap = relatedCap.id === capEntry.cap.id;
                const displayedActions = getDisplayedActionsForCap(relatedCap);
                return (
                  <div key={relatedCap.id} className={cn("rounded-lg border px-3 py-3", isCurrentCap ? "border-card-border bg-muted/10" : "border-card-border bg-background")}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Saved Assignment {index + 1}</p>
                          {isCurrentCap ? (
                            <Badge variant="outline" className="h-6 border-card-border bg-background px-2 text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
                              Current
                            </Badge>
                          ) : null}
                          <Badge variant="outline" className="h-6 border-card-border bg-background px-2 text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
                            {relatedCap.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {relatedCap.rootCauseAnalysis?.trim() || 'No corrective action description recorded yet.'}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-md border bg-background px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">CAP Owner</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{ownerLabel}</p>
                        </div>
                        <div className="rounded-md border bg-background px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Due Date</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{dueDate ? format(parseLocalDate(dueDate), 'dd MMM yy') : 'Not set'}</p>
                        </div>
                        <div className="rounded-md border bg-background px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Saved Items</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{displayedActions.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {displayedActions.length > 0 ? displayedActions.map((action, actionIndex) => {
                        const assigneeLabel = getPersonnelDisplayName(personnel, action.responsiblePersonId || '') || 'Unassigned';
                        const actionDueDate = formatCapDueDate(action.deadline || dueDate);
                        const isPrimaryAction = action.id === '__primary__';
                        return (
                          <div key={`${relatedCap.id}:${action.id}`} className="rounded-md border border-card-border bg-background px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                {isPrimaryAction ? 'Saved Primary Action' : `Saved Additional Action ${actionIndex}`}
                              </p>
                              <Badge variant="outline" className="h-6 border-card-border bg-background px-2 text-[10px] font-black uppercase tracking-[0.08em] text-foreground">
                                {action.status}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {action.description?.trim() || 'No corrective action description recorded yet.'}
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <div className="rounded-md border bg-muted/10 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Assignee</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{assigneeLabel}</p>
                              </div>
                              <div className="rounded-md border bg-muted/10 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Deadline</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{actionDueDate ? format(parseLocalDate(actionDueDate), 'dd MMM yy') : 'Not set'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="rounded-md border border-dashed border-card-border bg-muted/5 px-3 py-4 text-sm text-muted-foreground">
                          No corrective actions recorded yet for this CAP.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {isEditorVisible ? (
            <CapTaskDetailCard
              cap={capEntry.cap}
              audit={capEntry.audit}
              observation={capEntry.observation}
              findingLevel={capEntry.findingLevel}
              personnel={personnel}
              currentUserId={userProfile?.id}
              currentUserName={`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email || userProfile?.id || 'Unknown user'}
              rolePermissions={rolePermissions}
              onDeleteCap={() => void handleDeleteCap()}
              canDeleteCap={canDeleteCaps}
              isDeletingCap={isDeletingCap}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
