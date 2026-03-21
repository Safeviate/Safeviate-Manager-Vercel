'use client';

import { useUserProfile } from './use-user-profile';

/**
 * A custom hook to manage and check user permissions.
 */
export const usePermissions = () => {
  const { userProfile, isLoading } = useUserProfile();

  const hasPermission = (permissionId: string) => {
    if (isLoading || !userProfile) return false;

    // Developer bypass to ensure administrative access during setup
    if (userProfile.id === 'DEVELOPER_MODE') return true;

    // Check individual overrides first (denials)
    if (userProfile.permissions?.includes(`!${permissionId}`)) return false;

    // Check permissions
    return userProfile.permissions?.includes(permissionId) ?? false;
  };

  return {
    permissions: new Set(userProfile?.permissions || []),
    hasPermission,
    isLoading,
  };
};
