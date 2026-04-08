'use client';

import type { ComponentType, ReactNode } from 'react';
import { Clock, FileText, Map as NavIcon, Scale, Settings2, ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';

type BookingDetailHeaderProps = {
  title: string;
  subtitle: string;
  status?: string | null;
  flightHours?: string | null;
  activeTab: string;
  onTabChange: (value: string) => void;
  headerAction?: ReactNode;
  tabRowAction?: ReactNode;
};

export function BookingDetailHeader({
  title,
  subtitle,
  status,
  flightHours,
  activeTab,
  onTabChange,
  headerAction,
  tabRowAction,
}: BookingDetailHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Primary Header Section (White background like Bookings History) */}
      <div className="border-b px-4 py-4 md:px-6 overflow-x-hidden">
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <h1 className="min-w-0 text-xl font-bold tracking-tight text-foreground uppercase break-words">
                {title}
              </h1>
              {status ? (
                <Badge variant={status === 'Approved' ? 'default' : 'secondary'} className="shrink-0 text-[10px] font-black uppercase">
                  {status}
                </Badge>
              ) : null}
            </div>
            <span className="block break-words text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {subtitle}
            </span>
          </div>
          {flightHours ? (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Flight Time</p>
              <p className="flex items-center gap-2 text-sm md:text-base font-black text-primary">
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
                {flightHours}h
              </p>
            </div>
          ) : null}
          {headerAction ? <div className="flex shrink-0 items-start md:self-start">{headerAction}</div> : null}
        </div>
      </div>

      {/* Navigation Sub-header (Muted background strip like Filter pins) */}
      <div className="sticky top-0 z-20 backdrop-blur-sm bg-transparent">
        <ResponsiveTabRow
          className="relative shrink-0 border-b bg-muted/5 px-4 py-3 md:px-6"
          value={activeTab}
          onValueChange={onTabChange}
          placeholder="Select Section"
          action={tabRowAction}
          joinedDesktopTabs={false}
          options={[
            { value: 'flight-details', label: 'Flight Details', icon: FileText },
            { value: 'planning', label: 'Planning', icon: Settings2 },
            { value: 'mass-balance', label: 'Mass & Balance', icon: Scale },
            { value: 'navlog', label: 'Navlog', icon: NavIcon },
            { value: 'checks', label: 'Checks', icon: ClipboardCheck },
          ]}
        />
      </div>
    </>
  );
}
