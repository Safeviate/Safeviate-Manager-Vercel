'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserProfile } from './use-user-profile';
import { menuConfig } from '@/lib/menu-config';
import type { MenuItem, SubMenuItem } from '@/lib/menu-config';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { parseJsonResponse } from '@/lib/safe-json';
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';
import { MASTER_TENANT_EMAILS } from '@/lib/tenant-constants';

type MePayload = {
  rolePermissions?: string[];
  roleHiddenMenus?: string[];
  tenant?: {
    id: string;
    industry?: string | null;
    enabledMenus?: string[] | null;
  } | null;
};

let permissionsCache: MePayload | null = null;

const isSuperUserEmail = (email?: string | null) =>
  MASTER_TENANT_EMAILS.includes((email || '').trim().toLowerCase());

export const usePermissions = () => {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const [payload, setPayload] = useState<MePayload | null>(() => permissionsCache);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(() => permissionsCache === null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsPermissionsLoading(true);
      try {
        const response = await fetch('/api/me', { cache: 'no-store' });
        const data = (await parseJsonResponse<MePayload>(response)) ?? {};
        if (!cancelled) {
          setPayload(data);
          permissionsCache = data;
        }
      } catch {
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled) setIsPermissionsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectivePermissions = useMemo(() => {
    const inheritedPermissions = payload?.rolePermissions || [];
    const overridePermissions = (userProfile as Personnel | null)?.permissions || [];
    const deniedPermissions = new Set(
      overridePermissions.filter((permission) => permission.startsWith('!')).map((permission) => permission.slice(1))
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
  }, [payload?.rolePermissions, userProfile]);

  const hiddenMenus = useMemo(() => {
    const roleHiddenMenus = payload?.roleHiddenMenus || [];
    const userHiddenMenus = (userProfile as Personnel | null)?.accessOverrides?.hiddenMenus || [];
    return new Set([...roleHiddenMenus, ...userHiddenMenus]);
  }, [payload?.roleHiddenMenus, userProfile]);

  const isLoading = isProfileLoading || isPermissionsLoading;

  const hasPermission = useCallback(
    (permissionId: string) => {
      if (isLoading || !userProfile) return false;

      if (isSuperUserEmail(userProfile.email)) {
        return true;
      }

      const userRole = (userProfile as Personnel).role?.toLowerCase();
      if (userRole === 'dev' || userRole === 'developer') {
        return true;
      }

      if (effectivePermissions.has('*')) {
        return true;
      }

      return effectivePermissions.has(permissionId);
    },
    [effectivePermissions, isLoading, userProfile]
  );

    const canAccessMenuItem = useCallback(
    (item: MenuItem | SubMenuItem, parentItem?: MenuItem) => {
      if (isLoading || !userProfile) return false;

      const tenant = payload?.tenant;
      const itemHref = item.href;
      if (isSuperUserEmail(userProfile.email)) {
        return true;
      }

      const userRole = (userProfile as Personnel).role?.toLowerCase();
      const isCompanyDashboard = itemHref === '/dashboard';
      if (userRole === 'dev' || userRole === 'developer') {
        return !hiddenMenus.has(itemHref);
      }

      if (effectivePermissions.has('*')) {
        return !hiddenMenus.has(itemHref);
      }

      if (isCompanyDashboard) {
        return !hiddenMenus.has(itemHref);
      }

      const isExplicitlyEnabled = tenant?.enabledMenus?.includes(itemHref) ?? false;
      const bypassIndustryRestrictions = shouldBypassIndustryRestrictions(tenant?.id);
      if (!bypassIndustryRestrictions && !isHrefEnabledForIndustry(itemHref, tenant?.industry) && !isExplicitlyEnabled) {
        return false;
      }

      if (hiddenMenus.has(itemHref)) return false;

      const isEnabledByTenant =
        bypassIndustryRestrictions ||
        !tenant?.enabledMenus ||
        tenant.enabledMenus.includes(itemHref) ||
        (parentItem ? tenant.enabledMenus.includes(parentItem.href) : false);
      if (!isEnabledByTenant) return false;

      if (item.permissionId && !hasPermission(item.permissionId)) return false;

      return true;
    },
    [hasPermission, hiddenMenus, isLoading, payload?.tenant, userProfile]
  );

  return {
    permissions: effectivePermissions,
    hasPermission,
    canAccessMenuItem,
    isLoading,
  };
};
