'use client';

import type { ComponentType, ReactNode } from 'react';
import { Clock, FileText, Map as NavIcon, Scale, Settings2, ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';

type BookingDetailHeaderProps = {
  title: string;
  subtitle: string;
  subtitleSecondary?: string;
  status?: string | null;
  approvalMeta?: string | null;
  flightHours?: string | null;
  activeTab: string;
  onTabChange: (value: string) => void;
  headerAction?: ReactNode;
  tabRowAction?: ReactNode;
};

export function BookingDetailHeader({
  title,
  subtitle,
  subtitleSecondary,
  status,
  approvalMeta,
  flightHours,
  activeTab,
  onTabChange,
  headerAction,
  tabRowAction,
}: BookingDetailHeaderProps) {
  const isMobile = useIsMobile();
  const statusLabel = status === 'Completed' ? 'Complete' : status;
  const subtitleParts = subtitleSecondary
    ? [subtitle, subtitleSecondary]
    : subtitle.includes('â€¢')
      ? subtitle.split('â€¢').map((part) => part.trim()).filter(Boolean)
      : [subtitle];

  return (
    <>
      <Card className="overflow-hidden border-b-0 shadow-none rounded-none">
        <CardContent className="px-3 py-3 md:px-4">
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <h1 className="min-w-0 break-words text-base font-black tracking-tight text-foreground uppercase md:text-lg">
                  {title}
                </h1>
                {status ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-[9px] font-medium uppercase tracking-widest text-foreground shadow-sm">
                      {statusLabel}
                    </div>
                    {approvalMeta ? (
                      <p className="max-w-[240px] text-right text-[8px] font-medium uppercase leading-tight tracking-widest text-muted-foreground md:text-[9px]">
                        {approvalMeta}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {subtitleParts.map((part, index) => (
                <span
                  key={`${part}-${index}`}
                  className="block max-w-[72ch] break-words text-[8px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground md:text-[9px]"
                >
                  {part}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2 self-start md:flex-row md:items-center md:self-auto">
              {flightHours ? (
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-medium uppercase text-muted-foreground">Flight Time</p>
                  <p className="flex items-center gap-2 text-xs md:text-sm font-medium text-primary">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    {flightHours}h
                  </p>
                </div>
              ) : null}
              {headerAction ? <div className="flex shrink-0 items-start md:self-start">{headerAction}</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Sub-header (Muted background strip like Filter pins) */}
      <div className="sticky top-0 z-20 backdrop-blur-sm bg-transparent">
        <ResponsiveTabRow
          className="relative shrink-0 rounded-none border-b bg-muted/5 px-3 py-2 md:px-4"
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
