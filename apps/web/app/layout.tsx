import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Edro Admin",
  description: "Painel de gestão do Edro"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-gray-900">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
