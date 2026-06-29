'use client';

// /program/builder route — Program builder wizard (w2a)

import { Suspense } from 'react';
import { useSession, useUserRole } from '@/features/auth';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { ProgramBuilder } from '@/features/programs/builder/ProgramBuilder';

function BuilderLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading program builder...</div>
    </div>
  );
}

function ProgramBuilderContent() {
  const { user, loading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  if (loading || roleLoading) return <BuilderLoading />;
  if (!user) {
    // Redirect to login handled by useSession/redirect-guard
    return null;
  }

  // G-20: trainer mode is gated on the server-governed `public.users.role`,
  // NOT `user_metadata.mode` (the v1 self-promotion hole).
  const isTrainerMode = role === 'trainer';

  return <ProgramBuilder isTrainerMode={isTrainerMode} />;
}

export default function ProgramBuilderPage() {
  return (
    <Suspense fallback={<BuilderLoading />}>
      <ProgramBuilderContent />
    </Suspense>
  );
}
