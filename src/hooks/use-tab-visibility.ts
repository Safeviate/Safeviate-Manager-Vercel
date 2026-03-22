'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUserProfile } from './use-user-profile';
import type { TabVisibilitySettings } from '@/types/quality';

/**
 * A custom hook to determine if specific UI tabs should be visible.
 * RESTORED: Now strictly checks settings in Firestore.
 */
export function useTabVisibility(pageId: string, canViewAll: boolean): boolean {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();

  const settingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'tab-visibility') : null),
    [firestore, tenantId]
  );

  const { data: settings } = useDoc<TabVisibilitySettings>(settingsRef);

  // If user can view all (admin/manager), tabs are visible unless explicitly disabled
  if (canViewAll) return true;

  // Otherwise check the stored settings for this page
  return settings?.visibilities?.[pageId] ?? true;
}
