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
import React, { useMemo } from 'react';
import {
  menuConfig,
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
import { useTenantConfig } from '@/hooks/use-tenant-config';

const SidebarItems = () => {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();
    const { hasPermission } = usePermissions();
    const { tenant } = useTenantConfig();
  
    const filteredItems = useMemo(() => {
      const config = menuConfig.filter(
        (item) =>
          item.label !== 'Development' || process.env.NODE_ENV === 'development'
      );

      return config.filter(item => {
        // 1. Check Tenant-Level Visibility
        if (tenant?.enabledMenus && !tenant.enabledMenus.includes(item.href)) {
          return false;
        }

        // 2. Check Permission-Level Visibility
        const canAccessParent = !item.permissionId || hasPermission(item.permissionId);
        
        const visibleSubItems = item.subItems ? item.subItems.filter(sub => {
          const hasPerm = !sub.permissionId || hasPermission(sub.permissionId);
          const isTenantEnabled = !tenant?.enabledMenus || tenant.enabledMenus.includes(sub.href);
          return hasPerm && isTenantEnabled;
        }) : [];
        
        return canAccessParent || visibleSubItems.length > 0;
      });
    }, [tenant, hasPermission]);

    return (
        <SidebarMenu>
            {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isParentActive = pathname.startsWith(item.href);

                const visibleSubItems = item.subItems ? item.subItems.filter(sub => {
                    const hasPerm = !sub.permissionId || hasPermission(sub.permissionId);
                    const isTenantEnabled = !tenant?.enabledMenus || tenant.enabledMenus.includes(sub.href);
                    return hasPerm && isTenantEnabled;
                }) : [];

                let content;
                if (item.subItems && visibleSubItems.length > 0) {
                    content = (
                        <SidebarCollapsible defaultOpen={isParentActive}>
                            <SidebarCollapsibleTrigger asChild>
                                <SidebarMenuButton
                                    isActive={isParentActive && !visibleSubItems.some(sub => pathname === sub.href)}
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
                                        <SidebarMenuSubItem key={subItem.href}>
                                            <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                                                <Link 
                                                    href={subItem.href} 
                                                    onClick={() => setOpenMobile(false)}
                                                >
                                                    <span>{subItem.label}</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </SidebarCollapsibleContent>
                        </SidebarCollapsible>
                    );
                } else {
                    content = (
                        <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            tooltip={item.label}
                        >
                            <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                    );
                }

                return (
                    <React.Fragment key={item.href}>
                        <SidebarMenuItem>{content}</SidebarMenuItem>
                        {index < filteredItems.length - 1 && <SidebarSeparator className="my-0 opacity-50" />}
                    </React.Fragment>
                );
            })}
        </SidebarMenu>
    )
}

const SidebarFooterContent = () => {
    const auth = useAuth();
    const router = useRouter();
    const { setOpenMobile } = useSidebar();
    const { userProfile } = useUserProfile();

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
