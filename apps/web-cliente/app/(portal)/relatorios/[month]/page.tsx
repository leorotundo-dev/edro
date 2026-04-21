import ReportViewerClient from './ReportViewerClient';

export default function Page({ params }: { params: Promise<{ month: string }> }) {
  return <ReportViewerClient params={params} mode="portal" />;
}
