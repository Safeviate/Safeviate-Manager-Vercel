import { AppSidebar, AppSidebarTrigger } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebarTrigger />
      <AppSidebar />
      <SidebarInset className="p-4 lg:p-6">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
