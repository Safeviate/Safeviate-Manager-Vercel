import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/providers';
import { assertRequiredEnv } from '@/lib/server/env';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

assertRequiredEnv(
  [['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'NEON2_DATABASE_URL', 'NEON2_DATABASE_URL_UNPOOLED'], 'NEXTAUTH_SECRET', 'OPENAI_API_KEY'],
  'application bootstrap'
);

export const metadata: Metadata = {
  title: 'Safeviate Manager',
  description: 'Aviation Academy Management',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/safeviate-icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/safeviate-icon.svg'],
    apple: ['/safeviate-icon.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
