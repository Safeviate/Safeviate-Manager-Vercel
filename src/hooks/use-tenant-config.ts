'use client';

import { useEffect, useState } from 'react';
import { useUserProfile } from './use-user-profile';
import type { Tenant } from '@/types/quality';
import { getOrSetClientApiCache, invalidateClientApiCache } from '@/lib/client/api-cache';
const FALLBACK_TENANT_ID = 'safeviate';
const FALLBACK_TENANT_NAME = 'Safeviate';
const TENANT_CONFIG_CACHE_TTL_MS = 5 * 60_000;

declare global {
  interface Window {
    __SAFEVIATE_THEME_BOOTSTRAP__?: {
      theme?: Record<string, unknown> | null;
      tenant?: Record<string, unknown> | null;
    };
  }
}

const normalizeTenantSummary = (
  tenant: {
    id?: string | null;
    name?: string | null;
    [key: string]: unknown;
  } | null | undefined,
  fallback?: Tenant | null
): Tenant | null => {
  if (!tenant?.id) return null;

  return {
    ...(fallback || {}),
    ...tenant,
    id: tenant.id,
    name: tenant.name || fallback?.name || FALLBACK_TENANT_NAME,
  } as Tenant;
};

/**
 * A custom hook to fetch the configuration for the current tenant.
 * Supports a developer override for testing industry-specific layouts.
 */
export const useTenantConfig = () => {
  const bootstrapTenant = typeof window !== 'undefined'
    ? (window.__SAFEVIATE_THEME_BOOTSTRAP__?.tenant as Tenant | null | undefined) ?? null
    : null;
  const { tenantId, tenant: profileTenant, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const [tenantData, setTenantData] = useState<Tenant | null>(bootstrapTenant);
  const [isLoading, setIsLoading] = useState(!bootstrapTenant);
  const [error, setError] = useState<Error | null>(null);
  const [configRefreshToken, setConfigRefreshToken] = useState(0);
  const resolvedTenantId = tenantId || FALLBACK_TENANT_ID;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTenantSwitch = (event: Event) => {
      const tenantSwitchEvent = event as CustomEvent<{ tenantId?: string | null; tenantName?: string | null }>;
      const nextTenantId = tenantSwitchEvent.detail?.tenantId?.trim() || tenantId || FALLBACK_TENANT_ID;
      const nextTenantName = tenantSwitchEvent.detail?.tenantName?.trim() || null;

      invalidateClientApiCache(`tenant-config:${resolvedTenantId}`);
      invalidateClientApiCache(`tenant-config:${nextTenantId}`);
      setIsLoading(true);
      setError(null);
      setTenantData({
        id: nextTenantId,
        name: nextTenantName || (nextTenantId === FALLBACK_TENANT_ID ? FALLBACK_TENANT_NAME : nextTenantId),
      } as Tenant);
      setConfigRefreshToken((current) => current + 1);
    };

    window.addEventListener('safeviate-tenant-switch', handleTenantSwitch);
    return () => {
      window.removeEventListener('safeviate-tenant-switch', handleTenantSwitch);
    };
  }, [resolvedTenantId, tenantId]);

  useEffect(() => {
    let cancelled = false;
      const load = async () => {
      if (isProfileLoading) {
        return;
      }

      if (!userProfile) {
        if (!bootstrapTenant) {
          setTenantData(null);
        }
        setIsLoading(false);
        return;
      }

      if (!tenantId) {
        if (!bootstrapTenant) {
          setTenantData(null);
        }
        setIsLoading(false);
        return;
      }

      try {
        const configPayload = await getOrSetClientApiCache(
          `tenant-config:${resolvedTenantId}`,
          TENANT_CONFIG_CACHE_TTL_MS,
          async () => {
            const response = await fetch(`/api/tenant-config?tenantId=${encodeURIComponent(resolvedTenantId)}`, { cache: 'no-store' });
            return response.ok ? await response.json().catch(() => ({})) : {};
          }
        );
        const tenantConfig = configPayload?.config ?? null;
        const serverConfig = tenantConfig && typeof tenantConfig === 'object'
          ? (tenantConfig as Record<string, unknown>)
          : null;
        if (!cancelled) {
          if (profileTenant) {
            setTenantData(() => {
              const normalizedProfileTenant = normalizeTenantSummary(profileTenant);
              return normalizedProfileTenant
                ? {
                    ...normalizedProfileTenant,
                    ...(serverConfig || {}),
                  }
                : null;
            });
          } else if (bootstrapTenant) {
            setTenantData(bootstrapTenant);
          } else {
            setTenantData((current) => current);
          }
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load tenant configuration.'));
          if (!bootstrapTenant) {
            setTenantData((current) => current);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    
      const handleUpdate = async () => {
        try {
          invalidateClientApiCache(`tenant-config:${resolvedTenantId}`);
          const payload = await getOrSetClientApiCache(
            `tenant-config:${resolvedTenantId}`,
            TENANT_CONFIG_CACHE_TTL_MS,
            async () => {
              const response = await fetch(`/api/tenant-config?tenantId=${encodeURIComponent(resolvedTenantId)}`, { cache: 'no-store' });
              return response.ok ? await response.json().catch(() => ({})) : {};
            }
          );
          if (!cancelled) {
            const nextConfig = payload?.config && typeof payload.config === 'object'
              ? (payload.config as Record<string, unknown>)
              : null;
            if (nextConfig && Object.keys(nextConfig).length > 0) {
              setTenantData((current) =>
                current
                  ? { ...current, ...nextConfig }
                  : {
                      id: resolvedTenantId,
                      name: resolvedTenantId === FALLBACK_TENANT_ID ? FALLBACK_TENANT_NAME : resolvedTenantId,
                      ...nextConfig,
                    } as Tenant
              );
            }
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
  }, [tenantId, profileTenant, userProfile?.id, isProfileLoading, resolvedTenantId, bootstrapTenant, configRefreshToken]);

  return {
    tenant: tenantData,
    tenantId,
    isLoading,
    error,
  };
};
