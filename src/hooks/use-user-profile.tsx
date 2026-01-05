
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
                        id: 'DEVELOPER_MODE',
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
                
                const impersonatedEmail = localStorage.getItem('impersonatedUser');
                if (impersonatedEmail && impersonatedEmail !== authUser.email) {
                    console.warn("Mismatched impersonation. Clearing profile.");
                    setUserProfile(null);
                    setIsLoading(false);
                    return;
                }

                // Standard user lookup via the linking document
                const userLinkRef = doc(firestore, 'users', authUser.uid);
                const userLinkSnap = await getDoc(userLinkRef);

                if (!userLinkSnap.exists()) {
                     console.warn(`No user link document found for UID: ${authUser.uid}. User profile cannot be loaded.`);
                     setUserProfile(null);
                     setIsLoading(false);
                     return; // This is a key change: Stop execution if the link is missing.
                }

                const { profilePath } = userLinkSnap.data() as { profilePath: string };
                if (!profilePath) {
                    console.error(`User link document for ${authUser.uid} is missing the 'profilePath' field.`);
                    setUserProfile(null);
                    setIsLoading(false);
                    return;
                }

                const profileRef = doc(firestore, profilePath);
                const profileSnapshot = await getDoc(profileRef);

                if (!profileSnapshot.exists()) {
                     console.error(`Profile document not found at path: ${profilePath}`);
                     setUserProfile(null);
                     setIsLoading(false);
                     return;
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
