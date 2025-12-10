import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth-guard';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
          <AppHeader />
          <SidebarInset className="p-4 lg:p-6 flex-1 overflow-y-auto">
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
