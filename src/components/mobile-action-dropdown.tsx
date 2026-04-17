'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export const MOBILE_ACTION_MENU_ITEM_CLASS =
  'flex w-full cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-700 outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const MOBILE_ACTION_MENU_CHECKED_CLASS =
  'data-[state=checked]:bg-slate-900 data-[state=checked]:text-white';

export const MOBILE_ACTION_MENU_STATE_ITEM_CLASS =
  'relative flex w-full cursor-default select-none items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-[11px] font-semibold text-slate-700 outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-slate-900 data-[state=checked]:text-white';

export const MOBILE_ACTION_MENU_CONTENT_CLASS =
  'z-[1400] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.18)]';

export const MOBILE_ACTION_MENU_TRIGGER_CLASS =
  'h-8 w-full justify-between rounded-xl border-slate-300 bg-background px-3 text-xs font-medium shadow-sm hover:bg-muted md:hidden';

interface MobileActionDropdownProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function MobileActionDropdown({ icon: Icon, label, children, className, disabled }: MobileActionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(MOBILE_ACTION_MENU_TRIGGER_CLASS, className)}
        >
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {label}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={MOBILE_ACTION_MENU_CONTENT_CLASS}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
