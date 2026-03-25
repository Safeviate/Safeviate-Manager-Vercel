import type { FC, ReactNode } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MainPageHeaderProps {
  title: string;
  actions?: ReactNode; // For action buttons like "New Report" or "Add User"
  className?: string;
}

/**
 * A standardized header component for main page cards across the application.
 * Ensures consistent typography, spacing, and responsive layout for page titles.
 * Automatically handles action buttons in a separate bordered, scrollable row.
 */
export const MainPageHeader: FC<MainPageHeaderProps> = ({ 
  title, 
  actions,
  className 
}) => {
  return (
    <div className={cn("flex flex-col w-full shrink-0", className)}>
      <CardHeader 
        className="flex flex-row items-center justify-between p-4 md:p-6 border-b bg-muted/5"
      >
        <CardTitle className="text-[13px] uppercase font-black tracking-wider text-muted-foreground whitespace-nowrap">
          {title}
        </CardTitle>
      </CardHeader>
      
      {actions && (
        <div className="w-full overflow-x-auto no-scrollbar border-b bg-muted/5">
          <div className="flex flex-row flex-nowrap items-center gap-2 w-max px-4 md:px-6 py-3">
            {actions}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPageHeader;