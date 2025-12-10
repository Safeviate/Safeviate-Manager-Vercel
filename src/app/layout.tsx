import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider, THEME_KEY, CARD_THEME_KEY, SIDEBAR_THEME_KEY, HEADER_THEME_KEY, POPOVER_THEME_KEY } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Safeviate Manager',
  description: 'Aviation Academy Management',
};

const themeLoaderScript = `
  (function() {
    try {
      const hexToHsl = (hex) => {
        if (!hex || hex.length < 4) return "0 0% 0%";
        let localHex = hex.replace(/^#?([a-f\\d])([a-f\\d])([a-f\\d])$/i, (m, r, g, b) => r + r + g + g + b + b);
        const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(localHex);
        if (!result) return "0 0% 0%";

        let r = parseInt(result[1], 16), g = parseInt(result[2], 16), b = parseInt(result[3], 16);
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);

        return h + " " + s + "% " + l + "%";
      };
      
      const themeKeys = ['${THEME_KEY}', '${CARD_THEME_KEY}', '${POPOVER_THEME_KEY}', '${SIDEBAR_THEME_KEY}', '${HEADER_THEME_KEY}'];
      
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
