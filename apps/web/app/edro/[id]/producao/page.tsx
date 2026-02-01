import ProducaoClient from './ProducaoClient';

type Props = {
  params: { id: string };
};

export default function Page({ params }: Props) {
  return <ProducaoClient briefingId={params.id} />;
}
