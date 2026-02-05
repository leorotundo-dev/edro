import ClientLayoutClient from './ClientLayoutClient';

type ClientLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ClientLayout({ children, params }: ClientLayoutProps) {
  const { id } = await params;
  return <ClientLayoutClient clientId={id}>{children}</ClientLayoutClient>;
}
