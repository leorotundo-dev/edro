import PortalLinksClient from './PortalLinksClient';

export default async function PortalLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortalLinksClient clientId={id} />;
}
