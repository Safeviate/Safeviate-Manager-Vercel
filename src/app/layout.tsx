import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider, THEME_KEY, CARD_THEME_KEY, SIDEBAR_THEME_KEY, HEADER_THEME_KEY } from '@/components/theme-provider';
import { hexToHsl } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Safeviate Manager',
  description: 'Aviation Academy Management',
};

const themeLoaderScript = `
  (function() {
    function applyTheme(key) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          const hexToHsl = ${hexToHsl.toString()};
          Object.keys(parsed).forEach(k => {
            document.documentElement.style.setProperty('--' + k, hexToHsl(parsed[k]));
          });
        }
      } catch (e) {
        console.error('Failed to apply theme from localStorage', e);
      }
    }
    applyTheme('${THEME_KEY}');
    applyTheme('${CARD_THEME_KEY}');
    applyTheme('${SIDEBAR_THEME_KEY}');
    applyTheme('${HEADER_THEME_KEY}');
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
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
