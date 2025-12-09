import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider, THEME_KEY, CARD_THEME_KEY, SIDEBAR_THEME_KEY, HEADER_THEME_KEY } from '@/components/theme-provider';
import { hexToHsl } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Safeviate Manager',
  description: 'Aviation Academy Management',
};

const themeLoaderScript = `
  (function() {
    try {
      const hexToHsl = ${hexToHsl.toString()};
      
      const themeKeys = ['${THEME_KEY}', '${CARD_THEME_KEY}', '${SIDEBAR_THEME_KEY}', '${HEADER_THEME_KEY}'];
      
      themeKeys.forEach(key => {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.keys(parsed).forEach(k => {
            document.documentElement.style.setProperty('--' + k, hexToHsl(parsed[k]));
          });
        }
      });
    } catch (e) {
      console.error('Failed to apply theme from localStorage', e);
    }
  })();
`;


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeLoaderScript }} />
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <FirebaseClientProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
