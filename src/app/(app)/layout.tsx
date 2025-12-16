
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { AppBottomNav } from '@/components/app-bottom-nav';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-col flex-1 h-screen">
          <AppHeader />
          <SidebarInset className="p-4 lg:p-6 flex-1 overflow-y-auto pb-20 md:pb-4">
            <div className="w-full max-w-7xl mx-auto h-full">
              {children}
            </div>
          </SidebarInset>
          <AppBottomNav />
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
