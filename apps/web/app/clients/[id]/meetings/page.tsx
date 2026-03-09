import MeetingsClient from './MeetingsClient';

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <MeetingsClient clientId={id} />;
}
