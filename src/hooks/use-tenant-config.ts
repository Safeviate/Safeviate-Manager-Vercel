'use client';

import { useMemo, useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUserProfile } from './use-user-profile';
import type { Tenant, IndustryType } from '@/types/quality';

const INDUSTRY_OVERRIDE_KEY = 'safeviate:industry-override';

/**
 * A custom hook to fetch the configuration for the current tenant.
 * Supports a developer override for testing industry-specific layouts.
 */
export const useTenantConfig = () => {
  const { tenantId, userProfile } = useUserProfile();
  const firestore = useFirestore();
  const [industryOverride, setIndustryOverride] = useState<IndustryType | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const syncOverride = () => {
      const stored = window.localStorage.getItem(INDUSTRY_OVERRIDE_KEY);
      setIndustryOverride(stored as IndustryType | null);
    };

    syncOverride();
    window.addEventListener('safeviate-industry-switch', syncOverride);
    window.addEventListener('storage', syncOverride);
    
    return () => {
      window.removeEventListener('safeviate-industry-switch', syncOverride);
      window.removeEventListener('storage', syncOverride);
    };
  }, []);

  const tenantRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId) : null),
    [firestore, tenantId]
  );

  const { data: tenantData, isLoading, error } = useDoc<Tenant>(tenantRef);

  const isDeveloper = userProfile?.role?.toLowerCase() === 'dev' || userProfile?.role?.toLowerCase() === 'developer' || userProfile?.id === 'DEVELOPER_MODE';

  const modifiedTenant = useMemo(() => {
    if (!tenantData) return null;
    // Apply developer override if active
    if (isDeveloper && industryOverride) {
      return { ...tenantData, industry: industryOverride };
    }
    return tenantData;
  }, [tenantData, isDeveloper, industryOverride]);

  return {
    tenant: modifiedTenant,
    tenantId,
    isLoading,
    error,
  };
};
