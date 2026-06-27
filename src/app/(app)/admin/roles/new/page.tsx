'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from '@/components/page-header';
import { RoleForm } from '../role-form';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function NewRolePage() {
  const { tenantId } = useUserProfile();

  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col gap-6 px-1 pt-4">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border shadow-none">
        <MainPageHeader title="Add Role" />
        <CardContent className="flex-1 overflow-auto p-4 md:p-6">
          <RoleForm tenantId={tenantId || ''} mode="page" />
        </CardContent>
      </Card>
    </div>
  );
}
