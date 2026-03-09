import './globals.css';
import { Space_Grotesk } from 'next/font/google';
import AuthGate from '@/components/AuthGate';
import ThemeProvider from '@/utils/theme/ThemeProvider';
import { JarvisProvider } from '@/contexts/JarvisContext';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata = {
  title: 'Edro Studio',
  description: 'Gestão editorial e operacional de agência',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent' as const,
    title: 'Edro Studio',
  },
};

export const viewport = {
  themeColor: '#E85219',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={spaceGrotesk.variable}>
      <body className={spaceGrotesk.className}>
        <ThemeProvider>
          <JarvisProvider>
            <AuthGate>{children}</AuthGate>
          </JarvisProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
