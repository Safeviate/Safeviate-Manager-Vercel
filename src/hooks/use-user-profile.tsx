'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';
import { parseJsonResponse } from '@/lib/safe-json';
import { MASTER_TENANT_ID } from '@/lib/tenant-constants';

type UserProfile = PilotProfile | Personnel;
type DbUserProfile = {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
};
const TENANT_OVERRIDE_STORAGE_KEY = 'safeviate:selected-tenant';

interface UserProfileContextType {
    userProfile: UserProfile | null;
    tenantId: string | null;
    isLoading: boolean;
    error: Error | null;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    if (!context) {
        throw new Error('useUserProfile must be used within a UserProfileProvider');
    }
    return context;
};

const getTenantOverride = () => {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(TENANT_OVERRIDE_STORAGE_KEY);
    } catch {
        return null;
    }
};

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
    const { data: session, status } = useSession();
    const [dbProfile, setDbProfile] = useState<DbUserProfile | null>(null);
    const [dbError, setDbError] = useState<Error | null>(null);
    const [dbLoading, setDbLoading] = useState(false);
    const [profileRefreshToken, setProfileRefreshToken] = useState(0);
    const [tenantOverride, setTenantOverride] = useState<string | null>(() => getTenantOverride());
    const authUser = session?.user ?? null;
    const isAuthLoading = status === 'loading';

    useEffect(() => {
        if (isAuthLoading) return;

        let cancelled = false;
        const loadProfile = async () => {
            setDbLoading(true);
            try {
                const response = await fetch('/api/me', { cache: 'no-store' });
                const payload = await parseJsonResponse<{ profile: DbUserProfile | null }>(response);
                if (!cancelled) {
                    setDbProfile(payload?.profile ?? null);
                    setDbError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setDbError(error instanceof Error ? error : new Error('Failed to load profile.'));
                    setDbProfile(null);
                }
            } finally {
                if (!cancelled) setDbLoading(false);
            }
        };

        void loadProfile();

        return () => {
            cancelled = true;
        };
    }, [authUser?.email, isAuthLoading, profileRefreshToken]);

    const isLoading = isAuthLoading || dbLoading;
    const error = dbError;

    const tenantId = useMemo(() => {
        if (!dbProfile) return null;
        const profileTenantId = dbProfile.tenantId || MASTER_TENANT_ID;
        
        // Developer role bypass for tenant switching
        const isDeveloper =
            dbProfile.role?.toLowerCase() === 'dev' ||
            dbProfile.role?.toLowerCase() === 'developer' ||
            profileTenantId === MASTER_TENANT_ID;
        const overrideTenantId = isDeveloper ? tenantOverride : null;
        
        return overrideTenantId || profileTenantId;
    }, [dbProfile, tenantOverride]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleProfileUpdate = () => setProfileRefreshToken((current) => current + 1);
        const syncTenantOverride = () => setTenantOverride(getTenantOverride());

        syncTenantOverride();
        window.addEventListener('safeviate-profile-updated', handleProfileUpdate);
        window.addEventListener('storage', syncTenantOverride);
        window.addEventListener('safeviate-tenant-switch', syncTenantOverride);

        return () => {
            window.removeEventListener('safeviate-profile-updated', handleProfileUpdate);
            window.removeEventListener('storage', syncTenantOverride);
            window.removeEventListener('safeviate-tenant-switch', syncTenantOverride);
        };
    }, []);

    const value = useMemo(() => ({
        userProfile: dbProfile ? ({
            id: dbProfile.id,
            firstName: dbProfile.firstName,
            lastName: dbProfile.lastName,
            email: dbProfile.email,
            role: dbProfile.role,
        } as UserProfile) : (authUser ? ({
            id: authUser.id ?? authUser.email ?? 'vercel-user',
            firstName: authUser.name?.split(' ')[0] ?? 'User',
            lastName: authUser.name?.split(' ').slice(1).join(' ') || '',
            email: authUser.email ?? '',
            role: 'developer',
        } as UserProfile) : null),
        tenantId: tenantId || MASTER_TENANT_ID,
        isLoading,
        error,
    }), [dbProfile, authUser, tenantId, isLoading, error]);

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};
