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
import React, { useEffect, useMemo, useState } from 'react';
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
import { SheetHeader, SheetTitle } from './ui/sheet';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { usePermissions } from '@/hooks/use-permissions';

const LAST_SUBMENU_STORAGE_KEY = 'safeviate:last-submenu-by-parent';

const getLastSubmenuByParent = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(LAST_SUBMENU_STORAGE_KEY) || '{}';
        if (!raw.trim().startsWith('{') && !raw.trim().startsWith('[')) {
            return {};
        }
        return JSON.parse(raw) as Record<string, string>;
    } catch {
        return {};
    }
};

const setLastSubmenuByParent = (parentHref: string, subHref: string) => {
    if (typeof window === 'undefined') return;
    const current = getLastSubmenuByParent();
    window.localStorage.setItem(
        LAST_SUBMENU_STORAGE_KEY,
        JSON.stringify({ ...current, [parentHref]: subHref })
    );
};

const clearLastSubmenuByParent = (parentHref: string) => {
    if (typeof window === 'undefined') return;
    const current = getLastSubmenuByParent();
    if (!(parentHref in current)) return;
    const { [parentHref]: _removed, ...rest } = current;
    window.localStorage.setItem(LAST_SUBMENU_STORAGE_KEY, JSON.stringify(rest));
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
    const lastSubmenuByParent = useMemo(() => getLastSubmenuByParent(), [pathname]);
    const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
    const [dismissedParents, setDismissedParents] = useState<Record<string, boolean>>({});
    const [departmentBasedUserSubItems, setDepartmentBasedUserSubItems] = useState<SubMenuItem[]>([]);

    useEffect(() => {
      let cancelled = false;
      const loadRoleSubmenu = async () => {
        try {
          const response = await fetch('/api/roles', { cache: 'no-store' });
          const payload = await response.json().catch(() => ({}));
          const apiRoles = (Array.isArray(payload?.roles) ? payload.roles : []) as Role[];

          const dynamicItems: SubMenuItem[] = [
            {
              href: '/users/personnel',
              label: 'All Users',
              permissionId: 'users-view',
            },
            ...apiRoles
              .filter((role) => role?.id && role?.name)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((role: Role) => ({
                href: `/users/role/${encodeURIComponent(role.id)}`,
                label: role.name,
                permissionId: 'users-view',
              })),
          ];

          if (!cancelled) setDepartmentBasedUserSubItems(dynamicItems);
        } catch {
          if (!cancelled) {
            setDepartmentBasedUserSubItems([
              { href: '/users/personnel', label: 'All Users', permissionId: 'users-view' },
            ]);
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
                const shouldBeOpen = pathname.startsWith(item.href) && pathname !== item.href;
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
      return menuConfig.filter((item) => canAccessMenuItem(item));
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
          item.href === '/users' && departmentBasedUserSubItems.length > 0
            ? departmentBasedUserSubItems
            : item.subItems || [];
        configuredSubItems
          .filter((sub) => canAccessMenuItem(sub, item))
          .forEach((sub) => prefetch(sub.href));
      });
    }, [filteredItems, departmentBasedUserSubItems, canAccessMenuItem, router]);

    return (
        <SidebarMenu>
            {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const configuredSubItems =
                  item.href === '/users'
                    ? [
                        ...(item.subItems || []),
                        ...departmentBasedUserSubItems.filter(di => 
                          !(item.subItems || []).some(si => si.href === di.href || si.label === di.label)
                        )
                      ]
                    : item.subItems || [];
                const subItems = configuredSubItems.filter((sub) => canAccessMenuItem(sub, item));
                const activeSubItem = subItems.find((sub) => pathname === sub.href || pathname === sub.href.split('?')[0]);
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
                                    isActive={!!selectedSubItem}
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
                                <SidebarMenuSub>
                                    {subItems.map((subItem) => (
                                        <SidebarMenuSubItem key={subItem.href}>
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={pathname === subItem.href || selectedSubItem?.href === subItem.href || pathname === subItem.href.split('?')[0]}
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
                        {index < filteredItems.length - 1 && (
                          <SidebarMenuItem aria-hidden="true" className="pointer-events-none">
                            <SidebarSeparator className="my-0 opacity-50" />
                          </SidebarMenuItem>
                        )}
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
                    className="w-full h-auto py-2 justify-start items-center gap-3"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={`https://picsum.photos/seed/${userDisplayName}/100/100`}
                        alt={`${userDisplayName} profile avatar`}
                      />
                      <AvatarFallback>{userFallback}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 items-start overflow-hidden group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-bold truncate w-full">
                        {userDisplayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate w-full opacity-60">
                        {session?.user?.email ?? 'Signed in'}
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
    const { tenant } = useTenantConfig();
    const { userProfile } = useUserProfile();
  
    if (!isMobile) return null;

    const isAviation = tenant?.industry?.startsWith('Aviation') ?? true;
    const userDisplayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Developer';
    const userFallback = userDisplayName.charAt(0).toUpperCase();
  
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
            <SidebarFooterContent userDisplayName={userDisplayName} userFallback={userFallback} />
          </SidebarFooter>
        </SidebarMobileContent>
      </SidebarMobile>
    );
}

export function AppSidebar() {
  const { tenant } = useTenantConfig();
  const { userProfile } = useUserProfile();
  const isAviation = tenant?.industry?.startsWith('Aviation') ?? true;
  const userDisplayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Developer';
  const userFallback = userDisplayName.charAt(0).toUpperCase();

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
        <SidebarFooterContent userDisplayName={userDisplayName} userFallback={userFallback} />
      </SidebarFooter>
    </Sidebar>
  );
}
