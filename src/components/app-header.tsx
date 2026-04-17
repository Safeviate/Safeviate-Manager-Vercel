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
      className="app-topbar sticky top-0 z-20 flex h-[44px] min-w-0 items-center justify-between gap-2 border-b border-white/5 bg-header pr-3 text-header-foreground shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)] sm:h-[48px] sm:pr-4"
    >
      <div className="app-topbar-brand flex min-w-0 items-center h-full">
        <div className="app-topbar-brand-slot flex h-full w-auto shrink-0 items-center gap-1.5 px-3 sm:w-[--sidebar-width] sm:px-4 md:px-5">
           <SidebarTrigger className="app-topbar-menu-trigger -ml-1 h-6 w-6 text-header-foreground sm:hidden" />
           <span className="app-sidebar-brand-label truncate font-headline text-[13px] font-semibold tracking-[-0.01em] sm:text-[14px]">Safeviate</span>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 flex h-full items-center justify-center px-16">
        {title && (
          <h1 className="app-topbar-title-text truncate text-[12px] font-semibold tracking-[-0.01em] uppercase opacity-90 sm:text-[13px]">
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}
