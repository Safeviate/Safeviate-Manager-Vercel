'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { menuConfig } from '@/lib/menu-config';
import { useSidebar } from './ui/sidebar';
import { MoreHorizontal } from 'lucide-react';

export function AppBottomNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // Show only the first 4 main items for a clean mobile UI
  const navItems = menuConfig.slice(0, 4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/80 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 p-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
        <button
            onClick={() => setOpenMobile(true)}
            className="flex flex-col items-center justify-center gap-1 p-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px]">More</span>
        </button>
      </div>
    </nav>
  );
}
