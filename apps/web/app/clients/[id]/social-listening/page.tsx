import SocialListeningClient from '@/app/social-listening/SocialListeningClient';

type ClientSocialListeningPageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientSocialListeningPageProps) {
  return <SocialListeningClient clientId={params.id} noShell embedded />;
}
