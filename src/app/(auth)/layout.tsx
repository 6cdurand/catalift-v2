import { Toaster } from "@/components/ui/sonner";

/**
 * Auth route-group layout. Mounts the sonner <Toaster/> so the ported v1
 * auth flows (login, signup wizard, forgot-password) can surface their
 * toast feedback — v1 rendered toasts globally; v2's are scoped per group.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
