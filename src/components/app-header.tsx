'use client';

import { usePathname } from 'next/navigation';
import { menuConfig } from '@/lib/menu-config';
import type { MenuItem, SubMenuItem } from '@/lib/menu-config';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
  for (const item of items) {
    if (pathname === item.href) {
      return item;
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
  const isMobile = useIsMobile();
  const title = getTitle(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 min-w-0 items-center gap-3 border-b bg-header px-3 text-header-foreground sm:px-6">
      <SidebarTrigger className={cn(isMobile ? '' : 'hidden')} />
      {title && (
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
      )}
    </header>
  );
}
