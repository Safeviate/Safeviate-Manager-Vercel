
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
} from '@/components/ui/sidebar';
import {
  Plane,
  LogOut,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { useState, useEffect } from 'react';
import { menuConfig, settingsMenuItem } from '@/lib/menu-config';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
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
    setOpenMobile(false);
  }

  const visibleMenuConfig = menuConfig.filter(
    (item) => item.label !== 'Development' || process.env.NODE_ENV === 'development'
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
          {visibleMenuConfig.map((item, index) => (
             <React.Fragment key={item.href}>
              <SidebarMenuItem>
                <Link href={item.href} className="w-full" onClick={handleLinkClick}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              {index < visibleMenuConfig.length - 1 && <SidebarSeparator className="my-1 mx-2" />}
            </React.Fragment>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href={settingsMenuItem.href} className="w-full" onClick={handleLinkClick}>
                <SidebarMenuButton isActive={pathname.startsWith(settingsMenuItem.href)} tooltip={settingsMenuItem.label}>
                  <settingsMenuItem.icon />
                  <span>{settingsMenuItem.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarSeparator className="my-1 mx-2" />
            {isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton tooltip="Guest User" className="w-full justify-start">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="https://picsum.photos/seed/guest-user/100/100" />
                      <AvatarFallback>G</AvatarFallback>
                    </Avatar>
                    <span className='group-data-[collapsible=icon]:hidden'>Guest User</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
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
