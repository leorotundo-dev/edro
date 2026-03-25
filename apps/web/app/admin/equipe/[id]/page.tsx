import FreelancerProfileClient from './FreelancerProfileClient';

export const dynamic = 'force-dynamic';

export default async function FreelancerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FreelancerProfileClient id={id} />;
}
