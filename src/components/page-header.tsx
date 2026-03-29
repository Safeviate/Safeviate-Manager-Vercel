import type { FC, ReactNode } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
