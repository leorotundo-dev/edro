import ClientCalendarClient from './ClientCalendarClient';

type ClientCalendarPageProps = {
  params: { id: string };
};

export default function Page({ params }: ClientCalendarPageProps) {
  return <ClientCalendarClient clientId={params.id} />;
}
