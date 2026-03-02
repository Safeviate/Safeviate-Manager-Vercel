
'use client';

import { useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUserProfile } from './use-user-profile';
import type { Role } from '@/app/(app)/admin/roles/page';
import type { Personnel, PilotProfile } from '@/app/(app)/users/personnel/page';
import { permissionsConfig } from '@/lib/permissions-config';

type UserProfile = Personnel | PilotProfile;

/**
 * A custom hook to manage and check user permissions.
 * It consolidates permissions from a user's role and their individual overrides.
 */
export const usePermissions = () => {
  const { userProfile, tenantId, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();

  // The role ID is present on both Personnel and PilotProfile types.
  const roleId = userProfile?.role;

  const roleRef = useMemoFirebase(
    () => (firestore && roleId && tenantId ? doc(firestore, `tenants/${tenantId}/roles`, roleId) : null),
    [firestore, roleId, tenantId]
  );
  
  const { data: role, isLoading: isRoleLoading } = useDoc<Role>(roleRef);

  const permissions = useMemo(() => {
    if (!userProfile) {
      return new Set<string>();
    }

    // For anonymous dev user, grant all permissions
    if (userProfile.id === 'DEVELOPER_MODE') {
      const allPermissions = permissionsConfig.flatMap(resource =>
        resource.actions.map(action => `${resource.id}-${action}`)
      );
      return new Set<string>(allPermissions);
    }

    let combinedPermissions: string[] = [];

    // Add permissions from the user's assigned role. This works for ALL user types.
    if (role && role.permissions) {
      combinedPermissions.push(...role.permissions);
    }

    // For Personnel users, add their individual custom permission overrides.
    if (userProfile.userType === 'Personnel' && 'permissions' in userProfile && userProfile.permissions) {
      combinedPermissions.push(...userProfile.permissions);
    }
    
    // Expand permissions (e.g., if you have 'manage', you should have 'view')
    const expandedPermissions = new Set<string>();
    combinedPermissions.forEach(p => {
      expandedPermissions.add(p);
      
      // Split on the last hyphen to get resourceId and action
      // e.g. "operations-bookings-view" -> "operations-bookings" and "view"
      const lastHyphenIndex = p.lastIndexOf('-');
      if (lastHyphenIndex !== -1) {
        const resourceId = p.substring(0, lastHyphenIndex);
        const action = p.substring(lastHyphenIndex + 1);
        
        if (['create', 'edit', 'delete', 'manage'].includes(action)) {
          expandedPermissions.add(`${resourceId}-view`);
        }
      }
    });
    
    return expandedPermissions;
  }, [userProfile, role]);
  
  const hasPermission = (permissionId: string) => {
    if (userProfile?.id === 'DEVELOPER_MODE') return true;
    return permissions.has(permissionId);
  };

  return {
    permissions,
    hasPermission,
    isLoading: isProfileLoading || isRoleLoading,
  };
};
