'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { UserProfileProvider } from '@/hooks/use-user-profile';
import { ThemeProvider } from '@/components/theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UserProfileProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </UserProfileProvider>
    </SessionProvider>
  );
}
