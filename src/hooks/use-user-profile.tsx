
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';

type UserProfile = PilotProfile | Personnel;
type UserLink = { profilePath: string };
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
    return window.localStorage.getItem(TENANT_OVERRIDE_STORAGE_KEY);
};

const canOverrideTenant = (profile: UserProfile | null, isAnonymous: boolean) => {
    if (isAnonymous) return true;

    const role = (profile as Personnel | null)?.role?.toLowerCase();
    return role === 'dev' || role === 'developer';
};

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user: authUser, isUserLoading: isAuthLoading } = useUser();

    // 1. Create a reactive reference to the user link document
    const userLinkRef = useMemoFirebase(
        () => (firestore && authUser && !authUser.isAnonymous ? doc(firestore, 'users', authUser.uid) : null),
        [firestore, authUser]
    );

    // 2. Use `useDoc` to listen for the user link data
    const { data: userLink, isLoading: isUserLinkLoading, error: userLinkError } = useDoc<UserLink>(userLinkRef);

    // 3. Based on the user link, create a reactive reference to the actual profile document
    const userProfileRef = useMemoFirebase(
        () => (firestore && userLink?.profilePath ? doc(firestore, userLink.profilePath) : null),
        [firestore, userLink]
    );

    // 4. Use `useDoc` again to listen for the final profile data
    const { data: userProfileData, isLoading: isProfileDocLoading, error: profileError } = useDoc<UserProfile>(userProfileRef);

    const [finalUserProfile, setFinalUserProfile] = useState<UserProfile | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
        // Overall loading state
        const loading = isAuthLoading || isUserLinkLoading || isProfileDocLoading;
        setIsLoading(loading);

        // Overall error state
        const combinedError = userLinkError || profileError;
        setError(combinedError);

        if (loading) {
            setFinalUserProfile(null);
            setTenantId(null);
            return;
        };

        if (!authUser) {
            setFinalUserProfile(null);
            setTenantId(null);
            return;
        }

        if (authUser.isAnonymous) {
             const devProfile: Personnel = {
                id: 'DEVELOPER_MODE',
                userType: 'Personnel',
                firstName: 'Developer',
                lastName: 'Mode',
                email: authUser.email || 'dev@safeviate.com',
                role: 'dev',
                permissions: [],
            };
            setFinalUserProfile(devProfile);
            setTenantId(getTenantOverride() || 'safeviate');
            return;
        }

        if (userProfileData && userLink?.profilePath) {
            setFinalUserProfile(userProfileData);
            // Extract tenant ID from path: tenants/{tenantId}/...
            const pathParts = userLink.profilePath.split('/');
            const profileTenantId = pathParts[0] === 'tenants' && pathParts[1] ? pathParts[1] : 'safeviate';
            const overrideTenantId = canOverrideTenant(userProfileData, false) ? getTenantOverride() : null;
            setTenantId(overrideTenantId || profileTenantId);
        } else {
            setFinalUserProfile(null);
            setTenantId(null);
        }

    }, [isAuthLoading, isUserLinkLoading, isProfileDocLoading, userLinkError, profileError, authUser, userProfileData, userLink]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncTenantOverride = () => {
            const overrideTenantId = getTenantOverride();

            if (authUser?.isAnonymous) {
                setTenantId(overrideTenantId || 'safeviate');
                return;
            }

            if (!canOverrideTenant(finalUserProfile, false)) return;
            if (!userLink?.profilePath) return;

            const pathParts = userLink.profilePath.split('/');
            const profileTenantId = pathParts[0] === 'tenants' && pathParts[1] ? pathParts[1] : 'safeviate';
            setTenantId(overrideTenantId || profileTenantId);
        };

        syncTenantOverride();
        window.addEventListener('storage', syncTenantOverride);
        window.addEventListener('safeviate-tenant-switch', syncTenantOverride);

        return () => {
            window.removeEventListener('storage', syncTenantOverride);
            window.removeEventListener('safeviate-tenant-switch', syncTenantOverride);
        };
    }, [authUser, finalUserProfile, userLink]);

    const value = useMemo(() => ({
        userProfile: finalUserProfile,
        tenantId,
        isLoading,
        error,
    }), [finalUserProfile, tenantId, isLoading, error]);

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};
