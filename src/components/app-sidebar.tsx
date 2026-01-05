
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
  SidebarMobile,
  SidebarMobileContent,
} from '@/components/ui/sidebar';
import { Plane, LogOut, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { SheetHeader, SheetTitle } from './ui/sheet';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';

const SidebarItems = () => {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();
    const { hasPermission } = usePermissions();
  
    const renderMenuItem = (item: MenuItemType) => {
      if (item.permissionId && !hasPermission(item.permissionId)) {
        return null;
      }
      
      const isParentActive = pathname.startsWith(item.href);
      const Icon = item.icon;
  
      if (item.subItems) {
        const visibleSubItems = item.subItems.filter(sub => !sub.permissionId || hasPermission(sub.permissionId));
        if (visibleSubItems.length === 0) {
            return null; // Don't render parent if no sub-items are visible
        }

        return (
          <SidebarCollapsible defaultOpen={isParentActive}>
            <SidebarCollapsibleTrigger asChild>
              <SidebarMenuButton
                isActive={isParentActive && !visibleSubItems.some(sub => pathname.startsWith(sub.href))}
                tooltip={item.label}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]:-rotate-180" />
              </SidebarMenuButton>
            </SidebarCollapsibleTrigger>
            <SidebarCollapsibleContent>
              <SidebarMenuSub>
                {visibleSubItems.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.href} onClick={() => setOpenMobile(false)}>
                    <Link href={subItem.href}>
                      <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
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
        <Link href={item.href} className="w-full" onClick={() => setOpenMobile(false)}>
          <SidebarMenuButton
            isActive={pathname === item.href}
            tooltip={item.label}
          >
            <Icon className="h-5 w-5" />
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
        <SidebarMenu>
            {visibleMenuConfig.map((item, index) => (
            <React.Fragment key={item.href}>
                <SidebarMenuItem>{renderMenuItem(item)}</SidebarMenuItem>
                {index > 0 && index < visibleMenuConfig.length - 1 && item.subItems && <SidebarSeparator />}
            </React.Fragment>
            ))}
        </SidebarMenu>
    )
}

const SidebarFooterContent = () => {
    const auth = useAuth();
    const router = useRouter();
    const { setOpenMobile } = useSidebar();
    const { userProfile } = useUserProfile();
    const { hasPermission } = usePermissions();

    const handleSignOut = () => {
      if (auth) {
        signOut(auth);
      }
      localStorage.removeItem('impersonatedUser');
      setOpenMobile(false);
      router.push('/login');
    };
    
    const displayName = userProfile 
      ? `${userProfile.firstName} ${userProfile.lastName}` 
      : 'Developer';

    const fallback = displayName.charAt(0).toUpperCase();

    return (
        <SidebarGroup>
          <SidebarMenu>
            {settingsMenuItem.permissionId && hasPermission(settingsMenuItem.permissionId) && (
              <>
              <SidebarMenuItem>
                  <Link href={settingsMenuItem.href} className="w-full" onClick={() => setOpenMobile(false)}>
                      <SidebarMenuButton
                          isActive={usePathname().startsWith(settingsMenuItem.href)}
                          tooltip={settingsMenuItem.label}
                      >
                          <settingsMenuItem.icon className="h-5 w-5" />
                          <span>{settingsMenuItem.label}</span>
                      </SidebarMenuButton>
                  </Link>
              </SidebarMenuItem>
              <SidebarSeparator className="my-1 mx-2" />
              </>
            )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={displayName}
                    className="w-full justify-start"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`https://picsum.photos/seed/${displayName}/100/100`} />
                      <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <span className="group-data-[collapsible=icon]:hidden truncate">
                      {displayName}
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
          </SidebarMenu>
        </SidebarGroup>
    )
}

export function AppSidebarMobile() {
    const { openMobile, setOpenMobile } = useSidebar();
    const isMobile = useIsMobile();
  
    if (!isMobile) return null;
  
    return (
      <SidebarMobile open={openMobile} onOpenChange={setOpenMobile}>
        <SidebarMobileContent>
          <SheetHeader>
            <SheetTitle className="sr-only">Main Menu</SheetTitle>
          </SheetHeader>
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
            <SidebarItems />
          </SidebarContent>
          <SidebarFooter>
            <SidebarFooterContent />
          </SidebarFooter>
        </SidebarMobileContent>
      </SidebarMobile>
    );
}

export function AppSidebar() {
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
        <SidebarItems />
      </SidebarContent>
      <SidebarFooter>
        <SidebarFooterContent />
      </SidebarFooter>
    </Sidebar>
  );
}
