import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './styles.css';
import './accessibility.css';
import './cognitive.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Edro - Sua Trilha Personalizada de Estudos',
  description: 'Plataforma inteligente de estudos para concursos públicos com IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
