import { Header } from "@/components/shell/header";
import { TabBar } from "@/components/shell/tab-bar";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-screen-sm flex-1 px-4 py-6">
        {children}
      </main>
      <TabBar />
      <Toaster />
    </div>
  );
}
