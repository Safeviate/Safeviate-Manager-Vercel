'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';
import { useSession } from 'next-auth/react';
import { useUserProfile } from '@/hooks/use-user-profile';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const { isLoading: isProfileLoading } = useUserProfile();
  const { userProfile } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = status === 'loading' || isProfileLoading;
  const authUser = session?.user ?? null;
  const bootstrapActive = !authUser && !!userProfile && userProfile.role?.toLowerCase() === 'developer';

  useEffect(() => {
    if (!isLoading && !authUser && !bootstrapActive && pathname !== '/login') {
      router.push('/login');
    }

    if (!isLoading && (authUser || bootstrapActive) && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [authUser, bootstrapActive, isLoading, router, pathname]);

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
    );
  }

  return <>{children}</>;
}
