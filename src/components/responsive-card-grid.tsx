import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ResponsiveCardGridProps<T> {
  items: T[];
  isLoading: boolean;
  loadingCount?: number;
  gridClassName?: string;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  renderLoadingItem?: (index: number) => ReactNode;
  emptyState: ReactNode;
}

export function ResponsiveCardGrid<T>({
  items,
  isLoading,
  loadingCount = 3,
  gridClassName,
  className,
  renderItem,
  renderLoadingItem,
  emptyState,
}: ResponsiveCardGridProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('grid gap-4', gridClassName, className)}>
        {Array.from({ length: loadingCount }).map((_, index) => (
          renderLoadingItem ? (
            <div key={index}>{renderLoadingItem(index)}</div>
          ) : (
            <Skeleton key={index} className="h-56 w-full rounded-2xl" />
          )
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('grid gap-4', gridClassName, className)}>
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
}
