import BoardPresentationDetailClient from '../BoardPresentationDetailClient';

export default async function ClientBoardPresentationDetailPage({
  params,
}: {
  params: Promise<{ id: string; presentationId: string }>;
}) {
  const { id, presentationId } = await params;
  return <BoardPresentationDetailClient clientId={id} presentationId={presentationId} />;
}
