'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BackNavButtonProps = {
  href: string;
  text: string;
  className?: string;
};

export function BackNavButton({ href, text, className }: BackNavButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn(
        'h-9 rounded-md border-[hsl(var(--header-border)/0.8)] bg-[hsl(var(--header-foreground)/0.08)] px-4 text-[10px] font-black uppercase tracking-tight text-header-foreground shadow-md transition-all hover:bg-[hsl(var(--header-foreground)/0.14)]',
        className
      )}
    >
      <Link href={href}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {text}
      </Link>
    </Button>
  );
}
