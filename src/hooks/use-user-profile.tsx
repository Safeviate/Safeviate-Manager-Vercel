'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, limit, setDoc } from 'firebase/firestore';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';

type UserProfile = PilotProfile | Personnel;
type UserLink = { email?: string; profilePath: string };
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
    if (isAnonymous) return false;

    const role = (profile as Personnel | null)?.role?.toLowerCase();
    return role === 'dev' || role === 'developer';
};

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user: authUser, isUserLoading: isAuthLoading } = useUser();
    const [profileRefreshToken, setProfileRefreshToken] = useState(0);
    const [tenantOverride, setTenantOverride] = useState<string | null>(() => getTenantOverride());

    const userLinkRef = useMemoFirebase(
        () => (firestore && authUser && !authUser.isAnonymous ? doc(firestore, 'users', authUser.uid) : null),
        [firestore, authUser]
    );

    const { data: userLink, isLoading: isUserLinkLoading, error: userLinkError } = useDoc<UserLink>(userLinkRef);

    const fallbackUserLinkQuery = useMemoFirebase(
        () => (
            firestore && authUser?.email && !authUser.isAnonymous
                ? query(collection(firestore, 'users'), where('email', '==', authUser.email), limit(1))
                : null
        ),
        [firestore, authUser]
    );

    const { data: fallbackUserLinks, isLoading: isFallbackUserLinkLoading, error: fallbackUserLinkError } = useCollection<UserLink>(fallbackUserLinkQuery);
    const resolvedUserLink = userLink ?? fallbackUserLinks?.[0] ?? null;

    const userProfileRef = useMemoFirebase(
        () => (firestore && resolvedUserLink?.profilePath ? doc(firestore, resolvedUserLink.profilePath) : null),
        [firestore, resolvedUserLink, profileRefreshToken]
    );

    const { data: userProfileData, isLoading: isProfileDocLoading, error: profileError } = useDoc<UserProfile>(userProfileRef);

    const isLoading = isAuthLoading || isUserLinkLoading || isFallbackUserLinkLoading || isProfileDocLoading;
    const error = (userLinkError || fallbackUserLinkError || profileError) ?? null;

    const finalUserProfile = useMemo(() => {
        if (isLoading || !authUser || authUser.isAnonymous) return null;
        if (!resolvedUserLink?.profilePath || !userProfileData) return null;
        return userProfileData;
    }, [isLoading, authUser, resolvedUserLink, userProfileData]);

    const tenantId = useMemo(() => {
        if (!finalUserProfile || !resolvedUserLink?.profilePath) return null;

        const pathParts = resolvedUserLink.profilePath.split('/');
        const profileTenantId = pathParts[0] === 'tenants' && pathParts[1] ? pathParts[1] : 'safeviate';
        const overrideTenantId = canOverrideTenant(finalUserProfile, false) ? tenantOverride : null;
        return overrideTenantId || profileTenantId;
    }, [finalUserProfile, resolvedUserLink, tenantOverride]);

    useEffect(() => {
        if (!firestore || !authUser || authUser.isAnonymous || userLink || !resolvedUserLink?.profilePath) {
            return;
        }

        void setDoc(
            doc(firestore, 'users', authUser.uid),
            {
                email: authUser.email || resolvedUserLink.email,
                profilePath: resolvedUserLink.profilePath,
            },
            { merge: true }
        );
    }, [firestore, authUser, userLink, resolvedUserLink]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleProfileUpdate = () => {
            setProfileRefreshToken((current) => current + 1);
        };

        const syncTenantOverride = () => {
            setTenantOverride(getTenantOverride());
        };

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
