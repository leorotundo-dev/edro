// Minimal layout wrapper — enables loading.tsx for all /admin routes.
// AppShell is rendered inside each page's client component (not here).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
