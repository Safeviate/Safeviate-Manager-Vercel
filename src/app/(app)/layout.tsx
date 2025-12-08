import { AppSidebar, AppSidebarTrigger } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="md:hidden">
        <AppSidebarTrigger />
      </div>
      <AppSidebar />
      <SidebarInset className="p-4 lg:p-6">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
