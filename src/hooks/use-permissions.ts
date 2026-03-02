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

    if (userProfile.id === 'DEVELOPER_MODE') {
      const allPermissions = permissionsConfig.flatMap(resource =>
        resource.actions.map(action => `${resource.id}-${action}`)
      );
      return new Set<string>(allPermissions);
    }

    let rawPermissions: string[] = [];

    // 1. Get permissions from Role
    if (role && role.permissions) {
      rawPermissions.push(...role.permissions);
    }

    // 2. Get individual overrides (for Personnel)
    if (userProfile.userType === 'Personnel' && 'permissions' in userProfile && Array.isArray(userProfile.permissions)) {
      rawPermissions.push(...userProfile.permissions);
    }
    
    const expanded = new Set<string>();
    rawPermissions.forEach(p => {
      if (!p || typeof p !== 'string') return;
      
      expanded.add(p);
      
      // Permission Escalation Logic
      const parts = p.split('-');
      const action = parts.pop();
      const resourceId = parts.join('-');
      
      // If you can manage/create/edit/delete, you can definitely view
      if (['create', 'edit', 'delete', 'manage'].includes(action || '')) {
        expanded.add(`${resourceId}-view`);
      }

      // Parent menu escalation: ensure parent segments are unlocked
      // e.g., 'operations-bookings-view' -> 'operations-view'
      const segments = resourceId.split('-');
      segments.forEach((_, idx) => {
        const segmentPath = segments.slice(0, idx + 1).join('-');
        expanded.add(`${segmentPath}-view`);
      });
    });
    
    return expanded;
  }, [userProfile, role]);
  
  const hasPermission = (permissionId: string) => {
    if (!permissionId) return true;
    if (userProfile?.id === 'DEVELOPER_MODE') return true;
    return permissions.has(permissionId);
  };

  return {
    permissions,
    hasPermission,
    isLoading: isProfileLoading || isRoleLoading,
  };
};
