'use client';

import { Card } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';
import { MainPageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ColorThemeForm } from '../../settings/color-theme-form';

export default function PageFormatPage() {
  const { hasPermission, isLoading: isPermissionsLoading } = usePermissions();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const isDeveloperRole = ((userProfile as { role?: string } | null)?.role || '').toLowerCase() === 'dev'
    || ((userProfile as { role?: string } | null)?.role || '').toLowerCase() === 'developer';
  const canManage = isDeveloperRole || hasPermission('admin-settings-manage');

  if ((!canManage && isPermissionsLoading) || isProfileLoading || !userProfile) {
    return (
      <div className="lg:max-w-[1100px] mx-auto w-full flex flex-col gap-6 min-h-0 overflow-y-auto px-1 pb-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground bg-muted/20 px-4 py-2 border rounded-full">Access Restricted</p>
      </div>
    );
  }

  return (
    <div className="lg:max-w-[1100px] mx-auto w-full flex flex-col gap-6 min-h-0 overflow-y-auto px-1 pb-4">
      <Card className="flex flex-col overflow-hidden border shadow-none">
        <MainPageHeader
          title="Page Formatting"
          description="Refine the tenant look from one place. Start with quick palettes, then tune the advanced component colors only if needed."
        />
        <div className="bg-background">
          <ColorThemeForm showHeader={false} />
        </div>
      </Card>
    </div>
  );
}
