'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  ListChecks,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader, HEADER_COMPACT_CONTROL_CLASS } from '@/components/page-header';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { cn } from '@/lib/utils';
import type { AuditScheduleItem, AuditScheduleStatus } from '@/types/quality';

type CalendarEventType = 'audit' | 'checklist' | 'task';

type CalendarEvent = AuditScheduleItem & {
  type: CalendarEventType;
};

const EVENT_TYPES: Array<{
  value: CalendarEventType;
  label: string;
  icon: typeof ClipboardCheck;
  className: string;
}> = [
  { value: 'audit', label: 'Audits', icon: ClipboardCheck, className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300' },
  { value: 'checklist', label: 'Checklists', icon: ListChecks, className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300' },
  { value: 'task', label: 'Tasks', icon: Check, className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300' },
];

const STATUS_CLASS: Record<AuditScheduleStatus, string> = {
  Scheduled: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
  'Not Scheduled': 'border-muted bg-muted text-muted-foreground',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parsePlannedDate = (plannedDate: string) => new Date(`${plannedDate}T12:00:00`);

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(date);

const formatDay = (date: Date) =>
  new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);

const eventTypeConfig = (type: CalendarEventType) => EVENT_TYPES.find((item) => item.value === type)!;

export default function CompanyCalendarPage() {
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/dashboard/calendar' });
  const { hasPermission } = usePermissions();
  const canViewAudits = hasPermission('quality-audit-schedule-view');
  const canViewChecklists = hasPermission('quality-checklists-view');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(() => new Set(['audit', 'checklist', 'task']));
  const [activeStatuses, setActiveStatuses] = useState<Set<AuditScheduleStatus>>(() => new Set(['Scheduled', 'Pending', 'Completed']));

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const sources: Array<{ type: CalendarEventType; response: Promise<Response> }> = [];
      if (canViewAudits) {
        sources.push(
          { type: 'audit', response: fetch('/api/audit-schedule', { cache: 'no-store' }) },
          { type: 'task', response: fetch('/api/audit-schedule?scope=tasks', { cache: 'no-store' }) },
        );
      }
      if (canViewChecklists) {
        sources.push({ type: 'checklist', response: fetch('/api/audit-schedule?scope=checklists', { cache: 'no-store' }) });
      }

      const responses = await Promise.all(sources.map(async ({ type, response }) => {
        const resolved = await response;
        const payload = await resolved.json().catch(() => null);
        if (!resolved.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to load calendar entries.');
        }
        return {
          type,
          items: Array.isArray(payload?.items) ? payload.items as AuditScheduleItem[] : [],
        };
      }));

      setEvents(responses.flatMap(({ type, items }) => items
        .filter((item) => Boolean(item.plannedDate))
        .map((item) => ({ ...item, type }))));
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load company calendar', error);
      setLoadError(error instanceof Error ? error.message : 'Unable to load calendar entries.');
    } finally {
      setIsLoading(false);
    }
  }, [canViewAudits, canViewChecklists]);

  useEffect(() => {
    void loadEvents();
    window.addEventListener('safeviate-audit-schedule-updated', loadEvents);
    return () => window.removeEventListener('safeviate-audit-schedule-updated', loadEvents);
  }, [loadEvents]);

  const visibleEvents = useMemo(() => events.filter((event) =>
    activeTypes.has(event.type) && activeStatuses.has(event.status)
  ), [activeStatuses, activeTypes, events]);

  const eventsByDate = useMemo(() => visibleEvents.reduce<Record<string, CalendarEvent[]>>((result, event) => {
    if (!event.plannedDate) return result;
    const key = event.plannedDate.slice(0, 10);
    result[key] = [...(result[key] || []), event];
    return result;
  }, {}), [visibleEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [currentMonth]);

  const selectedEvents = eventsByDate[toDateKey(selectedDate)] || [];
  const unscheduledCount = events.filter((event) => !event.plannedDate && activeTypes.has(event.type)).length;

  const toggleType = (type: CalendarEventType) => setActiveTypes((current) => {
    const next = new Set(current);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });

  const toggleStatus = (status: AuditScheduleStatus) => setActiveStatuses((current) => {
    const next = new Set(current);
    next.has(status) ? next.delete(status) : next.add(status);
    return next;
  });

  if (!isAccessLoading && !isAllowed) {
    return <TenantLayoutDisabledState />;
  }

  if (isAccessLoading || isLoading) {
    return <Skeleton className="h-full min-h-[460px] w-full" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-auto px-1">
      <Card className="w-full overflow-hidden border shadow-none">
        <MainPageHeader
          title="Company Calendar"
          description="Quality audits, checklists, and standalone tasks due across the company."
          actions={(
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const today = new Date();
                setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDate(today);
              }} className={HEADER_COMPACT_CONTROL_CLASS}>
                Today
              </Button>
              <Button asChild variant="outline" size="sm" className={HEADER_COMPACT_CONTROL_CLASS}>
                <Link href="/quality/audit-schedule">
                  <ExternalLink className="h-3.5 w-3.5" /> Quality Schedule
                </Link>
              </Button>
            </div>
          )}
        />

        <CardContent className="space-y-4 p-3 md:p-4">
          {loadError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
              {loadError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-md border bg-muted/15 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Show</span>
              {EVENT_TYPES.map((type) => {
                const Icon = type.icon;
                const count = events.filter((event) => event.type === type.value && event.plannedDate).length;
                const isActive = activeTypes.has(type.value);
                return (
                  <Button key={type.value} type="button" variant="outline" size="sm" onClick={() => toggleType(type.value)} className={cn(
                    'h-7 gap-1.5 px-2.5 text-[10px] font-black uppercase tracking-[0.08em]',
                    isActive && type.className,
                  )}>
                    <Icon className="h-3.5 w-3.5" /> {type.label} ({count})
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Status</span>
              {(['Scheduled', 'Pending', 'Completed'] as AuditScheduleStatus[]).map((status) => (
                <Button key={status} type="button" variant="outline" size="sm" onClick={() => toggleStatus(status)} className={cn(
                  'h-7 px-2.5 text-[10px] font-black uppercase tracking-[0.08em]',
                  activeStatuses.has(status) && STATUS_CLASS[status],
                )}>
                  {status}
                </Button>
              ))}
              {unscheduledCount > 0 ? (
                <span className="ml-auto text-xs text-muted-foreground">{unscheduledCount} item{unscheduledCount === 1 ? '' : 's'} without a planned date</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="icon" aria-label="Previous month" onClick={() => setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm font-bold">
              <CalendarDays className="h-4 w-4 text-muted-foreground" /> {formatMonth(currentMonth)}
            </div>
            <Button type="button" variant="outline" size="icon" aria-label="Next month" onClick={() => setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 border-b bg-muted/30">
                {WEEKDAYS.map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">{day}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((date) => {
                  const dateKey = toDateKey(date);
                  const dayEvents = eventsByDate[dateKey] || [];
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isSelected = dateKey === toDateKey(selectedDate);
                  const isToday = dateKey === toDateKey(new Date());
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        'min-h-[112px] border-b border-r p-2 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                        !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                        isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/60',
                      )}
                    >
                      <span className={cn('mb-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold', isToday && 'bg-primary text-primary-foreground')}>
                        {date.getDate()}
                      </span>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => {
                          const config = eventTypeConfig(event.type);
                          return <div key={`${event.type}-${event.id}`} className={cn('truncate rounded border px-1.5 py-1 text-[9px] font-bold leading-tight', config.className)}>{event.area}</div>;
                        })}
                        {dayEvents.length > 2 ? <div className="px-1 text-[10px] font-semibold text-muted-foreground">+{dayEvents.length - 2} more</div> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-muted/10">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <div>
                <p className="text-sm font-bold">{formatDay(selectedDate)}</p>
                <p className="text-xs text-muted-foreground">{selectedEvents.length} scheduled item{selectedEvents.length === 1 ? '' : 's'}</p>
              </div>
              <Link href="/quality/audit-schedule" className="text-xs font-semibold text-primary hover:underline">Manage schedule</Link>
            </div>
            {selectedEvents.length > 0 ? (
              <div className="divide-y">
                {selectedEvents.map((event) => {
                  const config = eventTypeConfig(event.type);
                  return (
                    <div key={`${event.type}-${event.id}`} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                      <Badge variant="outline" className={cn('h-5 px-1.5 text-[9px] font-black uppercase tracking-[0.08em]', config.className)}>{config.label.slice(0, -1)}</Badge>
                      <span className="min-w-0 flex-1 text-sm font-medium">{event.area}</span>
                      <Badge variant="outline" className={cn('h-5 px-1.5 text-[9px] font-bold', STATUS_CLASS[event.status])}>{event.status}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-3 py-5 text-sm text-muted-foreground">No scheduled quality work on this date.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
