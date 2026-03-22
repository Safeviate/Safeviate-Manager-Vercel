'use client';

import { useUserProfile } from './use-user-profile';
import { useTenantConfig } from './use-tenant-config';
import { usePathname } from 'next/navigation';
import { menuConfig } from '@/lib/menu-config';

/**
 * A custom hook to manage and check user permissions.
 */
export const usePermissions = () => {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const pathname = usePathname();

  const isLoading = isProfileLoading || isTenantLoading;

  const hasPermission = (permissionId: string) => {
    if (isLoading || !userProfile) return false;

    // Developer bypass to ensure administrative access during setup
    if (userProfile.id === 'DEVELOPER_MODE') return true;

    // RESTORED: Module Access Control Logic
    // Find the menu item associated with this permission if possible
    const findItem = (items: any[]): any => {
        for (const item of items) {
            if (item.permissionId === permissionId) return item;
            if (item.subItems) {
                const found = findItem(item.subItems);
                if (found) return found;
            }
        }
        return null;
    }
    
    const menuItem = findItem(menuConfig);
    if (menuItem) {
        // Check Tenant Override
        if (tenant?.enabledMenus && !tenant.enabledMenus.includes(menuItem.href)) return false;
        
        // Check User Override
        if (userProfile.accessOverrides?.hiddenMenus?.includes(menuItem.href)) return false;
    }

    // Check individual overrides first (explicit denials)
    if (userProfile.permissions?.includes(`!${permissionId}`)) return false;

    // Check granted permissions
    return userProfile.permissions?.includes(permissionId) ?? false;
  };

  return {
    permissions: new Set(userProfile?.permissions || []),
    hasPermission,
    isLoading,
  };
};
