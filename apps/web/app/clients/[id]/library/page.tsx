import ClientLibraryClient from './ClientLibraryClient';

type ClientLibraryPageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientLibraryPageProps) {
  return <ClientLibraryClient clientId={params.id} />;
}
