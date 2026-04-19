'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { UserProfileProvider } from '@/hooks/use-user-profile';
import { ThemeProvider } from '@/components/theme-provider';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false} refetchInterval={0}>
      <UserProfileProvider>
        <ThemeProvider>
          <ServiceWorkerRegistration />
          {children}
        </ThemeProvider>
      </UserProfileProvider>
    </SessionProvider>
  );
}
