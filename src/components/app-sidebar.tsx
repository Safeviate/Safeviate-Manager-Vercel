'use client';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarSeparator,
  useSidebar,
  SidebarCollapsible,
  SidebarCollapsibleTrigger,
  SidebarCollapsibleContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Plane, LogOut, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { useState, useEffect } from 'react';
import {
  menuConfig,
  settingsMenuItem,
  MenuItem as MenuItemType,
} from '@/lib/menu-config';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSignOut = () => {
    if (auth) {
      signOut(auth);
    }
    router.push('/login');
  };

  const handleLinkClick = () => {
    // This function can be used for any mobile-specific logic if needed in the future
  };

  const renderMenuItem = (item: MenuItemType) => {
    const isParentActive = pathname.startsWith(item.href);
    const isDirectParentActive = pathname === item.href;

    if (item.subItems) {
      return (
        <SidebarCollapsible defaultOpen={isParentActive}>
          <SidebarCollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={isParentActive && !item.subItems.some(sub => pathname.startsWith(sub.href))}
              tooltip={item.label}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <item.icon />
                <span>{item.label}</span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]:-rotate-180" />
            </SidebarMenuButton>
          </SidebarCollapsibleTrigger>
          <SidebarCollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.href}>
                  <Link href={subItem.href}>
                    <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                      <span>{subItem.label}</span>
                    </SidebarMenuSubButton>
                  </Link>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </SidebarCollapsibleContent>
        </SidebarCollapsible>
      );
    }

    return (
      <Link href={item.href} className="w-full" onClick={handleLinkClick}>
        <SidebarMenuButton
          isActive={pathname === item.href}
          tooltip={item.label}
        >
          <item.icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </Link>
    );
  };

  const visibleMenuConfig = menuConfig.filter(
    (item) =>
      item.label !== 'Development' || process.env.NODE_ENV === 'development'
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Plane className="size-5 text-primary-foreground" />
          </div>
          <span className="font-headline text-lg">Safeviate</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator className="my-1" />
      <SidebarContent>
        <SidebarMenu>
          {visibleMenuConfig.map((item) => (
            <React.Fragment key={item.href}>
              <SidebarMenuItem>{renderMenuItem(item)}</SidebarMenuItem>
            </React.Fragment>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>{renderMenuItem(settingsMenuItem)}</SidebarMenuItem>
            <SidebarSeparator className="my-1 mx-2" />
            {isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Guest User"
                    className="w-full justify-start"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="https://picsum.photos/seed/guest-user/100/100" />
                      <AvatarFallback>G</AvatarFallback>
                    </Avatar>
                    <span className="group-data-[collapsible=icon]:hidden">
                      Guest User
                    </span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  className="w-56"
                >
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
