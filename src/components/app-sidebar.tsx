'use client';
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
  SidebarHeader,
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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { LogOut, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  menuConfig,
  type SubMenuItem,
} from '@/lib/menu-config';
import type { Role } from '@/app/(app)/admin/roles/page';
import { signOut, useSession } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';

const USERS_STATIC_SUB_ITEMS: SubMenuItem[] = [
  { href: '/users/personnel', label: 'All Users', permissionId: 'users-view' },
];

let lastSubmenuByParentMemory: Record<string, string> = {};

const getLastSubmenuByParent = (): Record<string, string> => {
    return lastSubmenuByParentMemory;
};

const setLastSubmenuByParent = (parentHref: string, subHref: string) => {
    lastSubmenuByParentMemory = { ...lastSubmenuByParentMemory, [parentHref]: subHref };
};

const clearLastSubmenuByParent = (parentHref: string) => {
    if (!(parentHref in lastSubmenuByParentMemory)) return;
    const { [parentHref]: _removed, ...rest } = lastSubmenuByParentMemory;
    lastSubmenuByParentMemory = rest;
};

type SidebarSharedState = {
  tenantIndustry?: string;
  userDisplayName: string;
  userFallback: string;
};

const SidebarItems = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { setOpenMobile } = useSidebar();
    const { canAccessMenuItem } = usePermissions();
    const currentPathname = pathname ?? '';
    const lastSubmenuByParent = useMemo(() => getLastSubmenuByParent(), [pathname]);
    const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
    const [dismissedParents, setDismissedParents] = useState<Record<string, boolean>>({});
    const [roleBasedUserSubItems, setRoleBasedUserSubItems] = useState<SubMenuItem[]>([]);
    const normalizePath = (path: string) => path.replace(/\/+$/, '');

    useEffect(() => {
      let cancelled = false;
      const loadRoleSubmenu = async () => {
        try {
          const response = await fetch('/api/roles', { cache: 'no-store' });
          const payload = await response.json().catch(() => ({}));
          const apiRoles = (Array.isArray(payload?.roles) ? payload.roles : []) as Role[];

          const dynamicItems: SubMenuItem[] = [
            ...USERS_STATIC_SUB_ITEMS,
            ...apiRoles
              .filter((role) => role?.id && role?.name)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((role: Role) => ({
                href: `/users/role/${encodeURIComponent(role.id)}`,
                label: role.name,
                permissionId: 'users-view',
              })),
          ];

          if (!cancelled) setRoleBasedUserSubItems(dynamicItems);
        } catch {
          if (!cancelled) {
            setRoleBasedUserSubItems(USERS_STATIC_SUB_ITEMS);
          }
        }
      };

      void loadRoleSubmenu();
      window.addEventListener('safeviate-roles-updated', loadRoleSubmenu);
      return () => {
        cancelled = true;
        window.removeEventListener('safeviate-roles-updated', loadRoleSubmenu);
      };
    }, []);

    useEffect(() => {
        setOpenParents((current) => {
            const next = { ...current };
            for (const item of menuConfig) {
                if (!item.subItems?.length) continue;
                const shouldBeOpen = currentPathname.startsWith(item.href) && currentPathname !== item.href;
                if (shouldBeOpen) {
                    next[item.href] = true;
                } else if (next[item.href] === undefined) {
                    next[item.href] = false;
                }
            }
            return next;
        });
    }, [pathname]);
  
    const filteredItems = useMemo(() => {
      return menuConfig.filter((item) => item.href === '/dashboard' || canAccessMenuItem(item));
    }, [canAccessMenuItem]);

    useEffect(() => {
      const prefetch = (href: string) => {
        const basePath = href.split('?')[0];
        if (!basePath || basePath.includes('[')) return;
        router.prefetch(basePath);
      };

        filteredItems.forEach((item) => {
        prefetch(item.href);
        const configuredSubItems =
          item.href === '/users' && roleBasedUserSubItems.length > 0
            ? roleBasedUserSubItems
            : item.subItems || [];
          configuredSubItems
            .filter((sub) => canAccessMenuItem(sub, item))
            .forEach((sub) => prefetch(sub.href));
      });
    }, [filteredItems, roleBasedUserSubItems, canAccessMenuItem, router]);

    return (
        <SidebarMenu>
            {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const configuredSubItems =
                  item.href === '/users'
                    ? (roleBasedUserSubItems.length > 0 ? roleBasedUserSubItems : item.subItems || [])
                    : item.subItems || [];
                const subItems = configuredSubItems.filter((sub) => canAccessMenuItem(sub, item));
                const activeSubItem = subItems.find((sub) => normalizePath(currentPathname) === normalizePath(sub.href));
                const rememberedSubHref = lastSubmenuByParent[item.href];
                const rememberedSubItem = subItems.find((sub) => sub.href === rememberedSubHref);
                const isOpen = openParents[item.href] ?? false;
                const isDismissed = dismissedParents[item.href] ?? false;
                const selectedSubItem = isDismissed ? null : (activeSubItem || (isOpen ? rememberedSubItem : null) || null);
                const isParentActive = (isOpen || !!activeSubItem) && !isDismissed;

                let content;
                if (subItems.length > 0) {
                    content = (
                        <SidebarCollapsible open={isOpen}>
                            <SidebarCollapsibleTrigger asChild>
                                <SidebarMenuButton
                                    isActive={isParentActive}
                                    tooltip={item.label}
                                    className="justify-between"
                                    onClick={() => {
                                      setOpenParents((current) => {
                                        const nextOpen = !current[item.href];
                                        if (!nextOpen) {
                                          clearLastSubmenuByParent(item.href);
                                          setDismissedParents((dismissed) => ({ ...dismissed, [item.href]: true }));
                                        }
                                        if (nextOpen) {
                                          setDismissedParents((dismissed) => ({ ...dismissed, [item.href]: false }));
                                        }
                                        return { ...current, [item.href]: nextOpen };
                                      });
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out group-data-[state=open]:-rotate-180" />
                                </SidebarMenuButton>
                            </SidebarCollapsibleTrigger>
                            <SidebarCollapsibleContent>
                                <SidebarMenuSub className="mx-3 mb-1 mt-1 w-auto translate-x-0 gap-0.5 border-t-0 border-sidebar-border/25 px-2 py-0.5">
                                    {subItems.map((subItem) => (
                                        <SidebarMenuSubItem key={subItem.href} className="border-b-0">
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={normalizePath(currentPathname) === normalizePath(subItem.href) || selectedSubItem?.href === subItem.href}
                                              className="h-9 w-full translate-x-0 rounded-md bg-transparent px-3.5 py-0 text-sm leading-none font-medium tracking-[-0.01em] text-sidebar-foreground/76 transition-[background-color,color] hover:bg-sidebar-accent/20 hover:text-sidebar-foreground focus-visible:bg-sidebar-accent/20 focus-visible:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/20 data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-none data-[active=true]:hover:bg-sidebar-accent/20"
                                            >
                                                <Link
                                                  href={subItem.href}
                                                  onClick={() => {
                                                    setOpenMobile(false);
                                                    setLastSubmenuByParent(item.href, subItem.href);
                                                    setDismissedParents((dismissed) => ({ ...dismissed, [item.href]: false }));
                                                    setOpenParents((current) => ({ ...current, [item.href]: true }));
                                                  }}
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
                            isActive={normalizePath(currentPathname) === normalizePath(item.href)}
                            tooltip={item.label}
                            className="justify-start pl-2.5 pr-3"
                        >
                            <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                <Icon className="h-5 w-5" />
                                <span className="-ml-1">{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                    );
                }

                return (
                    <React.Fragment key={item.href}>
                        <SidebarMenuItem>{content}</SidebarMenuItem>
                    </React.Fragment>
                );
            })}
        </SidebarMenu>
    )
}

const SidebarFooterContent = ({ userDisplayName, userFallback }: Pick<SidebarSharedState, 'userDisplayName' | 'userFallback'>) => {
    const { data: session } = useSession();
    const { setOpenMobile } = useSidebar();

    const handleSignOut = () => {
      void signOut({ callbackUrl: '/login' });
      setOpenMobile(false);
    };
    
    return (
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={userDisplayName}
                    className="h-auto w-full justify-start gap-3 rounded-2xl border border-sidebar-border/60 bg-sidebar-accent/25 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10">
                      <AvatarImage
                        src={`https://picsum.photos/seed/${userDisplayName}/100/100`}
                        alt={`${userDisplayName} profile avatar`}
                      />
                      <AvatarFallback>{userFallback}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col items-start gap-0.5 overflow-hidden group-data-[collapsible=icon]:hidden">
                      <span className="w-full truncate text-sm font-semibold tracking-[-0.01em]">
                        {userDisplayName}
                      </span>
                      <span className="w-full truncate font-mono text-[10px] text-muted-foreground/70">
                        {session?.user?.email ?? 'Signed in'}
                      </span>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  className="w-56 rounded-2xl border border-sidebar-border/70 bg-sidebar shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
                >
                  <DropdownMenuLabel className="text-xs font-semibold tracking-[0.08em] text-sidebar-foreground/70 uppercase">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[9px] font-mono uppercase tracking-tighter text-sidebar-foreground/45">
                    Project: Vercel
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
    )
}

export function AppSidebarMobile() {
    const { openMobile, setOpenMobile } = useSidebar();
    const isMobile = useIsMobile();
    const { userProfile } = useUserProfile();
  
    if (!isMobile) return null;

    const userDisplayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Developer';
    const userFallback = userDisplayName.charAt(0).toUpperCase();
  
    return (
      <SidebarMobile open={openMobile} onOpenChange={setOpenMobile}>
        <SidebarMobileContent className="!p-0 !gap-0 overflow-hidden" aria-label="Main Menu">
          <SidebarHeader className="flex h-[44px] flex-row items-center gap-3 shrink-0 bg-header px-4">
            <SidebarTrigger className="h-8 w-8 text-header-foreground opacity-80" />
            <span className="truncate font-headline text-lg font-bold tracking-tight text-header-foreground">
              Safeviate
            </span>
          </SidebarHeader>

          <SidebarContent className="pt-0">
            <SidebarItems />
          </SidebarContent>
          <SidebarFooter>
            <SidebarFooterContent userDisplayName={userDisplayName} userFallback={userFallback} />
          </SidebarFooter>
        </SidebarMobileContent>
      </SidebarMobile>
    );
}

export function AppSidebar() {
  const { userProfile } = useUserProfile();
  const userDisplayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Developer';
  const userFallback = userDisplayName.charAt(0).toUpperCase();

  return (
    <Sidebar className="top-0 h-svh">
      <SidebarContent className="pt-[36px]">
        <SidebarItems />
      </SidebarContent>
      <SidebarFooter>
        <SidebarFooterContent userDisplayName={userDisplayName} userFallback={userFallback} />
      </SidebarFooter>
    </Sidebar>
  );
}
