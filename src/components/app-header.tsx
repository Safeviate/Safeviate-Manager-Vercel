import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-header px-4 text-header-foreground sm:px-6">
      <SidebarTrigger className="md:hidden" />
      {/* Add Header Content Here */}
    </header>
  );
}
