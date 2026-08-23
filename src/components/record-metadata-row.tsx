import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type RecordMetadataItem = {
  label: string;
  value?: ReactNode;
};

type RecordMetadataRowProps = {
  items: RecordMetadataItem[];
  className?: string;
};

/**
 * Compact, labelled context for record-detail headers.
 * Use for status, ownership, department and key record dates; do not use it
 * for large operational metrics or body-detail grids.
 */
export function RecordMetadataRow({ items, className }: RecordMetadataRowProps) {
  const visibleItems = items.filter((item) => item.value !== undefined && item.value !== null && item.value !== '');

  return (
    <dl className={cn('mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {visibleItems.map((item, index) => (
        <Fragment key={item.label}>
          <div className="space-y-0.5">
            <dt className="text-[10px] font-black uppercase leading-none tracking-widest text-muted-foreground">{item.label}</dt>
            <dd className="text-sm font-bold leading-tight text-foreground">{item.value}</dd>
          </div>
          {index < visibleItems.length - 1 ? <div aria-hidden className="hidden h-6 w-px bg-border md:block" /> : null}
        </Fragment>
      ))}
    </dl>
  );
}
