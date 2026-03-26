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
        'h-9 rounded-md border-white/40 bg-white/10 px-4 text-[10px] font-black uppercase tracking-tight text-white shadow-md transition-all hover:bg-white/20',
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
