import UxFrame from '@/components/UxFrame';

export default function Page({ params }: { params: { id: string } }) {
  const query = params?.id ? `clientId=${params.id}` : '';
  const src = query
    ? `/ux/edro_creative_studio_step0/code.html?${query}`
    : '/ux/edro_creative_studio_step0/code.html';

  return (
    <UxFrame
      title="Client Creative Studio"
      src={src}
    />
  );
}
