import type { FC, ReactNode } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const HEADER_ACTION_BUTTON_CLASS =
  "h-11 px-8 text-[11px] font-black uppercase tracking-widest shadow-md gap-2 shrink-0 rounded-md transition-transform hover:scale-[1.02] active:scale-[0.98]";

export const HEADER_MOBILE_ACTION_BUTTON_CLASS =
  "h-9 w-full justify-between border-input bg-background px-3 text-[10px] font-bold uppercase text-foreground shadow-sm hover:bg-accent/40";

export const HEADER_TAB_LIST_CLASS =
  "bg-muted/10 h-auto p-1.5 gap-1.5 border rounded-md justify-start flex min-w-max flex-nowrap shadow-inner";

export const HEADER_TAB_TRIGGER_CLASS =
  "rounded-md px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm";

interface MainPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standardized MainPageHeader as per UI Source of Truth.
 * Layout: flex flex-col lg:flex-row lg:items-center lg:justify-between
 * Title: text-xl sm:text-2xl font-black uppercase truncate font-headline
 * Description: text-xs sm:text-sm font-medium text-muted-foreground
 */
export const MainPageHeader: FC<MainPageHeaderProps> = ({
  title,
  description,
  actions,
  className
}) => {
  return (
    <div className={cn("flex flex-col w-full shrink-0 border-b bg-muted/5", className)}>
      <CardHeader
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 md:p-6 gap-4"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="text-xl sm:text-2xl font-black uppercase truncate font-headline tracking-tight">
            {title}
          </CardTitle>
          {description ? (
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
            {actions}
          </div>
        )}
      </CardHeader>
    </div>
  );
};

export default MainPageHeader;
