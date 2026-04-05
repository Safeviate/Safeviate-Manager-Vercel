'use client';

import { usePathname, useRouter } from 'next/navigation';
import { menuConfig } from '@/lib/menu-config';
import type { MenuItem, SubMenuItem } from '@/lib/menu-config';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getBackConfig } from '@/lib/back-navigation';

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

  const segments = pathname.split('/').filter(Boolean);
  const isDetailPage = segments.length >= 3;

  const backConfig = getBackConfig(pathname);

  const handleBack = () => {
    if (backConfig.href) {
      router.push(backConfig.href);
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center gap-3 border-b bg-header px-3 text-header-foreground sm:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        {isDetailPage ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBack}
            className="rounded-md font-black uppercase text-sm border-slate-300 px-4 h-9 shadow-none transition-all shrink-0 whitespace-nowrap text-button-primary hover:text-button-primary"
          >
            {backConfig.text}
          </Button>
        ) : (
          <SidebarTrigger className={cn(isMobile ? '' : 'hidden')} />
        )}
      </div>
      
      {!isDetailPage && title && (
        <h1 className="truncate text-base font-bold tracking-tight sm:text-lg uppercase opacity-90">{title}</h1>
      )}
    </header>
  );
}
