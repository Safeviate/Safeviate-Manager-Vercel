'use client';

import { AppSidebar, AppSidebarMobile } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { AuthGuard } from '@/components/auth-guard';
import { OverdueBookingMonitor } from '@/components/overdue-booking-monitor';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useIsMobile();
  return (
    <AuthGuard>
        <SidebarProvider className="h-svh overflow-hidden">
        {isMobile ? <AppSidebarMobile /> : <AppSidebar />}
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
            <AppHeader />
            <SidebarInset className="flex-1 min-h-0 overflow-hidden p-3 md:pb-4 md:p-4 lg:p-6">
            <div className="mx-auto flex h-full w-full max-w-[1400px] min-w-0 flex-col overflow-hidden">
                <OverdueBookingMonitor />
                {children}
            </div>
            </SidebarInset>
        </div>
        </SidebarProvider>
    </AuthGuard>
  );
}
