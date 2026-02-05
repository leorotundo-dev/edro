import ClientLibraryClient from './ClientLibraryClient';

type ClientLibraryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ClientLibraryPageProps) {
  const { id } = await params;
  return <ClientLibraryClient clientId={id} />;
}
