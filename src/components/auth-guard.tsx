
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { MandatoryAlerts } from './mandatory-alerts';
import { query, collection, where } from 'firebase/firestore';
import type { Alert } from '@/types/alert';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const { userProfile, tenantId, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();

  const [unreadAlerts, setUnreadAlerts] = useState<Alert[] | null>(null);

  const mandatoryAlertsQuery = useMemoFirebase(
    () => (firestore && tenantId && userProfile && userProfile.id !== 'DEVELOPER_MODE'
        ? query(
            collection(firestore, `tenants/${tenantId}/alerts`),
            where('status', '==', 'Active'),
            where('mustRead', '==', true)
          )
        : null),
    [firestore, tenantId, userProfile]
  );

  const { data: mandatoryAlerts, isLoading: isLoadingAlerts } = useCollection<Alert>(mandatoryAlertsQuery);

  useEffect(() => {
    if (mandatoryAlerts && userProfile) {
        const unread = mandatoryAlerts.filter(alert => 
            !alert.readBy?.some(receipt => receipt.userId === userProfile.id)
        );
        setUnreadAlerts(unread);
    }
  }, [mandatoryAlerts, userProfile]);

  const isLoading = isAuthLoading || isProfileLoading || isLoadingAlerts;

  useEffect(() => {
    // If loading is finished and there's no authenticated user, redirect to login.
    if (!isLoading && !authUser && pathname !== '/login') {
      router.push('/login');
    }

    // If loading is finished, the user is authenticated, and they are on the login page, redirect to dashboard.
    if (!isLoading && authUser && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [authUser, isLoading, router, pathname]);

  // While loading, show a skeleton UI for any page other than login.
  if (isLoading && pathname !== '/login') {
    return (
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-header px-4 text-header-foreground sm:px-6">
                <Skeleton className="h-7 w-7 md:hidden" />
                <Skeleton className="h-6 w-32" />
            </header>
            <div className="p-4 lg:p-6 flex-1 overflow-y-auto space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                 <Skeleton className="h-64 w-full" />
                 <Skeleton className="h-32 w-full" />
            </div>
        </div>
    )
  }

  // On the login page, render children immediately. The useEffect handles redirection if already logged in.
  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  if (!isLoading && authUser && unreadAlerts && unreadAlerts.length > 0) {
    return (
        <MandatoryAlerts 
            alerts={unreadAlerts} 
            onAcknowledged={() => setUnreadAlerts(null)} // On acknowledge, clear the state to render children
        />
    );
  }

  // If we are done loading, and we have a user, render the app's children.
  if (!isLoading && authUser) {
    return <>{children}</>;
  }

  // If none of the above conditions are met, we're likely in a state that will be handled by the useEffect redirect.
  // Returning null here prevents rendering children in an invalid state.
  return null;
}
