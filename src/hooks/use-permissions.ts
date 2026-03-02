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

    let rawPermissions: string[] = [];

    // Add permissions from the user's assigned role.
    if (role && role.permissions) {
      rawPermissions.push(...role.permissions);
    }

    // For Personnel users, add their individual custom permission overrides.
    if (userProfile.userType === 'Personnel' && 'permissions' in userProfile && userProfile.permissions) {
      rawPermissions.push(...userProfile.permissions);
    }
    
    // Permission Hierarchy Expansion
    const expanded = new Set<string>();
    rawPermissions.forEach(p => {
      expanded.add(p);
      
      // 1. Action Escalation: 'manage' implies 'view', etc.
      const parts = p.split('-');
      const action = parts.pop();
      const resourceId = parts.join('-');
      
      if (['create', 'edit', 'delete', 'manage'].includes(action || '')) {
        expanded.add(`${resourceId}-view`);
      }

      // 2. Hierarchy Escalation: 'operations-bookings-view' implies 'operations-view'
      // We crawl up the segments to ensure parent menu items are visible
      let currentPath = '';
      parts.forEach((segment, idx) => {
        currentPath = idx === 0 ? segment : `${currentPath}-${segment}`;
        expanded.add(`${currentPath}-view`);
      });
    });
    
    return expanded;
  }, [userProfile, role]);
  
  const hasPermission = (permissionId: string) => {
    if (!permissionId) return true; // Items without permission constraints are public
    if (userProfile?.id === 'DEVELOPER_MODE') return true;
    return permissions.has(permissionId);
  };

  return {
    permissions,
    hasPermission,
    isLoading: isProfileLoading || isRoleLoading,
  };
};
