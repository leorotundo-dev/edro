import AprovacaoClient from './AprovacaoClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <AprovacaoClient briefingId={id} />;
}
