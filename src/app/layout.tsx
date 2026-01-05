import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { UserProfileProvider } from '@/hooks/use-user-profile';
import { PermissionsProvider } from '@/hooks/use-permissions';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Safeviate Manager',
  description: 'Aviation Academy Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <FirebaseClientProvider>
          <UserProfileProvider>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </UserProfileProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
