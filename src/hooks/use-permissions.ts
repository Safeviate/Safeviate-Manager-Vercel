'use client';

import { useCallback, useMemo } from 'react';
import { useUserProfile } from './use-user-profile';
import { useTenantConfig } from './use-tenant-config';
import { menuConfig } from '@/lib/menu-config';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { MenuItem, SubMenuItem } from '@/lib/menu-config';

type Role = {
  id: string;
  permissions?: string[];
};

/**
 * A custom hook to manage and check user permissions.
 */
export const usePermissions = () => {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const firestore = useFirestore();

  const roleRef = useMemoFirebase(
    () =>
      firestore && tenant?.id && userProfile?.role
        ? doc(firestore, 'tenants', tenant.id, 'roles', userProfile.role)
        : null,
    [firestore, tenant?.id, userProfile?.role]
  );

  const { data: role, isLoading: isRoleLoading } = useDoc<Role>(roleRef);

  const isLoading = isProfileLoading || isTenantLoading || isRoleLoading;

  const effectivePermissions = useMemo(() => {
    const inheritedPermissions = role?.permissions || [];
    const overridePermissions = userProfile?.permissions || [];
    const deniedPermissions = new Set(
      overridePermissions
        .filter((permission) => permission.startsWith('!'))
        .map((permission) => permission.slice(1))
    );

    const grantedPermissions = new Set<string>();

    inheritedPermissions.forEach((permission) => {
      if (!deniedPermissions.has(permission)) {
        grantedPermissions.add(permission);
      }
    });

    overridePermissions.forEach((permission) => {
      if (!permission.startsWith('!')) {
        grantedPermissions.add(permission);
      }
    });

    return grantedPermissions;
  }, [role?.permissions, userProfile?.permissions]);

  const findMenuItemByPermission = useCallback((permissionId: string): MenuItem | SubMenuItem | null => {
    const walk = (items: Array<MenuItem | SubMenuItem>): MenuItem | SubMenuItem | null => {
      for (const item of items) {
        if (item.permissionId === permissionId) return item;
        if ('subItems' in item && item.subItems) {
          const found = walk(item.subItems);
          if (found) return found;
        }
      }
      return null;
    };

    return walk(menuConfig);
  }, []);

  const hasPermission = useCallback((permissionId: string) => {
    if (isLoading || !userProfile) return false;

    // --- Standard Super-Admin / Developer Bypass ---
    const role = (userProfile as Personnel).role?.toLowerCase();
    if (userProfile.id === 'DEVELOPER_MODE' || role === 'dev' || role === 'developer') {
        return true;
    }

    return effectivePermissions.has(permissionId);
  }, [effectivePermissions, isLoading, userProfile]);

  const canAccessMenuItem = useCallback((item: MenuItem | SubMenuItem, parentItem?: MenuItem) => {
    if (isLoading || !userProfile) return false;

    const isAviation = tenant?.industry?.startsWith('Aviation') ?? true;
    const itemHref = item.href;

    const isAviationOnly =
      itemHref.includes('/bookings')
      || itemHref.includes('/assets')
      || itemHref.includes('/admin/mb-config');
    const isAviationOnlySub = itemHref.includes('/training/student-progress');

    if ((!isAviation && isAviationOnly) || (!isAviation && isAviationOnlySub)) {
      return false;
    }

    if (userProfile.accessOverrides?.hiddenMenus?.includes(itemHref)) return false;

    const role = (userProfile as Personnel).role?.toLowerCase();
    if (userProfile.id === 'DEVELOPER_MODE' || role === 'dev' || role === 'developer') {
      return true;
    }

    const isEnabledByTenant =
      !tenant?.enabledMenus
      || tenant.enabledMenus.includes(itemHref)
      || (parentItem ? tenant.enabledMenus.includes(parentItem.href) : false);
    if (!isEnabledByTenant) return false;

    if (item.permissionId && !hasPermission(item.permissionId)) return false;

    return true;
  }, [hasPermission, isLoading, tenant?.enabledMenus, tenant?.industry, userProfile]);

  return {
    permissions: effectivePermissions,
    hasPermission,
    canAccessMenuItem,
    findMenuItemByPermission,
    isLoading,
  };
};
