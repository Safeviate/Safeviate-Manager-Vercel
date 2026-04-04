'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PersonnelForm } from './personnel-form';
import { Card, CardContent } from '@/components/ui/card';
import type { Role } from '../../admin/roles/page';
import type { Department } from '../../admin/department/page';
import { PersonnelTable } from './personnel-table';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { ChevronDown, PlusCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { HEADER_ACTION_BUTTON_CLASS, HEADER_MOBILE_ACTION_BUTTON_CLASS, MainPageHeader } from '@/components/page-header';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/use-user-profile';

export type UserAccessOverrides = {
  hiddenMenus?: string[];
  hiddenTabs?: string[];
};

export type PilotProfile = {
  id: string;
  userType: 'Student' | 'Private Pilot' | 'Instructor';
  userNumber?: string; // For billing/Sage identification
  firstName: string;
  lastName: string;
  email: string;
  role: string; // role ID
  organizationId?: string | null; // Associated external company ID
  permissions?: string[]; // Consolidating permissions across all user types
  accessOverrides?: UserAccessOverrides;
  contactNumber?: string;
  dateOfBirth?: string;
  logbookTemplateId?: string;
  isErpIncerfaContact?: boolean; // Designated ERP INCERFA contact
  isErpAlerfaContact?: boolean; // Designated ERP ALERFA contact
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  documents?: {
    name: string;
    url: string;
    uploadDate: string;
    expirationDate?: string | null;
  }[];
  pilotLicense?: {
    licenseNumber?: string;
    issueDate?: string;
    expirationDate?: string;
    ratings?: string[];
    endorsements?: string[];
  }
};

export type Personnel = {
  id: string;
  userType: 'Personnel' | 'External';
  userNumber?: string; // For billing/Sage identification
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  organizationId?: string | null; // Associated external company ID
  department?: string; // department ID
  role: string; // role ID
  permissions: string[];
  accessOverrides?: UserAccessOverrides;
  dateOfBirth?: string;
  isErpIncerfaContact?: boolean; // Designated ERP INCERFA contact
  isErpAlerfaContact?: boolean; // Designated ERP ALERFA contact
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  documents?: {
    name: string;
    url: string;
    uploadDate: string;
    expirationDate?: string | null;
  }[];
};

export default function PersonnelPage() {
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { hasPermission } = usePermissions();
  const { tenantId, isLoading: isProfileLoading } = useUserProfile();
  const canCreateUsers = hasPermission('users-create');
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [externalOrgs, setExternalOrgs] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadLocalRoleAndDepartmentFallback = () => {
      if (typeof window === 'undefined') return;
      try {
        const storedRoles = window.localStorage.getItem('safeviate.roles');
        const storedDepartments = window.localStorage.getItem('safeviate.departments');
        const localRoles = storedRoles ? (JSON.parse(storedRoles) as Role[]) : [];
        const localDepartments = storedDepartments ? (JSON.parse(storedDepartments) as Department[]) : [];
        if (!cancelled) {
          if (localRoles.length > 0) setRoles(localRoles);
          if (localDepartments.length > 0) setDepartments(localDepartments);
        }
      } catch {
        // Ignore malformed local data
      }
    };

    const load = async () => {
      setIsLoadingData(true);
      try {
        const response = await fetch('/api/personnel', { cache: 'no-store' });
        const payload = await response.json();
        if (!cancelled) {
          setPersonnel(payload.personnel ?? []);
          const apiRoles = payload.roles ?? [];
          const apiDepartments = payload.departments ?? [];
          setRoles(apiRoles);
          setDepartments(apiDepartments);
          setExternalOrgs([]);
          setDataError(null);

          if (apiRoles.length === 0 || apiDepartments.length === 0) {
            loadLocalRoleAndDepartmentFallback();
          }
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(error instanceof Error ? error : new Error('Failed to load personnel data.'));
          loadLocalRoleAndDepartmentFallback();
        }
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    void load();
    window.addEventListener('safeviate-roles-updated', loadLocalRoleAndDepartmentFallback);
    window.addEventListener('safeviate-departments-updated', loadLocalRoleAndDepartmentFallback);
    return () => {
      cancelled = true;
      window.removeEventListener('safeviate-roles-updated', loadLocalRoleAndDepartmentFallback);
      window.removeEventListener('safeviate-departments-updated', loadLocalRoleAndDepartmentFallback);
    };
  }, [tenantId]);

  const rolesMap = useMemo(() => {
    if (!roles) return new Map<string, string>();
    return new Map(roles.map(role => [role.id, role.name]));
  }, [roles]);

  const departmentsMap = useMemo(() => {
    if (!departments) return new Map<string, string>();
    return new Map(departments.map(dept => [dept.id, dept.name]));
  }, [departments]);

  const isLoading = isProfileLoading || isLoadingData;
  const error = dataError;
  const selectedRoleId = searchParams.get('role');
  const filteredPersonnel = useMemo(() => {
    if (!selectedRoleId) return personnel || [];
    const roleMatch = (roles || []).find(
      (role) =>
        role.id === selectedRoleId ||
        role.name.toLowerCase() === selectedRoleId.toLowerCase()
    );
    if (!roleMatch) return personnel || [];
    return (personnel || []).filter(
      (person) => person.role === roleMatch.id || person.role === roleMatch.name
    );
  }, [personnel, roles, selectedRoleId]);
  const selectedRoleName = selectedRoleId
    ? rolesMap.get(selectedRoleId) ||
      roles.find((role) => role.name.toLowerCase() === selectedRoleId.toLowerCase())?.name ||
      selectedRoleId
    : null;

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <MainPageHeader 
          title="Personnel Directory"
          description={
            selectedRoleName
              ? `Showing users assigned to role: ${selectedRoleName}`
              : 'Manage all non-flying staff in your organization.'
          }
          actions={
             <PersonnelForm 
                tenantId={tenantId || ''} 
                roles={roles || []} 
                departments={departments || []}
                externalOrganizations={externalOrgs || []}
                trigger={
                    <Button
                        disabled={!canCreateUsers || isProfileLoading}
                        variant={isMobile ? 'outline' : 'default'}
                        size={isMobile ? 'sm' : 'default'}
                        className={isMobile ? HEADER_MOBILE_ACTION_BUTTON_CLASS : `w-full sm:w-auto ${HEADER_ACTION_BUTTON_CLASS}`}
                    >
                        <span className="flex items-center gap-2">
                            <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                            Add User
                        </span>
                        {isMobile ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                    </Button>
                }
             />
          }
        />
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <PersonnelTable 
              data={filteredPersonnel} 
              rolesMap={rolesMap} 
              departmentsMap={departmentsMap} 
              tenantId={tenantId || ''} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
