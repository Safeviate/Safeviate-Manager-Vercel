'use client';

import type { ReactNode } from 'react';
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

function splitSubtitle(subtitle: string, subtitleSecondary?: string) {
  if (subtitleSecondary) {
    return [subtitle, subtitleSecondary];
  }

  return subtitle
    .replace(/Ã¢â‚¬Â¢|â€¢/g, '•')
    .split('•')
    .map((part) => part.trim())
    .filter(Boolean);
}

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
  const subtitleParts = splitSubtitle(subtitle, subtitleSecondary);
  const approvalParts = approvalMeta ? splitSubtitle(approvalMeta) : [];
  const primarySubtitle = subtitleParts[0];
  const secondarySubtitleParts = subtitleParts.slice(1);

  return (
    <>
      <Card className="overflow-hidden rounded-none border-0 shadow-none">
        <CardContent className="px-3 py-2.5 md:px-4 md:py-3">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="min-w-0 break-words text-[13px] font-black uppercase tracking-tight text-foreground md:text-lg">
                  {title}
                </h1>
                {primarySubtitle ? (
                  <span className="min-w-0 break-words text-[13px] font-black uppercase tracking-tight text-foreground/90 md:text-lg">
                    {primarySubtitle}
                  </span>
                ) : null}
              </div>

              {!isMobile && secondarySubtitleParts.length > 0 ? (
                <div className="space-y-0.5">
                  {secondarySubtitleParts.map((part, index) => (
                    <span
                      key={`${part}-${index}`}
                      className="block max-w-[72ch] break-words text-[8px] font-medium capitalize leading-4 tracking-normal text-muted-foreground md:text-[9px]"
                    >
                      {part}
                    </span>
                  ))}
                </div>
              ) : null}

              {!isMobile && approvalMeta ? (
                <p className="max-w-[72ch] break-words text-[8px] font-medium capitalize leading-tight tracking-normal text-muted-foreground md:text-[9px]">
                  {approvalMeta}
                </p>
              ) : null}

              {isMobile ? (
                <div className="space-y-1.5">
                  {secondarySubtitleParts.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {secondarySubtitleParts.map((part, index) => (
                        <span
                          key={`${part}-${index}`}
                          className="min-w-0 break-words text-[8px] font-medium capitalize leading-4 tracking-normal text-muted-foreground"
                        >
                          {part}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {approvalParts.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                      {approvalParts.map((part, index) => (
                        <p
                          key={`${part}-${index}`}
                          className="whitespace-nowrap text-[8px] font-medium capitalize leading-tight tracking-normal text-muted-foreground"
                        >
                          {part}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {headerAction ? <div className="flex shrink-0 items-start">{headerAction}</div> : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 self-start md:flex-row md:items-center md:self-auto">
              {flightHours ? (
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-medium text-muted-foreground">Flight Time</p>
                  <p className="flex items-center gap-2 text-xs font-medium text-primary md:text-sm">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    {flightHours}h
                  </p>
                </div>
              ) : null}
              {!isMobile && headerAction ? <div className="flex shrink-0 items-start md:self-start">{headerAction}</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Sub-header (Muted background strip like Filter pins) */}
      <div className="sticky top-0 z-20 bg-transparent backdrop-blur-sm">
        <ResponsiveTabRow
          className="relative shrink-0 rounded-none border-b border-t border-card-border/70 bg-muted/5 px-3 py-2 md:px-4"
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
