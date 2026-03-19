'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUserProfile } from './use-user-profile';
import type { TabVisibilitySettings } from '@/app/(app)/admin/external/page';

/**
 * A custom hook to determine if specific UI tabs (like Internal/External switches)
 * should be visible based on both global tenant settings and individual user overrides.
 * 
 * @param pageId The identifier for the page (e.g., 'audits', 'risk-register')
 * @param canViewAll The permission check for seeing other organizations' data
 * @returns boolean True if tabs should be shown
 */
export function useTabVisibility(pageId: string, canViewAll: boolean): boolean {
  const firestore = useFirestore();
  const { tenantId, userProfile } = useUserProfile();

  const visibilitySettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'tab-visibility') : null),
    [firestore, tenantId]
  );
  const { data: tenantSettings } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);

  // 1. If user can't view all, tabs are irrelevant
  if (!canViewAll) return false;

  // 2. Check individual user override
  const userHiddenTabs = userProfile?.accessOverrides?.hiddenTabs || [];
  if (userHiddenTabs.includes(pageId)) return false;

  // 3. Check global tenant setting
  const isGlobalEnabled = tenantSettings?.visibilities?.[pageId] ?? true;
  
  return isGlobalEnabled;
}
