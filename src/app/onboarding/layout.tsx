import { Toaster } from "@/components/ui/sonner";

/**
 * Onboarding route-group layout — mounts the sonner <Toaster/> so the ported
 * v1 onboarding flow can surface its toast feedback.
 */
export default function OnboardingLayout({
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
