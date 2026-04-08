'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';

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
      className={cn(
        HEADER_SECONDARY_BUTTON_CLASS,
        className
      )}
    >
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" />
        {text}
      </Link>
    </Button>
  );
}
