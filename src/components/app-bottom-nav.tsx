
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { menuConfig, settingsMenuItem, type MenuItem } from '@/lib/menu-config';
import { MoreHorizontal, ChevronDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from './ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from './ui/button';

export function AppBottomNav() {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Show only the first 4 main items for a clean mobile UI
  const visibleNavItems = menuConfig.slice(0, 4);
  const hiddenNavItems = menuConfig.slice(4);

  const renderMenuItem = (item: MenuItem) => {
    if (item.subItems) {
      return (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="group flex w-full items-center justify-between gap-3 p-3 text-base font-medium text-foreground"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
              <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-8 flex flex-col border-l py-2 pl-4">
              {item.subItems.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className="rounded-md p-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setIsSheetOpen(false)}
                >
                  {subItem.label}
                </Link>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link
        href={item.href}
        className="flex items-center gap-3 rounded-md p-3 text-base font-medium text-foreground hover:bg-muted"
        onClick={() => setIsSheetOpen(false)}
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/80 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around">
        {visibleNavItems.map((item) => {
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

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 p-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px]">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-lg">
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 py-4">
              {[...hiddenNavItems, settingsMenuItem].map((item, index) => (
                <div key={item.href}>
                  {index > 0 && <Separator />}
                  {renderMenuItem(item)}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
