import type { Metadata } from 'next';
import PortalThemeProvider from '@/utils/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'Edro — Portal do Cliente',
  description: 'Acompanhe seus projetos e aprovações',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PortalThemeProvider>{children}</PortalThemeProvider>
      </body>
    </html>
  );
}
