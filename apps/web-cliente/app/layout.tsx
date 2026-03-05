import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Edro — Portal do Cliente',
  description: 'Acompanhe seus projetos e aprovações',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
