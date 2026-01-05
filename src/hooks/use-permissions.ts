
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUserProfile } from './use-user-profile';
import type { Role } from '@/app/(app)/users/roles/page';
import type { Personnel } from '@/app/(app)/users/personnel/page';

/**
 * A custom hook to manage and check user permissions.
 * It consolidates permissions from a user's role and their individual overrides.
 */
export const usePermissions = () => {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();

  const roleRef = useMemoFirebase(
    () => (firestore && userProfile?.role ? doc(firestore, `tenants/safeviate/roles`, userProfile.role) : null),
    [firestore, userProfile?.role]
  );
  
  const { data: role, isLoading: isRoleLoading } = useCollection<Role>(roleRef as any);

  const permissions = useMemo(() => {
    if (!userProfile) {
      return new Set<string>();
    }

    // For anonymous dev user, grant all permissions
    if (userProfile.firstName === 'Developer' && userProfile.lastName === 'Mode') {
        return new Set<string>(['dashboard-view', 'my-dashboard-view', 'operations-view', 'safety-view', 'quality-view', 'training-view', 'assets-view', 'users-view', 'admin-view', 'settings-manage', 'development-view', 'bookings-view', 'bookings-create', 'bookings-edit', 'bookings-delete', 'flight-plans-manage', 'safety-reports-manage', 'risk-register-view', 'risk-matrix-view', 'safety-indicators-view', 'moc-manage', 'quality-audits-manage', 'quality-audits-view', 'quality-templates-manage', 'quality-caps-view', 'quality-tasks-view', 'quality-matrix-manage', 'training-debriefs-view', 'assets-view', 'users-view', 'admin-roles-manage', 'admin-permissions-view', 'admin-departments-manage', 'admin-settings-manage', 'admin-database-manage']);
    }

    let combinedPermissions: string[] = [];

    // Add permissions from the user's role
    if (role && role.length > 0 && role[0].permissions) {
      combinedPermissions.push(...role[0].permissions);
    }

    // For Personnel, add their individual custom permissions
    if (userProfile.userType === 'Personnel' && (userProfile as Personnel).permissions) {
      combinedPermissions.push(...(userProfile as Personnel).permissions);
    }
    
    // Use a Set for efficient lookup and to automatically handle duplicates
    return new Set(combinedPermissions);
  }, [userProfile, role]);
  
  const hasPermission = (permissionId: string) => {
    return permissions.has(permissionId);
  };

  return {
    permissions,
    hasPermission,
    isLoading: isProfileLoading || isRoleLoading,
  };
};
