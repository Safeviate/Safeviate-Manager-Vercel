'use client';

/**
 * A custom hook to manage and check user permissions.
 * RESTRICTIONS DISABLED: Always returns true.
 */
export const usePermissions = () => {
  const hasPermission = (permissionId: string) => {
    // All page and module restrictions disabled
    return true;
  };

  return {
    permissions: new Set<string>(), // Empty set as everything is allowed
    hasPermission,
    isLoading: false,
  };
};