'use client';

import { useEffect } from 'react';
import { AppSidebar, AppSidebarMobile } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { AuthGuard } from '@/components/auth-guard';

let chunkReloadAttempted = false;

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleChunkError = (message: string) => {
      if (!message.includes('ChunkLoadError') && !message.includes('Loading chunk')) return;
      if (typeof window === 'undefined') return;
      if (chunkReloadAttempted) return;

      chunkReloadAttempted = true;
      const url = new URL(window.location.href);
      url.searchParams.set('__chunk_reload', Date.now().toString());
      window.location.replace(url.toString());
    };

    const onError = (event: ErrorEvent) => {
      handleChunkError(event.message || '');
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonMessage =
        typeof event.reason === 'string'
          ? event.reason
          : event.reason?.message || String(event.reason || '');
      handleChunkError(reasonMessage);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return (
    <AuthGuard>
        <SidebarProvider className="h-svh flex-col overflow-hidden overflow-x-hidden">
          <AppHeader />
          <div className="flex flex-1 min-w-0 h-full overflow-hidden overflow-x-hidden">
              {isMobile ? <AppSidebarMobile /> : <AppSidebar />}
              <SidebarInset className="flex-1 min-h-0 overflow-hidden overflow-x-hidden flex flex-col p-3 md:pb-4 md:p-4 lg:p-6">
              <div className="mx-auto flex w-full min-w-0 flex-1 max-w-none flex-col overflow-hidden overflow-x-hidden">
                  {children}
              </div>
              </SidebarInset>
          </div>
        </SidebarProvider>
    </AuthGuard>
  );
}
