'use client';

import type { ComponentType, ReactNode } from 'react';
import { Clock, FileText, Map as NavIcon, Scale, Settings2 } from 'lucide-react';
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
  tabRowAction?: ReactNode;
};

export function BookingDetailHeader({
  title,
  subtitle,
  status,
  flightHours,
  activeTab,
  onTabChange,
  tabRowAction,
}: BookingDetailHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Primary Header Section (White background like Bookings History) */}
      <div className="border-b px-4 md:px-6 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
              {title}
            </h1>
            <div className="flex items-center gap-3">
              {status ? (
                <Badge variant={status === 'Approved' ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                  {status}
                </Badge>
              ) : null}
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {subtitle}
              </span>
            </div>
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
        </div>
      </div>

      {/* Navigation Sub-header (Muted background strip like Filter pins) */}
      <div className="bg-muted/20 px-4 md:px-6 py-3 sticky top-0 z-20 backdrop-blur-sm">
        <div className="relative">
          <ResponsiveTabRow
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
            ]}
          />
        </div>
      </div>
    </>
  );
}
