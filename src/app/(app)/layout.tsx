
'use client';

import { AppSidebar, AppSidebarMobile } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { useIsMobile } from '@/hooks/use-mobile';

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
        <div className="flex flex-col flex-1">
          <AppHeader />
          <SidebarInset className="p-4 lg:p-6 flex-1 overflow-auto md:pb-4">
            <div className="w-full max-w-7xl mx-auto">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
