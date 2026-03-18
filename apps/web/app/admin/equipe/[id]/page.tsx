import FreelancerProfileClient from './FreelancerProfileClient';

export const dynamic = 'force-dynamic';

export default function FreelancerProfilePage({ params }: { params: { id: string } }) {
  return <FreelancerProfileClient id={params.id} />;
}
