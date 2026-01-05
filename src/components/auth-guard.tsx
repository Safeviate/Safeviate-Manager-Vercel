
'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = isAuthLoading || isProfileLoading;

  useEffect(() => {
    // While loading, do nothing.
    if (isLoading) {
      return;
    }

    // After loading, if there's no authenticated user, always redirect to login.
    if (!authUser && pathname !== '/login') {
      console.log("AuthGuard: No auth user, redirecting to login.");
      router.push('/login');
      return;
    }

    // After loading, if there IS an authUser, but NO profile document was found
    // (could be a new user, or a data issue), redirect to login.
    // This is the key check to prevent access to a broken state.
    if (authUser && !userProfile && pathname !== '/login') {
      console.warn("AuthGuard: User is authenticated but profile is missing. Redirecting to login to clear state.");
      router.push('/login');
      return;
    }

  }, [authUser, userProfile, isLoading, router, pathname]);

  // Show a loading skeleton for any protected route while we check auth/profile.
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

  // If on the login page, always render it.
  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  // If we are done loading, and we have both an authUser and userProfile, render the app.
  if (!isLoading && authUser && userProfile) {
    return <>{children}</>;
  }

  // Otherwise, render nothing while the redirect is in progress.
  return null;
}
