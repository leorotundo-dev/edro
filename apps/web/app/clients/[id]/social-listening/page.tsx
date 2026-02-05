import SocialListeningClient from '@/app/social-listening/SocialListeningClient';

type ClientSocialListeningPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ClientSocialListeningPageProps) {
  const { id } = await params;
  return <SocialListeningClient clientId={id} noShell embedded />;
}
