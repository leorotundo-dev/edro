import UxFrame from '@/components/UxFrame';

type ClientSocialListeningPageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientSocialListeningPageProps) {
  const encodedId = encodeURIComponent(params.id);
  return (
    <UxFrame
      title="Client Social Listening"
      src={`/ux/edro_social_listening/code.html?clientId=${encodedId}`}
    />
  );
}
