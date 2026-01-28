import UxFrame from "@/components/UxFrame";

type ClippingDetailPageProps = {
  params: { id: string };
};

export default function ClippingDetailPage({ params }: ClippingDetailPageProps) {
  const encodedId = encodeURIComponent(params.id);
  return (
    <UxFrame
      title="Radar Detail"
      src={`/ux/edro_command_center_home_11_detail/code.html?itemId=${encodedId}`}
    />
  );
}
