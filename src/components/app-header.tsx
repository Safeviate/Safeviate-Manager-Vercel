'use client';

import { usePathname, useRouter } from 'next/navigation';
import { menuConfig } from '@/lib/menu-config';
import type { MenuItem, SubMenuItem } from '@/lib/menu-config';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  const router = useRouter();
  const isMobile = useIsMobile();
  const title = getTitle(pathname);

  // Detect if we are on a detail page
  const segments = pathname.split('/').filter(Boolean);
  const isDetailPage = segments.length >= 3;

  // Logic to determine back text and navigation target
  const getBackConfig = () => {
    if (pathname.includes('/safety/safety-reports/')) return { text: 'Back to All Reports', href: '/safety/safety-reports' };
    if (pathname.includes('/assets/aircraft/')) return { text: 'Back to All Aircraft', href: '/assets/aircraft' };
    if (pathname.includes('/training/student-progress/')) return { text: 'Back to All Students', href: '/training/student-progress' };
    if (pathname.includes('/quality/audits/')) return { text: 'Back to All Audits', href: '/quality/audits' };
    return { text: 'Back', href: null }; // Default behavior is router.back()
  };

  const backConfig = getBackConfig();

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
            className="h-9 px-4 border-white/40 bg-white/10 hover:bg-white/20 text-sm font-black uppercase tracking-tight text-white rounded-md transition-all shadow-md shrink-0 whitespace-nowrap"
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
