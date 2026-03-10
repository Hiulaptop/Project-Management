import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { ToastProvider } from "@/components/ui/toast";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-[260px]">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
