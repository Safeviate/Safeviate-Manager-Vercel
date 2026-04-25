'use client';

import { useEffect, useState } from 'react';
import { useUserProfile } from './use-user-profile';
import type { TabVisibilitySettings } from '@/types/quality';

/**
 * A custom hook to determine if specific UI tabs should be visible.
 * Uses the current MOC/Vercel profile context and the tenant database route.
 */
export function useTabVisibility(pageId: string, canViewAll: boolean): boolean {
  const { tenantId, tenant } = useUserProfile();
  const [settings, setSettings] = useState<TabVisibilitySettings | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setSettings(null);
      return;
    }

    setSettings(tenant?.tabVisibilitySettings ?? null);
  }, [tenantId, tenant?.tabVisibilitySettings]);

  if (canViewAll) return true;
  return settings?.visibilities?.[pageId] ?? true;
}
