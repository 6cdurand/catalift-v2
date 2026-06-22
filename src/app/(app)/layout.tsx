import { MainLayout } from "@/components/layouts/MainLayout";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      {children}
      <Toaster />
    </MainLayout>
  );
}
