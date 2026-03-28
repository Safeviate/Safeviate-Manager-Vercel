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
import { Plane, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { useMemo } from 'react';
import {
  menuConfig,
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
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { usePermissions } from '@/hooks/use-permissions';
import { firebaseConfig } from '@/firebase/config';

const SidebarItems = () => {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();
    const { tenant } = useTenantConfig();
    const { userProfile } = useUserProfile();
    const { hasPermission } = usePermissions();

    const isAviation = tenant?.industry?.startsWith('Aviation') ?? true;
  
    const filteredItems = useMemo(() => {
      return menuConfig.filter(item => {
        // 1. Check Industry modularity constraints
        const isAviationOnly = item.href.includes('/bookings') || item.href.includes('/assets') || item.href.includes('/admin/mb-config');
        if (!isAviation && isAviationOnly) return false;

        // 2. Check Tenant-level module enablement
        const isEnabledByTenant = !tenant?.enabledMenus || tenant.enabledMenus.includes(item.href);
        if (!isEnabledByTenant) return false;

        // 3. Check User-level override (hidden menus)
        const isHiddenByUser = userProfile?.accessOverrides?.hiddenMenus?.includes(item.href);
        if (isHiddenByUser) return false;

        // 4. Check Role-level permissions
        if (item.permissionId && !hasPermission(item.permissionId)) return false;

        return true;
      });
    }, [tenant, userProfile, hasPermission, isAviation]);

    return (
        <SidebarMenu>
            {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isParentActive = pathname.startsWith(item.href);

                const subItems = (item.subItems || []).filter(sub => {
                    // Check industry modularity for subitems
                    const isAviationOnlySub = sub.href.includes('/training/student-progress');
                    if (!isAviation && isAviationOnlySub) return false;

                    const isSubHidden = userProfile?.accessOverrides?.hiddenMenus?.includes(sub.href);
                    if (isSubHidden) return false;
                    
                    const isSubEnabledByTenant = !tenant?.enabledMenus || tenant.enabledMenus.includes(sub.href);
                    if (!isSubEnabledByTenant) return false;

                    if (sub.permissionId && !hasPermission(sub.permissionId)) return false;
                    return true;
                });

                let content;
                if (subItems.length > 0) {
                    content = (
                        <SidebarCollapsible defaultOpen={isParentActive}>
                            <SidebarCollapsibleTrigger asChild>
                                <SidebarMenuButton
                                    isActive={isParentActive && !subItems.some(sub => pathname === sub.href)}
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
                                    {subItems.map((subItem) => (
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
                    className="w-full h-auto py-2 justify-start items-center gap-3"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={`https://picsum.photos/seed/${displayName}/100/100`} />
                      <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 items-start overflow-hidden group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-bold truncate w-full">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate w-full opacity-60">
                        {firebaseConfig.projectId}
                      </span>
                    </div>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[9px] font-mono opacity-50 uppercase tracking-tighter">
                    Project: {firebaseConfig.projectId}
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
          </SidebarMenu>
        </SidebarGroup>
    )
}

export function AppSidebarMobile() {
    const { openMobile, setOpenMobile } = useSidebar();
    const isMobile = useIsMobile();
    const { tenant } = useTenantConfig();
  
    if (!isMobile) return null;

    const isAviation = tenant?.industry?.startsWith('Aviation') ?? true;
  
    return (
      <SidebarMobile open={openMobile} onOpenChange={setOpenMobile}>
        <SidebarMobileContent>
          <SheetHeader>
            <SheetTitle className="sr-only">Main Menu</SheetTitle>
          </SheetHeader>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                {isAviation ? (
                  <Plane className="size-5 text-primary-foreground" />
                ) : (
                  <ShieldCheck className="size-5 text-primary-foreground" />
                )}
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
  const { tenant } = useTenantConfig();
  const isAviation = tenant?.industry?.startsWith('Aviation') ?? true;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            {isAviation ? (
              <Plane className="size-5 text-primary-foreground" />
            ) : (
              <ShieldCheck className="size-5 text-primary-foreground" />
            )}
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
