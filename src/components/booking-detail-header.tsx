'use client';

import type { ComponentType, ReactNode } from 'react';
import { Clock, FileText, Map as NavIcon } from 'lucide-react';
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
    <Card className="shrink-0 overflow-hidden border shadow-none">
      <div className="border-b bg-muted/5 px-4 md:px-6 py-4">
        <p className="text-[12px] font-black uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>

      <div className="border-b bg-muted/5 px-4 md:px-6 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {status ? (
              <Badge variant={status === 'Approved' ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                {status}
              </Badge>
            ) : null}
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
        </div>
      </div>

      <div className="border-b bg-background/95 px-4 md:px-6 py-3">
        <ResponsiveTabRow
          value={activeTab}
          onValueChange={onTabChange}
          placeholder="Select Section"
          action={tabRowAction}
          options={[
            { value: 'flight-details', label: 'Flight Details', icon: FileText },
            { value: 'navlog', label: 'Navlog', icon: NavIcon },
          ]}
        />
      </div>
    </Card>
  );
}
