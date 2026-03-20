import TrelloMemberProfileClient from './TrelloMemberProfileClient';

export const dynamic = 'force-dynamic';

export default function TrelloMemberProfilePage({ params }: { params: { trelloId: string } }) {
  return <TrelloMemberProfileClient trelloId={params.trelloId} />;
}
