import './globals.css';
import AuthGate from '@/components/AuthGate';

export const metadata = {
  title: 'Edro Editorial Board',
  description: 'Edro Editorial Board',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
