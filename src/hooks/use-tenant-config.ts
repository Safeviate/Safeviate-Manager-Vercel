'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUserProfile } from './use-user-profile';
import type { Tenant, IndustryType } from '@/types/quality';

const INDUSTRY_OVERRIDE_KEY = 'safeviate:industry-override';

/**
 * A custom hook to fetch the configuration for the current tenant.
 * Supports a developer override for testing industry-specific layouts.
 */
export const useTenantConfig = () => {
  const { tenantId, userProfile } = useUserProfile();
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [industryOverride, setIndustryOverride] = useState<IndustryType | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncOverride = () => {
      try {
        const stored = window.localStorage.getItem(INDUSTRY_OVERRIDE_KEY);
        setIndustryOverride(stored as IndustryType | null);
      } catch {
        setIndustryOverride(null);
      }
    };

    syncOverride();
    window.addEventListener('safeviate-industry-switch', syncOverride);
    window.addEventListener('storage', syncOverride);

    return () => {
      window.removeEventListener('safeviate-industry-switch', syncOverride);
      window.removeEventListener('storage', syncOverride);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!tenantId) {
        setTenantData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [meResponse, configResponse] = await Promise.all([
          fetch('/api/me', { cache: 'no-store' }),
          fetch('/api/tenant-config', { cache: 'no-store' }),
        ]);
        const payload = await meResponse.json();
        const configPayload = await configResponse.json().catch(() => ({}));
        const tenantFromApi = payload?.tenant ?? null;
        const tenantConfig = configPayload?.config ?? null;

        if (!cancelled) {
          if (tenantFromApi) {
            setTenantData({
              ...tenantFromApi,
              ...(tenantConfig || {}),
            });
          } else {
            setTenantData(null);
          }
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load tenant configuration.'));
          setTenantData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    
    const handleUpdate = async () => {
      try {
        const response = await fetch('/api/tenant-config', { cache: 'no-store' });
        const payload = await response.json();
        if (payload?.config && !cancelled) {
          setTenantData((current) => (current ? { ...current, ...payload.config } : current));
        }
      } catch {
        // ignore transient refresh failures
      }
    };

    window.addEventListener('safeviate-tenant-config-updated', handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('safeviate-tenant-config-updated', handleUpdate);
    };
  }, [tenantId]);

  const isDeveloper =
    userProfile?.role?.toLowerCase() === 'dev' || userProfile?.role?.toLowerCase() === 'developer' || userProfile?.id === 'DEVELOPER_MODE';

  const modifiedTenant = useMemo(() => {
    if (!tenantData) return null;
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
