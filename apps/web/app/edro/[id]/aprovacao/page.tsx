import AprovacaoClient from './AprovacaoClient';

type Props = {
  params: { id: string };
};

export default function Page({ params }: Props) {
  return <AprovacaoClient briefingId={params.id} />;
}
