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
  Plane,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React from 'react';
import { menuConfig, settingsMenuItem } from '@/lib/menu-config';

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
          <SidebarSeparator className="my-1 mx-2" />
          {menuConfig.map((item, index) => (
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
              {index < menuConfig.length -1 && <SidebarSeparator className="my-1 mx-2" />}
            </React.Fragment>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href={settingsMenuItem.href} className="w-full">
                <SidebarMenuButton isActive={pathname === settingsMenuItem.href} tooltip={settingsMenuItem.label}>
                  <settingsMenuItem.icon />
                  <span>{settingsMenuItem.label}</span>
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
