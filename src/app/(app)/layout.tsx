'use client';

import { AppSidebar, AppSidebarMobile } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { AuthGuard } from '@/components/auth-guard';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useIsMobile();
  return (
    <AuthGuard>
        <SidebarProvider>
        {isMobile ? <AppSidebarMobile /> : <AppSidebar />}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <AppHeader />
            <SidebarInset className="p-4 lg:p-6 flex-1 overflow-y-auto overflow-x-hidden md:pb-4">
            <div className="w-full max-w-[1400px] mx-auto h-full">
                {children}
            </div>
            </SidebarInset>
        </div>
        </SidebarProvider>
    </AuthGuard>
  );
}
