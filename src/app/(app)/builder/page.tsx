"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession, useUserRole } from "@/features/auth";
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { ProgramBuilder } from "@/features/programs/builder/ProgramBuilder";

function BuilderLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-500">
      Loading program builder…
    </div>
  );
}

function BuilderContent() {
  const { user, loading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  if (loading || roleLoading) return <BuilderLoading />;
  if (!user) return null;

  // G-20: trainer mode is gated on the server-governed `public.users.role`,
  // NOT `user_metadata.mode` (the v1 self-promotion hole).
  const isTrainerMode = role === "trainer";

  if (!isTrainerMode) {
    return (
      <div className="px-5 py-16 text-center text-gray-500">
        <p className="text-body">Builder is for trainers.</p>
      </div>
    );
  }

  return <ProgramBuilder isTrainerMode={isTrainerMode} />;
}

export default function BuilderPage() {
  return (
    <div>
      <PageHeader title="Builder" subtitle="Create and edit workouts" />
      <Suspense fallback={<BuilderLoading />}>
        <BuilderContent />
      </Suspense>
    </div>
  );
}
