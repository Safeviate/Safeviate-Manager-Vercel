'use client';

import { useEffect, useState } from 'react';
import { useUserProfile } from './use-user-profile';
import type { TabVisibilitySettings } from '@/types/quality';
import { parseJsonResponse } from '@/lib/safe-json';

/**
 * A custom hook to determine if specific UI tabs should be visible.
 * Uses the current MOC/Vercel profile context and the tenant database route.
 */
export function useTabVisibility(pageId: string, canViewAll: boolean): boolean {
  const { tenantId } = useUserProfile();
  const [settings, setSettings] = useState<TabVisibilitySettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!tenantId) {
        setSettings(null);
        return;
      }

      try {
        const response = await fetch('/api/me', { cache: 'no-store' });
        const payload = await parseJsonResponse<{ tenant?: { tabVisibilitySettings?: TabVisibilitySettings | null } }>(response);
        if (!cancelled) {
          setSettings(payload?.tenant?.tabVisibilitySettings ?? null);
        }
      } catch {
        if (!cancelled) setSettings(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (canViewAll) return true;
  return settings?.visibilities?.[pageId] ?? true;
}
