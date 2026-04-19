'use client';

import { usePathname, useRouter } from 'next/navigation';
import { menuConfig } from '@/lib/menu-config';
import type { MenuItem, SubMenuItem } from '@/lib/menu-config';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import React, { useState, useEffect } from 'react';

const findCurrentItem = (
  items: (MenuItem | SubMenuItem)[],
  pathname: string
): MenuItem | SubMenuItem | undefined => {
  for (const item of items) {
    if (pathname.startsWith(item.href)) {
      if ('subItems' in item && item.subItems) {
        const subItem = findCurrentItem(item.subItems, pathname);
        if (subItem) return subItem;
      }
      if (item.href !== '/' && pathname.includes(item.href)) {
         return item;
      }
    }
  }
  return undefined;
};

const getTitle = (pathname: string): string => {
  const allMenuItems = menuConfig;
  const currentItem = findCurrentItem(allMenuItems, pathname);

  if (currentItem && !('subItems' in currentItem && currentItem.subItems)) {
    return currentItem.label;
  }
  
  if (currentItem && 'subItems' in currentItem && currentItem.subItems) {
     const subItem = findCurrentItem(currentItem.subItems, pathname);
     if (subItem) {
       return subItem.label
     }
  }

  const topLevelItem = allMenuItems.find(item => item.href === pathname);
  if (topLevelItem) {
    return topLevelItem.label;
  }

  return '';
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const title = getTitle(pathname);
  const [headerOpacity, setHeaderOpacity] = useState(0.8);

  useEffect(() => {
    const handleOpacityUpdate = () => {
      const saved = localStorage.getItem('safeviate-header-opacity');
      if (saved) setHeaderOpacity(parseFloat(saved));
    };

    window.addEventListener('safeviate-header-opacity-updated', handleOpacityUpdate);
    window.addEventListener('storage', handleOpacityUpdate);
    
    // Initial load
    handleOpacityUpdate();

    return () => {
      window.removeEventListener('safeviate-header-opacity-updated', handleOpacityUpdate);
      window.removeEventListener('storage', handleOpacityUpdate);
    };
  }, []);

  return (
    <header 
      style={{ '--header-opacity': headerOpacity } as React.CSSProperties}
      className="app-topbar sticky top-0 z-20 flex h-[36px] min-w-0 items-center justify-between gap-2 border-b border-white/5 bg-header pr-3 text-header-foreground shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)] sm:pr-4"
    >
      <div className="flex min-w-0 items-center h-full">
        <div className="flex h-full w-auto shrink-0 items-center gap-2 px-4 sm:w-[--sidebar-width] md:px-4">
           <SidebarTrigger className="-ml-1 h-7 w-7 sm:hidden text-header-foreground" />
           <span className="app-sidebar-brand-label truncate font-headline text-[15px] font-semibold tracking-[-0.01em]">Safeviate</span>
        </div>
        <div className="hidden h-full w-px bg-white/10 sm:block"></div>
        <div className="flex min-w-0 items-center gap-2 px-3">
        {title && (
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] uppercase opacity-90 sm:text-[16px]">{title}</h1>
        )}
      </div>
    </div>

      <div className="app-topbar-actions flex items-center gap-1">
        <Button variant="ghost" size="icon" className="app-topbar-icon hidden h-8 w-8 md:inline-flex">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="app-topbar-icon h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="app-topbar-profile flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <Avatar className="h-6 w-6 ring-1 ring-white/10">
            <AvatarImage
              src={`https://picsum.photos/seed/${userDisplayName}/64/64`}
              alt={`${userDisplayName} profile avatar`}
            />
            <AvatarFallback>{userFallback}</AvatarFallback>
          </Avatar>
          <ChevronDown className="hidden h-3.5 w-3.5 opacity-60 md:block" />
        </div>
      </div>
    </header>
  );
}
