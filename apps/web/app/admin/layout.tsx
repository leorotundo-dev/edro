import { AdminShell } from "../../components/AdminShell";
import { ToastContainer } from "../../components/ui/Toast";

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminShell>{children}</AdminShell>
      <ToastContainer />
    </>
  );
}
