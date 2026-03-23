'use client';

import { useMemo } from 'react';
import { useUserProfile } from './use-user-profile';
import { usePermissions } from './use-permissions';

type OrganizationScopeOptions = {
  viewAllPermissionId?: string;
};

export function useOrganizationScope(options: OrganizationScopeOptions = {}) {
  const { viewAllPermissionId } = options;
  const { userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();

  const userOrgId = userProfile?.organizationId ?? null;

  const canViewAllOrganizations = useMemo(() => {
    if (!userProfile) return false;

    if (userProfile.id === 'DEVELOPER_MODE') return true;

    const role = typeof userProfile.role === 'string' ? userProfile.role.toLowerCase() : '';
    if (role === 'dev' || role === 'developer') return true;

    if (!userOrgId) return true;

    return viewAllPermissionId ? hasPermission(viewAllPermissionId) : false;
  }, [hasPermission, userOrgId, userProfile, viewAllPermissionId]);

  return {
    userOrgId,
    canViewAllOrganizations,
    shouldShowOrganizationTabs: canViewAllOrganizations,
    scopedOrganizationId: canViewAllOrganizations ? 'internal' : (userOrgId || 'internal'),
  };
}
