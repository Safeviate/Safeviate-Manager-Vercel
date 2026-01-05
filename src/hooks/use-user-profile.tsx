
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';

type UserProfile = PilotProfile | Personnel;

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
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (isAuthLoading) {
                setIsLoading(true);
                return;
            }
            if (!firestore || !authUser) {
                setUserProfile(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            try {
                // Developer mode (anonymous user)
                if (authUser.isAnonymous) {
                    const devProfile: Personnel = {
                        id: authUser.uid,
                        userType: 'Personnel',
                        firstName: 'Developer',
                        lastName: 'Mode',
                        email: authUser.email || 'dev@safeviate.com',
                        role: 'dev',
                        permissions: [],
                    };
                    setUserProfile(devProfile);
                    setIsLoading(false);
                    return;
                }

                // Standard user lookup
                const userLinkRef = doc(firestore, 'users', authUser.uid);
                const userLinkSnap = await getDoc(userLinkRef);

                if (!userLinkSnap.exists()) {
                    console.warn(`No user link document found for UID: ${authUser.uid}. This user may need to be re-created.`);
                    setUserProfile(null); // Set to null instead of throwing an error
                    setIsLoading(false);
                    return; // Stop execution
                }

                const { profilePath } = userLinkSnap.data() as { profilePath: string };
                if (!profilePath) {
                    throw new Error("User document is missing the profile path.");
                }

                const profileRef = doc(firestore, profilePath);
                const profileSnapshot = await getDoc(profileRef);

                if (!profileSnapshot.exists()) {
                     throw new Error(`Profile document not found at path: ${profilePath}`);
                }

                const profile = { id: profileSnapshot.id, ...profileSnapshot.data() } as UserProfile;
                setUserProfile(profile);

            } catch (e: any) {
                setError(e);
                console.error("Failed to fetch user profile:", e);
                setUserProfile(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, [firestore, authUser, isAuthLoading]);

    const value = useMemo(() => ({
        userProfile,
        isLoading,
        error,
    }), [userProfile, isLoading, error]);

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};
