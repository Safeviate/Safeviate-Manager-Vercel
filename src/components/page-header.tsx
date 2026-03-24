import type { FC, ReactNode } from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MainPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode; // For action buttons like "New Report" or "Add User"
  className?: string;
}

/**
 * A standardized header component for main page cards across the application.
 * Ensures consistent typography, spacing, and responsive layout for page titles.
 */
export const MainPageHeader: FC<MainPageHeaderProps> = ({ 
  title, 
  description, 
  actions,
  className 
}) => {
  return (
    <CardHeader 
      className={cn(
        "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 md:p-6 border-b bg-muted/5", 
        className
      )}
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-headline uppercase truncate">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs sm:text-sm font-medium text-muted-foreground max-w-2xl">
            {description}
          </CardDescription>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
          {actions}
        </div>
      )}
    </CardHeader>
  );
};

export default MainPageHeader;
