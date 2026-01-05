
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
    // If not loading and there's no authenticated user, redirect to login.
    if (!isLoading && !authUser && pathname !== '/login') {
      router.push('/login');
      return;
    }

    // If not loading, there IS an authUser, but NO profile document was found,
    // it's a broken state. Redirect to login to allow re-authentication.
    if (!isLoading && authUser && !userProfile && pathname !== '/login') {
      console.warn("AuthGuard: User is authenticated but profile is missing. Redirecting to login.");
      router.push('/login');
      return;
    }

  }, [authUser, userProfile, isLoading, router, pathname]);

  // Show a loading skeleton if either auth state or profile state is loading.
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

  // If on the login page, or if user is fully authenticated and has a profile, show children.
  if (pathname === '/login' || (authUser && userProfile)) {
    return <>{children}</>;
  }

  // Default to a loading state or null while redirects are processing.
  return null;
}
