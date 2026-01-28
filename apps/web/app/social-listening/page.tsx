import AppShell from '@/components/AppShell';
import UxFrame from '@/components/UxFrame';

export default function Page() {
  return (
    <AppShell title="Social Listening">
      <div className="flex-1 min-h-0">
        <UxFrame
          title="Social Listening"
          src="/ux/edro_social_listening/code.html"
          className="h-full w-full border-0"
        />
      </div>
    </AppShell>
  );
}
