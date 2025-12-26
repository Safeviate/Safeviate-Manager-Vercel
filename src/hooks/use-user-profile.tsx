
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

            if (!impersonatedEmail) {
                setIsLoading(false);
                setUserProfile(null);
                return;
            }

            try {
                // Query both collections
                const personnelQuery = query(collection(firestore, 'tenants/safeviate/personnel'), where('email', '==', impersonatedEmail));
                const pilotsQuery = query(collection(firestore, 'tenants/safeviate/pilots'), where('email', '==', impersonatedEmail));

                const [personnelSnapshot, pilotsSnapshot] = await Promise.all([
                    getDocs(personnelQuery),
                    getDocs(pilotsQuery)
                ]);

                let profile: UserProfile | null = null;
                if (!personnelSnapshot.empty) {
                    profile = { id: personnelSnapshot.docs[0].id, ...personnelSnapshot.docs[0].data() } as Personnel;
                } else if (!pilotsSnapshot.empty) {
                    profile = { id: pilotsSnapshot.docs[0].id, ...pilotsSnapshot.docs[0].data() } as PilotProfile;
                }

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
