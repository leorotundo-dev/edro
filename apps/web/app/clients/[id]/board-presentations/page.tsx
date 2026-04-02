import BoardPresentationIndexClient from './BoardPresentationIndexClient';

export default async function ClientBoardPresentationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardPresentationIndexClient clientId={id} />;
}
