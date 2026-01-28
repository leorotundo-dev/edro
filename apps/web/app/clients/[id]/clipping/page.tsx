import UxFrame from '@/components/UxFrame';

type ClientRadarPageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientRadarPageProps) {
  const encodedId = encodeURIComponent(params.id);
  return (
    <UxFrame
      title="Client Radar"
      src={`/ux/edro_command_center_home_14/code.html?clientId=${encodedId}`}
    />
  );
}
