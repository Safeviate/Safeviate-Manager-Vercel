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
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Settings,
  Plane,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React from 'react';

const mainMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/management', label: 'Management', icon: Users },
  { href: '/operations', label: 'Operations', icon: Wrench },
]

export function AppSidebar() {
  const pathname = usePathname();

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
      <SidebarContent>
        <SidebarMenu>
          {mainMenuItems.map((item, index) => (
             <React.Fragment key={item.href}>
              <SidebarMenuItem>
                <Link href={item.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              {index < mainMenuItems.length -1 && <SidebarSeparator className="my-1 mx-2" />}
            </React.Fragment>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/settings" className="w-full">
                <SidebarMenuButton isActive={pathname === '/settings'} tooltip="Settings">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarSeparator className="my-1 mx-2" />
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Guest User">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="https://picsum.photos/seed/guest-user/100/100" />
                  <AvatarFallback>G</AvatarFallback>
                </Avatar>
                <span>Guest User</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
