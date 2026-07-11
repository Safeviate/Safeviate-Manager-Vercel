'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { Search, Clock3 } from 'lucide-react';

type ActivityLogRow = {
  id: string;
  tenantId: string;
  scope: string;
  action: 'created' | 'updated' | 'deleted' | 'archived' | 'restored' | 'submitted' | 'approved' | 'rejected' | 'published' | 'overridden';
  entityType: string;
  entityId: string;
  entityLabel: string;
  actorUserId: string | null;
  actorEmail: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

type ActivityLogResponse = {
  logs: ActivityLogRow[];
};

function formatLogTime(value: string) {
  try {
    return new Date(value).toLocaleString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function describeChange(details: Record<string, unknown> | null, action: ActivityLogRow['action']) {
  if (!details) return action === 'updated' ? 'Updated without payload details.' : 'No additional details.';

  const stringOrEmpty = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '');
  const numberOrEmpty = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : '');

  if (action !== 'updated') {
    const parts: string[] = [];
    const area = stringOrEmpty(details.area);
    const month = stringOrEmpty(details.month);
    const year = numberOrEmpty(details.year);
    const status = stringOrEmpty(details.status);

    if (area) parts.push(area);
    if (month || year) parts.push(`${month} ${year}`.trim());
    if (status) parts.push(`Status: ${status}`);
    return parts.filter(Boolean).join(' • ') || 'No additional details.';
  }

  const before = details.before as Record<string, unknown> | undefined;
  const after = details.after as Record<string, unknown> | undefined;
  const beforeText = before
    ? [stringOrEmpty(before.area), stringOrEmpty(before.month), numberOrEmpty(before.year)].filter(Boolean).join(' ')
    : '';
  const afterText = after
    ? [stringOrEmpty(after.area), stringOrEmpty(after.month), numberOrEmpty(after.year)].filter(Boolean).join(' ')
    : '';
  return [beforeText ? `From ${beforeText}` : null, afterText ? `To ${afterText}` : null].filter(Boolean).join(' • ');
}

export default function ActivityTrackerPage() {
  const { isLoading, isAllowed } = useTenantRouteAccess({ href: '/admin/activity-tracker' });
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadLogs = async () => {
      try {
        const response = await fetch('/api/admin/activity-tracker?limit=200', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as Partial<ActivityLogResponse>;
        if (!cancelled) {
          setLogs(Array.isArray(payload.logs) ? payload.logs : []);
        }
      } catch {
        if (!cancelled) {
          setLogs([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLogs(false);
        }
      }
    };

    void loadLogs();
    window.addEventListener('safeviate-audit-schedule-updated', loadLogs);
    return () => {
      cancelled = true;
      window.removeEventListener('safeviate-audit-schedule-updated', loadLogs);
    };
  }, []);

  const groupedCounts = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        acc[log.action] += 1;
        return acc;
      },
      { created: 0, updated: 0, deleted: 0, archived: 0, restored: 0, submitted: 0, approved: 0, rejected: 0, published: 0, overridden: 0 }
    );
  }, [logs]);

  if (!isLoading && !isAllowed) {
    return <TenantLayoutDisabledState />;
  }

  if (isLoading || isLoadingLogs) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-1">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-1">
      <MainPageHeader
        title="Activity Tracker"
        description="Barry-only audit schedule history for created, updated, archived, and restored items."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border shadow-none">
          <CardHeader className="space-y-1 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Created</CardDescription>
            <CardTitle className="text-2xl font-black">{groupedCounts.created}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-none">
          <CardHeader className="space-y-1 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Updated</CardDescription>
            <CardTitle className="text-2xl font-black">{groupedCounts.updated}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-none">
          <CardHeader className="space-y-1 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Archived</CardDescription>
            <CardTitle className="text-2xl font-black">{groupedCounts.archived}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-none">
          <CardHeader className="space-y-1 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Restored</CardDescription>
            <CardTitle className="text-2xl font-black">{groupedCounts.restored}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border shadow-none">
        <CardHeader className="border-b bg-muted/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-black uppercase tracking-[-0.01em]">Audit Schedule Changes</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest italic">
                Records written when audit areas or schedule items are created, updated, archived, or restored.
              </CardDescription>
            </div>
            <Badge variant="outline" className="h-6 rounded-full px-2 text-[10px] font-black uppercase">
              {logs.length} entries
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[620px] overflow-auto custom-scrollbar">
            {logs.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center p-8 text-center">
                <div className="space-y-2">
                  <Search className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-foreground">No activity logs found.</p>
                  <p className="text-xs text-muted-foreground">Once audit schedule changes are saved, they will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log) => (
                  <div key={log.id} className="grid gap-3 p-4 md:grid-cols-[180px_110px_1fr_220px] md:items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                          {formatLogTime(log.createdAt)}
                        </p>
                      </div>
                      <p className="text-[11px] font-semibold text-muted-foreground">{log.actorEmail}</p>
                    </div>

                    <div className="space-y-2">
                      <Badge
                        variant={log.action === 'deleted' ? 'destructive' : log.action === 'archived' ? 'secondary' : log.action === 'updated' ? 'secondary' : 'default'}
                        className="h-6 rounded-full px-2 text-[10px] font-black uppercase"
                      >
                        {log.action}
                      </Badge>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {log.entityType}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{log.entityLabel}</p>
                      <p className="text-xs text-muted-foreground">{describeChange(log.details, log.action)}</p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entity ID</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-foreground/80">{log.entityId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
