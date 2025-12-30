
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
            if (!firestore || !authUser) {
                if (!isAuthLoading) {
                    setIsLoading(false);
                    setUserProfile(null);
                }
                return;
            }

            setIsLoading(true);
            const impersonatedEmail = localStorage.getItem('impersonatedUser');

            // This is the developer/admin profile if not impersonating.
            if (!impersonatedEmail) {
                const devProfile: Personnel = {
                    id: authUser.uid,
                    userType: 'Personnel',
                    firstName: 'Developer',
                    lastName: 'Mode',
                    email: authUser.email || 'dev@safeviate.com',
                    role: 'dev', // Special role
                    permissions: [], // Or all permissions
                };
                setUserProfile(devProfile);
                setIsLoading(false);
                return;
            }

            try {
                // 1. Find the user link document by email
                const usersCollectionRef = collection(firestore, 'users');
                const userQuery = query(usersCollectionRef, where('email', '==', impersonatedEmail));
                const userQuerySnapshot = await getDocs(userQuery);

                if (userQuerySnapshot.empty) {
                    throw new Error(`No user profile found for email: ${impersonatedEmail}`);
                }

                // 2. Get the profile path from the user link document
                const userLinkDoc = userQuerySnapshot.docs[0];
                const { profilePath } = userLinkDoc.data() as { profilePath: string };

                if (!profilePath) {
                    throw new Error("User document is missing the profile path.");
                }

                // 3. Fetch the actual profile document from the path
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
