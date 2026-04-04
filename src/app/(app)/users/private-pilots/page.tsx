'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { PilotProfile } from '../personnel/page';
import { PrivatePilotsTable } from './private-pilots-table';
import { PersonnelForm } from '../personnel/personnel-form';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import { usePermissions } from '@/hooks/use-permissions';
import { MainPageHeader } from '@/components/page-header';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ChevronDown, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrivatePilotsPage() {
  const isMobile = useIsMobile();
  const { hasPermission } = usePermissions();
  const { tenantId, isLoading: isProfileLoading } = useUserProfile();
  const canCreateUsers = hasPermission('users-create');

  const [privatePilots, setPrivatePilots] = useState<PilotProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    try {
      const storedPilots = localStorage.getItem('safeviate.private-pilots');
      if (storedPilots) setPrivatePilots(JSON.parse(storedPilots));
      
      const storedRoles = localStorage.getItem('safeviate.roles');
      if (storedRoles) setRoles(JSON.parse(storedRoles));
      
      const storedDepts = localStorage.getItem('safeviate.departments');
      if (storedDepts) setDepartments(JSON.parse(storedDepts));
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const isLoading = isProfileLoading || isLoadingData;

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Private Pilots"
          description="Manage all private pilots in your organization."
          actions={
            canCreateUsers && (
              <PersonnelForm 
                tenantId={tenantId || ''} 
                roles={roles || []} 
                departments={departments || []} 
                trigger={
                   <Button
                       disabled={!canCreateUsers || isProfileLoading}
                       variant={isMobile ? 'outline' : 'default'}
                       size={isMobile ? 'sm' : 'default'}
                       className={isMobile ? 'h-9 w-full justify-between border-input bg-background px-3 text-[10px] font-bold uppercase text-foreground shadow-sm hover:bg-accent/40' : 'w-full gap-2 px-6 text-xs font-black uppercase shadow-md sm:w-auto'}
                   >
                       <span className="flex items-center gap-2">
                           <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                           Add User
                       </span>
                       {isMobile ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                   </Button>
                }
              />
            )
          }
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
           {isLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <div className="text-center p-8 text-destructive font-semibold">Error: {error.message}</div>
            ) : privatePilots && (
              <PrivatePilotsTable data={privatePilots} tenantId={tenantId || ''} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
