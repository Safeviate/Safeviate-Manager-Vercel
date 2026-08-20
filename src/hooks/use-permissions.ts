'use client';

import { useCallback, useMemo } from 'react';
import { useUserProfile } from './use-user-profile';
import { useTenantConfig } from './use-tenant-config';
import type { MenuItem, SubMenuItem } from '@/lib/menu-config';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { isTenantHrefEnabledByLayout } from '@/lib/tenant-layout-access';
import { hasHierarchicalPermission, normalizePermissionIds } from '@/lib/permission-model';
import { MASTER_TENANT_EMAILS, MASTER_TENANT_ID } from '@/lib/tenant-constants';

export const usePermissions = () => {
  const {
    userProfile,
    tenantId,
    rolePermissions,
    roleHiddenMenus,
    isLoading: isProfileLoading,
  } = useUserProfile();
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();

  const permissionState = useMemo(() => {
    const inheritedPermissions = rolePermissions || [];
    const overridePermissions = (userProfile as Personnel | null)?.permissions || [];
    const deniedPermissions = new Set(
      normalizePermissionIds(overridePermissions.filter((permission) => permission.startsWith('!')).map((permission) => permission.slice(1)))
    );

    const grantedPermissions = new Set<string>();

    normalizePermissionIds(inheritedPermissions).forEach((permission) => {
      if (!deniedPermissions.has(permission)) {
        grantedPermissions.add(permission);
      }
    });

    normalizePermissionIds(overridePermissions.filter((permission) => !permission.startsWith('!'))).forEach((permission) => {
      grantedPermissions.add(permission);
    });

    return {
      grantedPermissions,
      deniedPermissions,
    };
  }, [rolePermissions, userProfile]);

  const effectivePermissions = permissionState.grantedPermissions;
  const deniedPermissions = permissionState.deniedPermissions;

  const hiddenMenus = useMemo(() => {
    const userHiddenMenus = (userProfile as Personnel | null)?.accessOverrides?.hiddenMenus || [];
    return new Set([...roleHiddenMenus, ...userHiddenMenus]);
  }, [roleHiddenMenus, userProfile]);

  const isLoading = isProfileLoading || isTenantLoading;
  const isSafeviateMasterSuperUser = useMemo(() => {
    const email = userProfile?.email?.trim().toLowerCase();
    if (!email) return false;

    return tenantId === MASTER_TENANT_ID && MASTER_TENANT_EMAILS.includes(email);
  }, [tenantId, userProfile?.email]);

  const hasPermission = useCallback(
    (permissionId: string) => {
      if (isLoading || !userProfile) return false;

      if (isSafeviateMasterSuperUser || effectivePermissions.has('*')) {
        return true;
      }

      return hasHierarchicalPermission(effectivePermissions, permissionId, deniedPermissions);
    },
    [deniedPermissions, effectivePermissions, isLoading, isSafeviateMasterSuperUser, userProfile]
  );

  const canAccessMenuItem = useCallback(
    (item: MenuItem | SubMenuItem, parentItem?: MenuItem): boolean => {
      if (isLoading || !userProfile) return false;

      if (isSafeviateMasterSuperUser) {
        return true;
      }

      const itemHref = item.href;
      const isCompanyDashboard = itemHref === '/dashboard';
      const isSafeviateOnlyAdminSurface =
        itemHref === '/users/access-overview' || itemHref === '/admin/activity-tracker';

      if (isSafeviateOnlyAdminSurface && tenantId && tenantId !== MASTER_TENANT_ID) {
        return false;
      }

      if (isCompanyDashboard) {
        return !hiddenMenus.has(itemHref) && isTenantHrefEnabledByLayout(tenant, itemHref);
      }

      if (hiddenMenus.has(itemHref)) return false;

      if (!isTenantHrefEnabledByLayout(tenant, itemHref)) return false;

      if (item.permissionId && !hasPermission(item.permissionId)) return false;

      // This is the recovery surface for tenant module visibility. An authorized
      // administrator must be able to re-enable modules that were turned off.
      if (itemHref === '/admin/page-format' && hasPermission('admin-settings-edit')) {
        return true;
      }

      const isEnabledByTenant = !tenant?.enabledMenus || tenant.enabledMenus.includes(itemHref);
      if (!isEnabledByTenant) {
        if (item.subItems?.length) {
          return item.subItems.some((subItem) => canAccessMenuItem(subItem, parentItem || undefined));
        }
        return false;
      }

      return true;
    },
    [hasPermission, hiddenMenus, isLoading, isSafeviateMasterSuperUser, tenant, tenantId, userProfile]
  );

  return {
    permissions: effectivePermissions,
    hasPermission,
    canAccessMenuItem,
    isLoading,
  };
};
