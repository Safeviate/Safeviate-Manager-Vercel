'use client';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
  SidebarTrigger,
  SidebarGroup,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wrench,
  Shield,
  Settings,
  Plane,
  User,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React from 'react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const managementMenuItems = [
  { href: '/students', label: 'Students', icon: Users },
  { href: '/instructors', label: 'Instructors', icon: Calendar },
  { href: '/personnel', label: 'Personnel', icon: User },
]

const operationsMenuItems = [
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/safety', label: 'Safety & Quality', icon: Shield },
]

export function AppSidebar() {
  const pathname = usePathname();

  const renderMenuItems = (items: typeof menuItems) => {
    return items.map((item, index) => (
      <React.Fragment key={item.href}>
        <SidebarMenuItem>
          <Link href={item.href} className="w-full">
            <SidebarMenuButton
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        {index < items.length - 1 && <SidebarSeparator className="my-1 mx-2" />}
      </React.Fragment>
    ));
  }

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
          <SidebarMenuItem>
            <Link href="/dashboard" className="w-full">
              <SidebarMenuButton
                isActive={pathname === '/dashboard'}
                tooltip="Dashboard"
              >
                <LayoutDashboard />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="my-1" />
        <SidebarGroup>
          <SidebarMenu>
            {managementMenuItems.map((item, index) => (
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
                {index < managementMenuItems.length - 1 && <SidebarSeparator className="my-1 mx-2" />}
              </React.Fragment>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator className="my-1" />
        <SidebarGroup>
          <SidebarMenu>
            {operationsMenuItems.map((item, index) => (
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
                {index < operationsMenuItems.length - 1 && <SidebarSeparator className="my-1 mx-2" />}
              </React.Fragment>
            ))}
          </SidebarMenu>
        </SidebarGroup>
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

export function AppSidebarTrigger() {
  return <SidebarTrigger className="fixed bottom-4 left-4 z-20" />;
}
