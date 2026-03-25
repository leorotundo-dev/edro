import TrelloMemberProfileClient from './TrelloMemberProfileClient';

export const dynamic = 'force-dynamic';

export default async function TrelloMemberProfilePage({ params }: { params: Promise<{ trelloId: string }> }) {
  const { trelloId } = await params;
  return <TrelloMemberProfileClient trelloId={trelloId} />;
}
