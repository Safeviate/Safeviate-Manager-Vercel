
'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUserProfile } from './use-user-profile';
import type { Tenant } from '@/types/quality';

/**
 * A custom hook to fetch the configuration for the current tenant.
 */
export const useTenantConfig = () => {
  const { tenantId } = useUserProfile();
  const firestore = useFirestore();

  const tenantRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId) : null),
    [firestore, tenantId]
  );

  const { data: tenant, isLoading, error } = useDoc<Tenant>(tenantRef);

  return {
    tenant,
    tenantId,
    isLoading,
    error,
  };
};
