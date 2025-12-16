
'use client';

import { usePathname } from 'next/navigation';
import { menuConfig, settingsMenuItem } from '@/lib/menu-config';
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
      // Check if it's a more specific match than just the root
      if (item.href !== '/' && pathname.includes(item.href)) {
         return item;
      }
    }
  }
   // Fallback for root-level items if no specific sub-item is matched
  for (const item of items) {
    if (pathname === item.href) {
      return item;
    }
  }
  return undefined;
};


const getTitle = (pathname: string): string => {
  const allMenuItems = [...menuConfig, settingsMenuItem];
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

  // Check top-level items again for a direct match if sub-item logic fails
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
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-header px-4 text-header-foreground sm:px-6">
      <SidebarTrigger className={cn('md:hidden', !isMobile && 'hidden')} />
      {title && (
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      )}
    </header>
  );
}
