
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';

type UserProfile = PilotProfile | Personnel;
type UserLink = { profilePath: string };

interface UserProfileContextType {
    userProfile: UserProfile | null;
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
            return;
        };

        if (!authUser) {
            setFinalUserProfile(null);
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
            return;
        }

        if (userProfileData) {
            setFinalUserProfile(userProfileData);
        } else {
            // This handles cases where the user is authenticated but the profile docs don't exist (yet or at all)
            setFinalUserProfile(null);
        }

    }, [isAuthLoading, isUserLinkLoading, isProfileDocLoading, userLinkError, profileError, authUser, userProfileData]);

    const value = useMemo(() => ({
        userProfile: finalUserProfile,
        isLoading,
        error,
    }), [finalUserProfile, isLoading, error]);

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};
