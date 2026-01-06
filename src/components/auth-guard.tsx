
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
    // If we are still loading authentication state or the user profile, don't do anything yet.
    if (isLoading) {
      return;
    }

    // After loading is complete, check the conditions.
    // If there is no authenticated user and we are not on the login page, redirect to login.
    if (!authUser && pathname !== '/login') {
      console.log("AuthGuard: No authenticated user. Redirecting to /login.");
      router.push('/login');
      return;
    }

    // If the user is authenticated but the profile is missing (and it's finished loading),
    // this indicates an error state (e.g., failed profile creation).
    // Redirect them to login to clear the session.
    if (authUser && !userProfile && pathname !== '/login') {
      console.warn("AuthGuard: Authenticated user has no profile. Redirecting to /login.");
      router.push('/login');
      return;
    }

    // If the user is fully authenticated and has a profile, and they are on the login page,
    // redirect them to the dashboard.
    if (authUser && userProfile && pathname === '/login') {
      console.log("AuthGuard: Authenticated user on login page. Redirecting to /dashboard.");
      router.push('/dashboard');
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

  // If on the login page, always render it while auth state resolves.
  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  // If we are done loading, and we have a user and profile, render the app's children.
  if (!isLoading && authUser && userProfile) {
    return <>{children}</>;
  }

  // Otherwise, render nothing, as a redirect is likely in progress.
  return null;
}
